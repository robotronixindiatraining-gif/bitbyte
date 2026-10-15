import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { AuditLog, Lead } from '../src/models/index.js';
import { HEADERS, RELAXED_LIMITS, createAdmin, signIn, stepUp } from './support/auth.js';
import {
  LEAD_FORM,
  captureLogger,
  completeService,
  fakeTurnstile,
  publishSettings,
} from './support/fixtures.js';
import { useTestDatabase } from './support/db.js';
import { createApp } from '../src/app.js';
import { testConfig } from './helpers.js';

useTestDatabase();

const URL_LEADS = '/api/v1/public/leads';
const DAY = 86_400_000;
const valid = (overrides = {}) => ({
  type: 'project_enquiry',
  fullName: 'Asha Verma',
  companyName: 'Example Pvt Ltd',
  companyLocation: 'Indore',
  email: 'Asha@Example.com',
  phone: '+91 98765 43210',
  budget: LEAD_FORM.budgetOptions[0],
  message: 'We need a connected metering solution.',
  consent: true,
  sourcePath: '/internet-of-things',
  formStartedAt: Date.now() - 60_000,
  turnstileToken: 'token-ok',
  ...overrides,
});

function makeApp({ turnstile = fakeTurnstile(), limits = {}, mailer, env } = {}) {
  const logs = captureLogger();
  const app = createApp({
    config: testConfig(env),
    logger: logs.logger,
    db: { getState: () => 'up' },
    overrides: {
      limits: { ...RELAXED_LIMITS, leadsPerHour: { windowMs: 60_000, limit: 100 }, ...limits },
      turnstile,
      mailer,
    },
  });
  return { app, logs, turnstile };
}
const submit = (app, body) => request(app).post(URL_LEADS).set(HEADERS).send(body);
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeEach(async () => {
  await publishSettings('leadForm', LEAD_FORM);
});

