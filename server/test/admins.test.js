import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Admin, AuditLog, Session } from '../src/models/index.js';
import { adminRouteTable } from '../src/routes/admin/index.js';
import {
  HEADERS,
  RELAXED_LIMITS,
  buildTestApp,
  createAdmin,
  freshCode,
  sessionCookie,
  signIn,
  stepUp,
} from './support/auth.js';
import { buildApp } from './helpers.js';
import { useTestDatabase } from './support/db.js';

useTestDatabase();

const PLACEHOLDER_ID = '64b7f0c2a1b2c3d4e5f60718';
const ROUTES = adminRouteTable({
  administrators: new Proxy({}, { get: () => () => {} }),
  auditLogs: new Proxy({}, { get: () => () => {} }),
});
const routeUrl = (path) => `/api/v1/admin${path.replace(':id', PLACEHOLDER_ID)}`;

let app;
let owner;
let colleague;
beforeEach(async () => {
  app = buildTestApp();
  owner = await createAdmin({ email: 'owner@example.com', name: 'Owner' });
  colleague = await createAdmin({ email: 'colleague@example.com', name: 'Colleague' });
});

describe('every admin route requires a full super-admin session', () => {
  it.each(ROUTES.map((r) => [r.method.toUpperCase(), r.path]))(
    '%s %s rejects anonymous requests',
    async (method, path) => {
      const res = await request(app)[method.toLowerCase()](routeUrl(path)).set(HEADERS).send({});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    },
  );

  it('rejects password-only (mfa_pending) and enrolment-only sessions on every route', async () => {
    const pending = request.agent(app);
    await pending
      .post('/api/v1/auth/login')
      .set(HEADERS)
      .send({ email: owner.email, password: owner.password });
    const newcomer = await createAdmin({ email: 'newcomer@example.com', enrolled: false });
    const enrolling = request.agent(app);
    await enrolling
      .post('/api/v1/auth/login')
      .set(HEADERS)
      .send({ email: newcomer.email, password: newcomer.password });

    for (const route of ROUTES) {
      const a = await pending[route.method](routeUrl(route.path)).set(HEADERS).send({});
      const b = await enrolling[route.method](routeUrl(route.path)).set(HEADERS).send({});
      expect([a.status, b.status], `${route.method} ${route.path}`).toEqual([401, 403]);
      expect(b.body.error.code).toBe('MFA_ENROLLMENT_REQUIRED');
    }
  });

  it('marks the sensitive routes as step-up', () => {
    const stepUpRoutes = ROUTES.filter((r) => r.stepUp).map((r) => `${r.method} ${r.path}`);
    expect(stepUpRoutes).toEqual([
      'post /administrators',
      'patch /administrators/:id',
      'delete /administrators/:id',
      'post /administrators/:id/reset-password',
      'post /administrators/:id/reset-2fa',
    ]);
  });
});

