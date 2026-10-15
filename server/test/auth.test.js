import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { sessionCookieOptions } from '../src/middleware/auth.js';
import { Admin, AuditLog, Session } from '../src/models/index.js';
import { generateTotp } from '../src/security/totp.js';
import { buildApp, testConfig } from './helpers.js';
import {
  HEADERS,
  buildTestApp,
  createAdmin,
  freshCode,
  sessionCookie,
  signIn,
  stepUp,
} from './support/auth.js';
import { useTestDatabase } from './support/db.js';

useTestDatabase();

let app;
let account;
beforeEach(async () => {
  app = buildTestApp();
  account = await createAdmin();
});

const login = (agent, body) => agent.post('/api/v1/auth/login').set(HEADERS).send(body);
const verify = (agent, body) => agent.post('/api/v1/auth/login/verify').set(HEADERS).send(body);

describe('password step', () => {
  it('returns the same generic error for a wrong password, unknown account or disabled account', async () => {
    const wrong = await login(request(app), {
      email: account.email,
      password: 'wrong password 123',
    });
    const unknown = await login(request(app), {
      email: 'nobody@example.com',
      password: 'whatever password',
    });
    await Admin.updateOne({ _id: account.admin._id }, { status: 'disabled' });
    const disabled = await login(request(app), {
      email: account.email,
      password: account.password,
    });
    for (const res of [wrong, unknown, disabled]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
      expect(sessionCookie(res)).toBeUndefined();
    }
  });

  it('never grants admin access with a password alone', async () => {
    const agent = request.agent(app);
    const res = await login(agent, { email: account.email, password: account.password });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ stage: 'mfa_pending' });

    expect((await agent.get('/api/v1/admin/administrators')).status).toBe(401);
    expect((await agent.get('/api/v1/auth/sessions')).status).toBe(401);
    expect((await agent.get('/api/v1/auth/session')).body.data.stage).toBe('mfa_pending');
  });

  it('rejects query-operator injection in credentials', async () => {
    const res = await login(request(app), { email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(422);
    // Defence in depth: sanitizeFilter turns an injected operator into a literal value, so the
    // query is rejected instead of matching every account.
    await expect(Admin.findOne({ email: { $ne: null } })).rejects.toThrow(/Cast to string failed/);
  });

  it('sets an HttpOnly, SameSite=Strict, path-wide session cookie', async () => {
    const res = await login(request(app), { email: account.email, password: account.password });
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\//);
    expect(
      sessionCookieOptions(
        testConfig({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb://db/x',
          PUBLIC_SITE_URL: 'https://www.example.com',
        }),
      ),
    ).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
  });
});

describe('second factor', () => {
  async function pendingAgent() {
    const agent = request.agent(app);
    await login(agent, { email: account.email, password: account.password });
    return agent;
  }

  it('completes sign-in with a valid TOTP code and rotates the session', async () => {
    const agent = await pendingAgent();
    const pendingCount = await Session.countDocuments({ stage: 'mfa_pending' });
    const res = await verify(agent, { code: generateTotp(account.secret) });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      stage: 'active',
      admin: { email: account.email, role: 'super_admin', twoFactorEnabled: true },
    });
    expect(pendingCount).toBe(1);
    expect(await Session.countDocuments({ stage: 'mfa_pending' })).toBe(0);
    expect((await agent.get('/api/v1/admin/administrators')).status).toBe(200);
  });

  it('rejects invalid and expired codes', async () => {
    const agent = await pendingAgent();
    const invalid = await verify(agent, {
      code: '000000' === generateTotp(account.secret) ? '111111' : '000000',
    });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_MFA_CODE');
    const expired = await verify(agent, {
      code: generateTotp(account.secret, Date.now() - 5 * 60_000),
    });
    expect(expired.status).toBe(401);
    expect((await agent.get('/api/v1/admin/administrators')).status).toBe(401);
  });

  it('rejects a replayed code even in a new sign-in', async () => {
    const code = await freshCode(account.admin._id, account.secret);
    const first = await pendingAgent();
    expect((await verify(first, { code })).status).toBe(200);
    const second = await pendingAgent();
    const replay = await verify(second, { code });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('INVALID_MFA_CODE');
  });

  it('ends the pending session after 5 wrong codes', async () => {
    const agent = await pendingAgent();
    for (let i = 0; i < 5; i += 1) await verify(agent, { code: '000001' });
    const res = await verify(agent, { code: generateTotp(account.secret) });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('accepts each recovery code once, then never again, and notifies admins', async () => {
    const services = app.locals.services;
    const [code] = account.recoveryCodes;
    const first = await pendingAgent();
    expect((await verify(first, { recoveryCode: code })).status).toBe(200);
    const second = await pendingAgent();
    const reuse = await verify(second, { recoveryCode: code.toLowerCase() });
    expect(reuse.status).toBe(401);
    const stored = await Admin.findById(account.admin._id).select('+twoFactor');
    expect(stored.twoFactor.recoveryCodeHashes).toHaveLength(9);
    expect(services.mailer.outbox.at(-1).subject).toMatch(/recovery code was used/);
  });
});