describe('POST /public/leads', () => {
  it('stores a valid lead with consent text, retention date and signals, without logging personal data', async () => {
    const { app, logs, turnstile } = makeApp();
    const res = await submit(app, valid());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { received: true, message: LEAD_FORM.successMessage } });
    expect(res.headers['cache-control']).toBe('no-store');
    await settle();

    const lead = await Lead.findOne().lean();
    expect(lead).toMatchObject({
      status: 'new',
      email: 'asha@example.com',
      consent: { given: true, text: LEAD_FORM.consentText },
      spamSignals: { honeypot: false, tooFast: false, turnstile: 'pass' },
    });
    expect(lead.ipHash).toMatch(/^[0-9a-f]+$/);
    expect(Math.round((lead.expiresAt - lead.createdAt) / DAY)).toBe(365);
    expect(turnstile.calls[0]).toMatchObject({
      token: 'token-ok',
      options: { idempotencyKey: String(lead._id) },
    });
    // Development mail driver: nothing is sent and nothing claims it was.
    expect(lead.notification.status).toBe('not_sent');

    const logText = logs.text();
    for (const secret of ['Asha', 'asha@example.com', '98765', 'metering', 'Example Pvt']) {
      expect(logText).not.toContain(secret);
    }
  });

  it('rejects malformed, oversized, unknown-field and cross-origin submissions', async () => {
    const { app } = makeApp();
    const cases = [
      valid({ email: 'not-an-email' }),
      valid({ consent: false }),
      valid({ message: 'short' }),
      valid({ phone: 'call me' }),
      valid({ fullName: 'A\u0000B' }),
      valid({ budget: 'A million' }),
      valid({ admin: true }),
      valid({ turnstileToken: '' }),
      { ...valid(), turnstileToken: undefined },
    ];
    for (const body of cases) {
      const res = await submit(app, body);
      expect(res.status, JSON.stringify(body)).toBe(422);
    }
    expect((await submit(app, valid({ phone: '+91 (98765) 43210 999' }))).status).toBe(422);
    expect((await submit(app, valid({ email: `${'a'.repeat(250)}@example.com` }))).status).toBe(
      422,
    );
    const big = await submit(app, valid({ message: 'x'.repeat(20_000) }));
    expect(big.status).toBe(413);
    const broken = await request(app)
      .post(URL_LEADS)
      .set(HEADERS)
      .set('Content-Type', 'application/json')
      .send('{"x":');
    expect(broken.status).toBe(400);
    const foreign = await request(app)
      .post(URL_LEADS)
      .set({ ...HEADERS, Origin: 'https://evil.example' })
      .send(valid());
    expect(foreign.status).toBe(403);
    const noHeader = await request(app)
      .post(URL_LEADS)
      .set({ Origin: HEADERS.Origin })
      .send(valid());
    expect(noHeader.status).toBe(403);
    expect(await Lead.countDocuments()).toBe(0);
  });

  it('rejects failed bot checks and keeps unverifiable ones for review', async () => {
    const { app } = makeApp({ turnstile: fakeTurnstile({ outcomes: ['fail', 'unavailable'] }) });
    const failed = await submit(app, valid());
    expect(failed.status).toBe(422);
    expect(failed.body.error.code).toBe('CAPTCHA_FAILED');
    expect(await Lead.countDocuments()).toBe(0);

    const unverified = await submit(app, valid());
    expect(unverified.status).toBe(201);
    const lead = await Lead.findOne().lean();
    expect(lead.spamSignals.turnstile).toBe('unverified');
  });

  it('answers a filled honeypot exactly like success and stores it as spam with short retention', async () => {
    const { app, turnstile } = makeApp();
    const res = await submit(
      app,
      valid({ website: 'https://spam.example', formStartedAt: Date.now() - 500 }),
    );
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { received: true, message: LEAD_FORM.successMessage } });
    const lead = await Lead.findOne().lean();
    expect(lead).toMatchObject({
      status: 'spam',
      spamSignals: { honeypot: true, turnstile: 'skipped' },
    });
    expect(Math.round((lead.expiresAt - lead.createdAt) / DAY)).toBe(30);
    expect(turnstile.calls).toHaveLength(0);
  });

  it('flags submissions that were filled in too fast', async () => {
    const { app } = makeApp();
    await submit(app, valid({ formStartedAt: Date.now() - 1000 }));
    expect((await Lead.findOne().lean()).spamSignals.tooFast).toBe(true);
  });

  it('is unavailable (503) until the form settings and Turnstile are configured', async () => {
    const { app } = makeApp({ turnstile: fakeTurnstile({ configured: false }) });
    expect((await submit(app, valid())).status).toBe(503);
    const { Setting } = await import('../src/models/index.js');
    await Setting.deleteMany({});
    const { app: app2 } = makeApp();
    expect((await submit(app2, valid())).status).toBe(503);
  });

  it('rate-limits submissions per IP', async () => {
    const { app } = makeApp({ limits: { leadsPerHour: { windowMs: 60_000, limit: 2 } } });
    expect((await submit(app, valid())).status).toBe(201);
    expect((await submit(app, valid())).status).toBe(201);
    const third = await submit(app, valid());
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });

  it('links the enquiry to a published service only', async () => {
    const { Service } = await import('../src/models/index.js');
    const svc = await Service.create({
      slug: 'internet-of-things',
      draft: completeService(),
      published: completeService(),
      status: 'published',
    });
    const { app } = makeApp();
    await submit(app, valid({ service: 'internet-of-things' }));
    await submit(app, valid({ service: 'unknown-service' }));
    const leads = await Lead.find().sort({ createdAt: 1 }).lean();
    expect(leads.map((l) => (l.service ? String(l.service) : null))).toEqual([
      String(svc._id),
      null,
    ]);
  });
});

