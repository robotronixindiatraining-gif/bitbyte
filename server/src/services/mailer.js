/**
 * Replaceable mail adapter (D-019). Stage 04 ships the `log` driver only: it records that a
 * message would be sent (subject and recipient count — never addresses or bodies). The Resend
 * driver is added in Stage 05 behind the same `send()` interface.
 */
export function createMailer({ driver, logger }) {
  if (driver !== 'log') throw new Error(`Unsupported mail driver: ${driver}`);
  const outbox = [];
  return {
    driver,
    /** Messages "sent" by the log driver (inspected by tests). */
    outbox,
    async send({ to, subject, text }) {
      const recipients = Array.isArray(to) ? to : [to];
      outbox.push({ to: recipients, subject, text });
      logger.info({ recipients: recipients.length, subject }, 'mail (log driver)');
    },
  };
}