describe('enrolment of a new administrator', () => {
  it('restricts the session until two-factor is confirmed, then requires a password change', async () => {
    const fresh = await createAdmin({
      email: 'new@example.com',
      enrolled: false,
      mustChangePassword: true,
    });
    const agent = request.agent(app);
    const res = await login(agent, { email: fresh.email, password: fresh.password });
    expect(res.body.data).toEqual({ stage: 'enrollment' });

    const blocked = await agent.get('/api/v1/admin/administrators');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('MFA_ENROLLMENT_REQUIRED');

    const start = await agent.post('/api/v1/auth/2fa/enroll/start').set(HEADERS);
    expect(start.status).toBe(200);
    expect(start.body.data.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(start.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    const secret = start.body.data.manualEntryKey;

    expect(
      (await agent.post('/api/v1/auth/2fa/enroll/confirm').set(HEADERS).send({ code: '000000' }))
        .status,
    ).toBe(401);
    const confirm = await agent
      .post('/api/v1/auth/2fa/enroll/confirm')
      .set(HEADERS)
      .send({ code: generateTotp(secret) });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.recoveryCodes).toHaveLength(10);

    const mustChange = await agent.get('/api/v1/admin/administrators');
    expect(mustChange.status).toBe(403);
    expect(mustChange.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    await Admin.updateOne({ email: fresh.email }, { $set: { 'twoFactor.lastUsedStep': null } });
    const change = await agent
      .post('/api/v1/auth/change-password')
      .set(HEADERS)
      .send({
        currentPassword: fresh.password,
        newPassword: 'a brand new passphrase',
        code: generateTotp(secret),
      });
    expect(change.status).toBe(204);
    expect((await agent.get('/api/v1/admin/administrators')).status).toBe(200);
  });
});

describe('CSRF protection (D-012)', () => {
  it('rejects state-changing requests without an allowed Origin or the custom header', async () => {
    const body = { email: account.email, password: account.password };
    const noOrigin = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'fetch')
      .send(body);
    const evil = await request(app)
      .post('/api/v1/auth/login')
      .set({ ...HEADERS, Origin: 'https://evil.example' })
      .send(body);
    const noHeader = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', HEADERS.Origin)
      .send(body);
    for (const res of [noOrigin, evil, noHeader]) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ORIGIN_REJECTED');
    }
  });

  it('accepts a matching Referer when Origin is absent, and requires JSON bodies', async () => {
    const viaReferer = await request(app)
      .post('/api/v1/auth/login')
      .set({ 'X-Requested-With': 'fetch', Referer: 'http://localhost:5173/admin/login' })
      .send({ email: account.email, password: account.password });
    expect(viaReferer.status).toBe(200);
    const form = await request(app)
      .post('/api/v1/auth/login')
      .set(HEADERS)
      .type('form')
      .send({ email: account.email, password: account.password });
    expect(form.status).toBe(415);
  });

  it('protects authenticated writes too', async () => {
    const agent = await signIn(app, account);
    const res = await agent
      .post('/api/v1/auth/logout')
      .set('Origin', 'https://evil.example')
      .set('X-Requested-With', 'fetch');
    expect(res.status).toBe(403);
    expect((await agent.get('/api/v1/auth/session')).status).toBe(200);
  });
});