describe('lead notifications', () => {
  it('records provider acceptance, retries temporary failures and never loses the lead', async () => {
    const sent = [];
    let mode = 'fail-temporary';
    const mailer = {
      driver: 'resend',
      async send(message) {
        sent.push(message);
        if (mode === 'fail-temporary')
          throw Object.assign(new Error('The mail provider answered 503'), { retryable: true });
        if (mode === 'fail-permanent')
          throw Object.assign(new Error('The mail provider answered 403'), { retryable: false });
        return { accepted: true, providerMessageId: 'msg_123' };
      },
    };
    const { app } = makeApp({ mailer });
    expect((await submit(app, valid())).status).toBe(201);
    await settle();
    let lead = await Lead.findOne().lean();
    expect(lead.notification).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: 'The mail provider answered 503',
    });
    expect(lead.notification.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(sent[0].to).toEqual(LEAD_FORM.notificationEmails);
    expect(sent[0].idempotencyKey).toBe(`lead-notification-${lead._id}`);
    // The notice carries no personal data from the enquiry.
    expect(JSON.stringify(sent[0])).not.toMatch(
      /Asha|example\.com.*Asha|98765|metering|Example Pvt/,
    );

    const { leadNotifications } = app.locals.services;
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { 'notification.nextAttemptAt': new Date(Date.now() - 1000) } },
    );
    mode = 'ok';
    expect(await leadNotifications.retryDue()).toBe(1);
    lead = await Lead.findOne().lean();
    expect(lead.notification).toMatchObject({
      status: 'accepted',
      attempts: 2,
      providerMessageId: 'msg_123',
    });
    expect(await leadNotifications.retryDue()).toBe(0);

    mode = 'fail-permanent';
    await submit(app, valid({ email: 'second@example.com' }));
    await settle();
    const second = await Lead.findOne({ email: 'second@example.com' }).lean();
    expect(second.notification.status).toBe('failed');
    expect(await Lead.countDocuments()).toBe(2);
  });
});

