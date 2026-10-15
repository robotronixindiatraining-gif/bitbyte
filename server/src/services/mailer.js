const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10_000;

export class MailError extends Error {
  /** @param {string} message @param {{ retryable: boolean, status?: number }} info */
  constructor(message, { retryable, status }) {
    super(message);
    this.name = 'MailError';
    this.retryable = retryable;
    this.status = status ?? null;
  }
}

/**
 * Replaceable mail adapter (D-019). Every driver implements
 * `send({ to, subject, text, idempotencyKey? }) → { accepted, providerMessageId }`.
 * - `accepted: true` means the provider confirmed it ACCEPTED the message for delivery. It is not
 *   a delivery receipt, and nothing in the app claims more than that.
 * - The `log` driver (development and tests) sends nothing and returns `accepted: false`.
 * Logs never contain recipient addresses, message bodies or credentials.
 *
 * @param {{ driver: 'log' | 'resend', resendApiKey?: string | null, from?: string | null,
 *   logger: import('pino').Logger, fetchImpl?: typeof fetch }} options
 */
export function createMailer({ driver, resendApiKey, from, logger, fetchImpl = fetch }) {
  if (driver === 'log') return createLogMailer({ logger });
  if (driver === 'resend')
    return createResendMailer({ apiKey: resendApiKey, from, logger, fetchImpl });
  throw new Error(`Unsupported mail driver: ${driver}`);
}

function recipientsOf(to) {
  return Array.isArray(to) ? to : [to];
}

function createLogMailer({ logger }) {
  const outbox = [];
  return {
    driver: 'log',
    /** Messages "sent" by the log driver (inspected by tests). */
    outbox,
    async send({ to, subject, text }) {
      const recipients = recipientsOf(to);
      outbox.push({ to: recipients, subject, text });
      logger.info({ recipients: recipients.length, subject }, 'mail not sent (log driver)');
      return { accepted: false, providerMessageId: null };
    },
  };
}

function createResendMailer({ apiKey, from, logger, fetchImpl }) {
  if (!apiKey || !from) throw new Error('Resend requires RESEND_API_KEY and MAIL_FROM');
  return {
    driver: 'resend',
    async send({ to, subject, text, idempotencyKey }) {
      const recipients = recipientsOf(to);
      let response;
      try {
        response = await fetchImpl(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          },
          body: JSON.stringify({ from, to: recipients, subject, text }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new MailError('The mail provider could not be reached', { retryable: true });
      }
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok || typeof body?.id !== 'string') {
        // 429 and 5xx are temporary; other 4xx (bad key, unverified domain) need an operator.
        const retryable = response.status === 429 || response.status >= 500;
        logger.warn({ status: response.status, subject }, 'mail provider rejected a message');
        throw new MailError(`The mail provider answered ${response.status}`, {
          retryable,
          status: response.status,
        });
      }
      logger.info({ recipients: recipients.length, subject }, 'mail accepted by provider');
      return { accepted: true, providerMessageId: body.id };
    },
  };
}