describe('session lifetime', () => {
  it('rejects an expired session', async () => {
    const agent = await signIn(app, account);
    await Session.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await agent.get('/api/v1/admin/administrators')).status).toBe(401);
  });

  it('slides the idle expiry but never past the absolute limit', async () => {
    const agent = await signIn(app, account);
    const absolute = new Date(Date.now() + 10 * 60_000);
    await Session.updateMany(
      {},
      { $set: { lastSeenAt: new Date(Date.now() - 5 * 60_000), absoluteExpiresAt: absolute } },
    );
    expect((await agent.get('/api/v1/auth/session')).status).toBe(200);
    const session = await Session.findOne({ stage: 'active' });
    expect(session.expiresAt.getTime()).toBeLessThanOrEqual(absolute.getTime());
    expect(session.lastSeenAt.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('logs out by deleting the server-side session', async () => {
    const agent = await signIn(app, account);
    const res = await agent.post('/api/v1/auth/logout').set(HEADERS);
    expect(res.status).toBe(204);
    expect(await Session.countDocuments()).toBe(0);
    expect((await agent.get('/api/v1/auth/session')).status).toBe(401);
  });

  it('changing the password signs out every other session', async () => {
    const first = await signIn(app, account);
    const second = await signIn(app, account);
    const code = await freshCode(account.admin._id, account.secret);
    const res = await first
      .post('/api/v1/auth/change-password')
      .set(HEADERS)
      .send({ currentPassword: account.password, newPassword: 'another long passphrase', code });
    expect(res.status).toBe(204);
    expect((await first.get('/api/v1/auth/session')).status).toBe(200);
    expect((await second.get('/api/v1/auth/session')).status).toBe(401);
  });
});

describe('lockout and rate limiting', () => {
  it('locks the account after 10 failures and then rejects even the right password generically', async () => {
    for (let i = 0; i < 10; i += 1)
      await login(request(app), { email: account.email, password: `wrong password ${i}` });
    const locked = await Admin.findById(account.admin._id);
    expect(locked.lockUntil.getTime()).toBeGreaterThan(Date.now());
    const res = await login(request(app), { email: account.email, password: account.password });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(await AuditLog.countDocuments({ action: 'auth.locked' })).toBe(1);
  });

  it('rate-limits repeated login attempts for one account (default limits)', async () => {
    const strictApp = buildApp();
    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push(
        (await login(request(strictApp), { email: account.email, password: 'wrong password!' }))
          .status,
      );
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });
});

describe('step-up re-authentication', () => {
  it('is required for sensitive actions and expires after 5 minutes', async () => {
    const agent = await signIn(app, account);
    const body = { name: 'Second Admin', email: 'second@example.com' };
    const without = await agent.post('/api/v1/admin/administrators').set(HEADERS).send(body);
    expect(without.status).toBe(403);
    expect(without.body.error.code).toBe('STEP_UP_REQUIRED');

    await stepUp(agent, account);
    const created = await agent.post('/api/v1/admin/administrators').set(HEADERS).send(body);
    expect(created.status).toBe(201);
    expect(created.body.data.admin).toMatchObject({
      email: 'second@example.com',
      role: 'super_admin',
      mustChangePassword: true,
      twoFactorEnabled: false,
    });
    expect(created.body.data.temporaryPassword).toMatch(/^[\w]{5}(-[\w]{5}){3}$/);

    await Session.updateMany({}, { $set: { stepUpAt: new Date(Date.now() - 6 * 60_000) } });
    const expired = await agent
      .post('/api/v1/admin/administrators')
      .set(HEADERS)
      .send({ ...body, email: 'third@example.com' });
    expect(expired.status).toBe(403);
  });

  it('rejects a wrong password or code', async () => {
    const agent = await signIn(app, account);
    const code = await freshCode(account.admin._id, account.secret);
    const res = await agent
      .post('/api/v1/auth/step-up')
      .set(HEADERS)
      .send({ password: 'wrong password', code });
    expect(res.status).toBe(401);
  });
});