describe('admin lead management', () => {
  let app;
  let owner;
  let agent;
  let lead;
  beforeEach(async () => {
    ({ app } = makeApp());
    owner = await createAdmin();
    agent = await signIn(app, owner);
    await submit(app, valid({ message: '=HYPERLINK("https://evil.example","click")' }));
    await submit(
      app,
      valid({ fullName: 'Ravi Kumar', email: 'ravi@example.com', companyName: '+Corp' }),
    );
    await settle();
    lead = await Lead.findOne({ email: 'asha@example.com' });
  });

  it('lists, filters, searches and shows leads', async () => {
    const list = await agent.get('/api/v1/admin/leads?limit=1');
    expect(list.body.meta).toMatchObject({ total: 2, totalPages: 2 });
    expect(list.body.data[0]).not.toHaveProperty('message');
    const search = await agent.get('/api/v1/admin/leads?q=ravi');
    expect(search.body.data.map((l) => l.fullName)).toEqual(['Ravi Kumar']);
    const byStatus = await agent.get('/api/v1/admin/leads?status=won');
    expect(byStatus.body.data).toEqual([]);
    const regex = await agent.get('/api/v1/admin/leads?q=.*');
    expect(regex.body.data).toEqual([]);
    const detail = await agent.get(`/api/v1/admin/leads/${lead._id}`);
    expect(detail.body.data).toMatchObject({
      fullName: 'Asha Verma',
      phone: '+91 98765 43210',
      notes: [],
    });
    expect((await agent.get('/api/v1/admin/leads?status=bogus')).status).toBe(422);
  });

  it('updates status and notes with audit entries that contain no personal data', async () => {
    const status = await agent
      .patch(`/api/v1/admin/leads/${lead._id}`)
      .set(HEADERS)
      .send({ status: 'contacted' });
    expect(status.body.data.status).toBe('contacted');
    const note = await agent
      .post(`/api/v1/admin/leads/${lead._id}/notes`)
      .set(HEADERS)
      .send({ text: 'Called Asha.' });
    expect(note.status).toBe(201);
    expect(note.body.data.notes[0].text).toBe('Called Asha.');
    const toSpam = await agent
      .patch(`/api/v1/admin/leads/${lead._id}`)
      .set(HEADERS)
      .send({ status: 'spam' });
    expect(
      Math.round(
        (new Date(toSpam.body.data.expiresAt) - new Date(toSpam.body.data.createdAt)) / DAY,
      ),
    ).toBe(30);

    const audit = await AuditLog.find({ entityType: 'lead' }).lean();
    expect(audit.map((a) => a.action).sort()).toEqual(['lead.note', 'lead.status', 'lead.status']);
    expect(JSON.stringify(audit)).not.toMatch(/Asha|asha@|98765|Called/);
  });

  it('exports CSV only after step-up, with formula escaping, and audits the export', async () => {
    const blocked = await agent.get('/api/v1/admin/leads/export.csv');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('STEP_UP_REQUIRED');
    await stepUp(agent, owner);
    const res = await agent.get('/api/v1/admin/leads/export.csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.text).toContain('"\'=HYPERLINK(""https://evil.example"",""click"")"');
    expect(res.text).toContain('"\'+Corp"');
    expect(res.text.split('\r\n').filter(Boolean)).toHaveLength(3);
    const entry = await AuditLog.findOne({ action: 'lead.export' }).lean();
    expect(entry).toMatchObject({ outcome: 'succeeded', meta: { rows: 2 } });
  });

  it('erases a lead only with step-up and explicit confirmation', async () => {
    const noStepUp = await agent
      .delete(`/api/v1/admin/leads/${lead._id}`)
      .set(HEADERS)
      .send({ confirm: 'DELETE' });
    expect(noStepUp.status).toBe(403);
    await stepUp(agent, owner);
    const unconfirmed = await agent
      .delete(`/api/v1/admin/leads/${lead._id}`)
      .set(HEADERS)
      .send({ confirm: 'yes' });
    expect(unconfirmed.status).toBe(422);
    await agent
      .delete(`/api/v1/admin/leads/${lead._id}`)
      .set(HEADERS)
      .send({ confirm: 'DELETE' })
      .expect(204);
    expect(await Lead.exists({ _id: lead._id })).toBeNull();
    const entry = await AuditLog.findOne({ action: 'lead.erase' }).lean();
    expect(entry).toMatchObject({ outcome: 'succeeded', entityId: lead._id });
    expect(JSON.stringify(entry)).not.toMatch(/Asha|asha@/);
  });

  it('keeps search terms out of the access log', async () => {
    const { app: logged, logs } = makeApp();
    const a = await signIn(logged, await createAdmin({ email: 'other@example.com' }));
    await a.get('/api/v1/admin/leads?q=findme-secret-term');
    expect(logs.text()).toContain('/api/v1/admin/leads');
    expect(logs.text()).not.toContain('findme-secret-term');
  });

  it('retries notifications whose first attempt never started, and refuses a parallel re-send', async () => {
    // Raw driver update: Mongoose treats createdAt as immutable.
    await Lead.collection.updateOne(
      { _id: lead._id },
      {
        $set: {
          'notification.status': 'pending',
          'notification.nextAttemptAt': null,
          createdAt: new Date(Date.now() - 120_000),
        },
      },
    );
    expect(await app.locals.services.leadNotifications.retryDue()).toBe(1);
    await Lead.updateOne(
      { _id: lead._id },
      {
        $set: {
          'notification.status': 'pending',
          'notification.nextAttemptAt': new Date(Date.now() + 60_000),
        },
      },
    );
    const res = await agent
      .post(`/api/v1/admin/leads/${lead._id}/resend-notification`)
      .set(HEADERS);
    expect(res.status).toBe(409);
  });

  it('re-sends a notification that was not sent', async () => {
    const res = await agent
      .post(`/api/v1/admin/leads/${lead._id}/resend-notification`)
      .set(HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.data.notification.status).toBe('not_sent');
  });
});
