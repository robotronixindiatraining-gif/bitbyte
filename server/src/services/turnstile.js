import { createHash } from 'node:crypto';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const REQUEST_TIMEOUT_MS = 8_000;
/** Turnstile tokens are valid for 300 s; remembering them a little longer blocks local replays. */
const REPLAY_WINDOW_MS = 10 * 60_000;
const MAX_REMEMBERED = 10_000;

/**
 * Server-side Cloudflare Turnstile verification (D-020). The secret never leaves the server.
 *
 * `verify()` resolves to:
 * - `{ outcome: 'pass' }`: Cloudflare confirmed the token, for our hostname and action;
 * - `{ outcome: 'fail', reason }`: missing, invalid, expired, reused or foreign token;
 * - `{ outcome: 'unavailable' }`: Cloudflare could not be reached or answered with an error
 *   (the caller stores the lead as "unverified" for manual review instead of losing it).
 *
 * `strict` (production): the response must name the expected hostname and the `lead` action.
 * Outside production, Cloudflare's documented test keys return placeholder values, so those two
 * checks apply only when the response carries them.
 *
 * @param {{ secretKey: string | null, allowedHostnames: readonly string[], strict: boolean,
 *   fetchImpl?: typeof fetch, now?: () => number }} options
 */
export function createTurnstileVerifier({
  secretKey,
  allowedHostnames,
  strict,
  fetchImpl = fetch,
  now = Date.now,
}) {
  const seen = new Map();

  function rememberToken(hash) {
    const time = now();
    for (const [key, at] of seen) {
      if (time - at < REPLAY_WINDOW_MS && seen.size < MAX_REMEMBERED) break;
      seen.delete(key);
    }
    seen.set(hash, time);
  }

  async function verify(token, { remoteIp, idempotencyKey, expectedAction = 'lead' } = {}) {
    if (!secretKey) return { outcome: 'unavailable', reason: 'not-configured' };
    if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
      return { outcome: 'fail', reason: 'missing-input-response' };
    }
    const hash = createHash('sha256').update(token).digest('hex');
    const previous = seen.get(hash);
    if (previous !== undefined && now() - previous < REPLAY_WINDOW_MS) {
      return { outcome: 'fail', reason: 'replayed' };
    }
    // A token is single-use: remember it before asking Cloudflare, so concurrent replays fail too.
    rememberToken(hash);

    let response;
    try {
      response = await fetchImpl(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
          ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      return { outcome: 'unavailable', reason: 'network' };
    }
    if (!response.ok) return { outcome: 'unavailable', reason: `http-${response.status}` };
    let body;
    try {
      body = await response.json();
    } catch {
      return { outcome: 'unavailable', reason: 'bad-response' };
    }
    if (body?.success !== true) {
      const codes = Array.isArray(body?.['error-codes']) ? body['error-codes'] : [];
      if (codes.includes('internal-error'))
        return { outcome: 'unavailable', reason: 'internal-error' };
      return {
        outcome: 'fail',
        reason: codes.includes('timeout-or-duplicate') ? 'expired-or-reused' : 'invalid',
      };
    }
    const hostname = String(body.hostname ?? '').toLowerCase();
    if (
      allowedHostnames.length > 0 &&
      (strict || hostname) &&
      !allowedHostnames.includes(hostname)
    ) {
      return { outcome: 'fail', reason: 'hostname' };
    }
    if ((strict || body.action) && body.action !== expectedAction) {
      return { outcome: 'fail', reason: 'action' };
    }
    return { outcome: 'pass' };
  }

  return { configured: Boolean(secretKey), verify };
}
