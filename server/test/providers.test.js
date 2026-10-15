import { describe, expect, it } from 'vitest';
import { createMailer } from '../src/services/mailer.js';
import { createTurnstileVerifier } from '../src/services/turnstile.js';
import { captureLogger } from './support/fixtures.js';

const SECRET = 'test-turnstile-secret-not-real';

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body,
    };
  };
  return { impl, calls };
}

const verifier = (responses, { strict = true, hostnames = ['www.bitbyteindia.com'] } = {}) => {
  const fetch = fakeFetch(responses);
  return {
    fetch,
    turnstile: createTurnstileVerifier({
      secretKey: SECRET,
      allowedHostnames: hostnames,
      strict,
      fetchImpl: fetch.impl,
    }),
  };
};
const ok = (extra = {}) => ({
  status: 200,
  body: { success: true, hostname: 'www.bitbyteindia.com', action: 'lead', ...extra },
});

describe('Turnstile verification (D-020)', () => {
  it('passes a valid token and sends secret, token, remote IP and idempotency key server-side', async () => {
    const { turnstile, fetch } = verifier([ok()]);
    expect(
      await turnstile.verify('tok-1', { remoteIp: '203.0.113.9', idempotencyKey: 'lead-1' }),
    ).toEqual({ outcome: 'pass' });
    expect(fetch.calls[0].url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(fetch.calls[0].body).toEqual({
      secret: SECRET,
      response: 'tok-1',
      remoteip: '203.0.113.9',
      idempotency_key: 'lead-1',
    });
  });

  it('fails missing, invalid, expired/reused, foreign-host and wrong-action tokens', async () => {
    const { turnstile } = verifier([
      { status: 200, body: { success: false, 'error-codes': ['invalid-input-response'] } },
      { status: 200, body: { success: false, 'error-codes': ['timeout-or-duplicate'] } },
      ok({ hostname: 'evil.example' }),
      ok({ action: 'login' }),
    ]);
    expect(await turnstile.verify('')).toMatchObject({
      outcome: 'fail',
      reason: 'missing-input-response',
    });
    expect(await turnstile.verify('bad')).toMatchObject({ outcome: 'fail', reason: 'invalid' });
    expect(await turnstile.verify('old')).toMatchObject({
      outcome: 'fail',
      reason: 'expired-or-reused',
    });
    expect(await turnstile.verify('foreign')).toMatchObject({
      outcome: 'fail',
      reason: 'hostname',
    });
    expect(await turnstile.verify('other-action')).toMatchObject({
      outcome: 'fail',
      reason: 'action',
    });
  });

  it('refuses a replayed token locally without asking Cloudflare again', async () => {
    const { turnstile, fetch } = verifier([ok()]);
    expect((await turnstile.verify('once')).outcome).toBe('pass');
    expect(await turnstile.verify('once')).toMatchObject({ outcome: 'fail', reason: 'replayed' });
    expect(fetch.calls).toHaveLength(1);
  });

  it('reports Cloudflare outages as unavailable (lead kept as unverified)', async () => {
    const { turnstile } = verifier([
      new Error('ECONNRESET'),
      { status: 502, body: null },
      { status: 200, body: { success: false, 'error-codes': ['internal-error'] } },
    ]);
    expect((await turnstile.verify('a')).outcome).toBe('unavailable');
    expect((await turnstile.verify('b')).outcome).toBe('unavailable');
    expect((await turnstile.verify('c')).outcome).toBe('unavailable');
  });

  it('outside production, accepts test-key responses without hostname/action', async () => {
    const { turnstile } = verifier([{ status: 200, body: { success: true } }], {
      strict: false,
      hostnames: ['localhost'],
    });
    expect((await turnstile.verify('dummy')).outcome).toBe('pass');
    const strict = verifier([{ status: 200, body: { success: true } }]).turnstile;
    expect((await strict.verify('dummy')).outcome).toBe('fail');
  });

  it('is not configured without a secret', async () => {
    const turnstile = createTurnstileVerifier({
      secretKey: null,
      allowedHostnames: [],
      strict: true,
    });
    expect(turnstile.configured).toBe(false);
  });
});

describe('mail adapter (D-019)', () => {
  it('log driver sends nothing and never claims acceptance', async () => {
    const { logger, text } = captureLogger();
    const mailer = createMailer({ driver: 'log', logger });
    expect(await mailer.send({ to: ['a@example.com'], subject: 'Hi', text: 'Body' })).toEqual({
      accepted: false,
      providerMessageId: null,
    });
    expect(text()).not.toContain('a@example.com');
  });

  it('resend driver reports acceptance only when the provider confirms it', async () => {
    const { logger, text } = captureLogger();
    const fetch = fakeFetch([
      { status: 200, body: { id: 're_123' } },
      { status: 503, body: { message: 'unavailable' } },
      { status: 403, body: { message: 'domain not verified' } },
      { status: 200, body: {} },
      new Error('socket hang up'),
    ]);
    const mailer = createMailer({
      driver: 'resend',
      resendApiKey: 're_test_key_not_real',
      from: 'Website <noreply@example.com>',
      logger,
      fetchImpl: fetch.impl,
    });
    const message = {
      to: ['sales@example.com'],
      subject: 'New enquiry',
      text: 'Ref 1',
      idempotencyKey: 'lead-1',
    };
    expect(await mailer.send(message)).toEqual({ accepted: true, providerMessageId: 're_123' });
    expect(fetch.calls[0].init.headers).toMatchObject({
      Authorization: 'Bearer re_test_key_not_real',
      'Idempotency-Key': 'lead-1',
    });
    expect(fetch.calls[0].body).toEqual({
      from: 'Website <noreply@example.com>',
      to: ['sales@example.com'],
      subject: 'New enquiry',
      text: 'Ref 1',
    });

    await expect(mailer.send(message)).rejects.toMatchObject({ retryable: true, status: 503 });
    await expect(mailer.send(message)).rejects.toMatchObject({ retryable: false, status: 403 });
    await expect(mailer.send(message)).rejects.toMatchObject({ retryable: false });
    await expect(mailer.send(message)).rejects.toMatchObject({ retryable: true });
    const logs = text();
    expect(logs).not.toContain('re_test_key_not_real');
    expect(logs).not.toContain('sales@example.com');
  });

  it('refuses to start the resend driver without credentials', () => {
    expect(() => createMailer({ driver: 'resend', logger: captureLogger().logger })).toThrow();
    expect(() => createMailer({ driver: 'smtp', logger: captureLogger().logger })).toThrow();
  });
});