describe('validation of administrative writes', () => {
  it('rejects role injection, malformed input and weak passwords', async () => {
    const agent = await signIn(app, owner);
    await stepUp(agent, owner);
    const cases = [
      { name: 'X', email: 'x@example.com', role: 'editor' },
      { name: 'X', email: 'not-an-email' },
      { name: '', email: 'x@example.com' },
      { name: 'X', email: 'x@example.com', temporaryPassword: 'short' },
      { name: 'X', email: 'x@example.com', temporaryPassword: 'password1234' },
    ];
    for (const body of cases) {
      const res = await agent.post('/api/v1/admin/administrators').set(HEADERS).send(body);
      expect(res.status, JSON.stringify(body)).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const patch = await agent
      .patch(`/api/v1/admin/administrators/${colleague.admin._id}`)
      .set(HEADERS)
      .send({ role: 'owner' });
    expect(patch.status).toBe(422);
    const badId = await agent.post('/api/v1/admin/administrators/not-an-id/reset-2fa').set(HEADERS);
    expect(badId.status).toBe(422);
    expect(await Admin.countDocuments()).toBe(2);
  });

  it('refuses duplicate e-mails', async () => {
    const agent = await signIn(app, owner);
    await stepUp(agent, owner);
    const res = await agent
      .post('/api/v1/admin/administrators')
      .set(HEADERS)
      .send({ name: 'Dup', email: 'COLLEAGUE@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('credential resets (D-039)', () => {
  it('password reset ends the target’s sessions, keeps 2FA and notifies every admin', async () => {
    const target = await signIn(app, colleague);
    const agent = await signIn(app, owner);
    await stepUp(agent, owner);

    const res = await agent
      .post(`/api/v1/admin/administrators/${colleague.admin._id}/reset-password`)
      .set(HEADERS)
      .send({});
    expect(res.status).toBe(200);
    const temporaryPassword = res.body.data.temporaryPassword;
    expect(temporaryPassword).toBeTruthy();

    expect((await target.get('/api/v1/auth/session')).status).toBe(401);
    const stored = await Admin.findById(colleague.admin._id).select('+twoFactor');
    expect(stored.mustChangePassword).toBe(true);
    expect(stored.twoFactor.enabled).toBe(true);

    // The new password alone still only reaches the second-factor step.
    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .set(HEADERS)
      .send({ email: colleague.email, password: temporaryPassword });
    expect(relogin.body.data.stage).toBe('mfa_pending');

    const mail = app.locals.services.mailer.outbox.find((m) =>
      /password was reset/.test(m.subject),
    );
    expect(mail.to.sort()).toEqual(['colleague@example.com', 'owner@example.com']);
    expect(await AuditLog.findOne({ action: 'admin.password_reset' })).toMatchObject({
      outcome: 'succeeded',
      actorEmail: 'owner@example.com',
    });
  });

  it('2FA reset ends the target’s sessions, keeps the password and forces re-enrolment', async () => {
    const target = await signIn(app, colleague);
    const agent = await signIn(app, owner);
    await stepUp(agent, owner);

    const res = await agent
      .post(`/api/v1/admin/administrators/${colleague.admin._id}/reset-2fa`)
      .set(HEADERS);
    expect(res.status).toBe(200);
    expect((await target.get('/api/v1/auth/session')).status).toBe(401);

    const stored = await Admin.findById(colleague.admin._id).select('+twoFactor');
    expect(stored.twoFactor).toMatchObject({
      enabled: false,
      secretEncrypted: null,
      recoveryCodeHashes: [],
    });
    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .set(HEADERS)
      .send({ email: colleague.email, password: colleague.password });
    expect(relogin.body.data.stage).toBe('enrollment');
    // Old recovery codes are gone with the old enrolment.
    expect(await Session.countDocuments({ admin: colleague.admin._id, stage: 'active' })).toBe(0);
  });

  it('cannot reset, disable or delete your own account here, nor remove the last active admin', async () => {
    const agent = await signIn(app, owner);
    await stepUp(agent, owner);
    const self = `/api/v1/admin/administrators/${owner.admin._id}`;
    for (const res of [
      await agent.post(`${self}/reset-password`).set(HEADERS).send({}),
      await agent.post(`${self}/reset-2fa`).set(HEADERS),
      await agent.patch(self).set(HEADERS).send({ status: 'disabled' }),
      await agent.delete(self).set(HEADERS),
    ]) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    }
    const disable = await agent
      .patch(`/api/v1/admin/administrators/${colleague.admin._id}`)
      .set(HEADERS)
      .send({ status: 'disabled' });
    expect(disable.status).toBe(200);
    expect(disable.body.data.status).toBe('disabled');
  });

  it('disabling an admin revokes their sessions immediately', async () => {
    const target = await signIn(app, colleague);
    const agent = await signIn(app, owner);
    await stepUp(agent, owner);
    await agent
      .patch(`/api/v1/admin/administrators/${colleague.admin._id}`)
      .set(HEADERS)
      .send({ status: 'disabled' });
    expect((await target.get('/api/v1/auth/session')).status).toBe(401);
  });
});

describe('audit log', () => {
  it('records security events without credentials, codes, secrets or tokens', async () => {
    const agent = await signIn(app, owner);
    await request(app)
      .post('/api/v1/auth/login')
      .set(HEADERS)
      .send({ email: owner.email, password: 'bad password guess' });
    await stepUp(agent, owner);
    const created = await agent
      .post('/api/v1/admin/administrators')
      .set(HEADERS)
      .send({ name: 'Third', email: 'third@example.com' });
    const reset = await agent
      .post(`/api/v1/admin/administrators/${colleague.admin._id}/reset-password`)
      .set(HEADERS)
      .send({});
    const codes = await agent.post('/api/v1/auth/2fa/recovery-codes').set(HEADERS);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .set(HEADERS)
      .send({ email: owner.email, password: owner.password });

    const logs = await AuditLog.find().lean();
    const actions = logs.map((l) => l.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'auth.login',
        'auth.login_failed',
        'auth.step_up',
        'admin.create',
        'admin.password_reset',
        'auth.recovery_codes_regenerated',
        'auth.password_verified',
      ]),
    );
    expect(logs.every((l) => l.requestId && l.at)).toBe(true);

    const dump = JSON.stringify(logs);
    const secrets = [
      owner.password,
      'bad password guess',
      owner.secret,
      ...owner.recoveryCodes,
      created.body.data.temporaryPassword,
      reset.body.data.temporaryPassword,
      ...codes.body.data.recoveryCodes,
      sessionCookie(login).split(';')[0].split('=')[1],
    ];
    for (const secret of secrets) expect(dump).not.toContain(secret);
    expect(dump).not.toMatch(/argon2|passwordHash|secretEncrypted|tokenHash/);
  });

  it('fails closed: no audit entry means the privileged action does not happen', async () => {
    // Same database, but the audit store refuses writes.
    const down = async () => {
      throw new Error('audit store down');
    };
    const brokenApp = buildApp({
      overrides: {
        limits: RELAXED_LIMITS,
        audit: { record: down, begin: down, recordSafely: async () => {} },
      },
    });

    // A step-up session obtained normally is replayed against the app whose audit store is down.
    const agent = await signIn(app, owner);
    await stepUp(agent, owner);
    const { value: token } = agent.jar.getCookie('bb_sid', {
      path: '/',
      domain: '127.0.0.1',
      secure: false,
      script: false,
    });
    const res = await request(brokenApp)
      .post('/api/v1/admin/administrators')
      .set(HEADERS)
      .set('Cookie', `bb_sid=${token}`)
      .send({ name: 'Ghost', email: 'ghost@example.com' });
    expect(res.status).toBe(503);
    expect(await Admin.exists({ email: 'ghost@example.com' })).toBeNull();

    // A correct second factor does not become a session if the sign-in cannot be audited.
    const pending = request.agent(brokenApp);
    await pending
      .post('/api/v1/auth/login')
      .set(HEADERS)
      .send({ email: colleague.email, password: colleague.password });
    const code = await freshCode(colleague.admin._id, colleague.secret);
    const verify = await pending.post('/api/v1/auth/login/verify').set(HEADERS).send({ code });
    expect(verify.status).toBe(503);
    expect(await Session.countDocuments({ admin: colleague.admin._id, stage: 'active' })).toBe(0);
  });
});
