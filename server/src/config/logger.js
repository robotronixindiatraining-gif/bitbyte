import pino from 'pino';

/**
 * Paths removed from every log line (D-022, D-032): credentials, tokens and personal data.
 * Request bodies are never logged; lead-specific paths are added with the lead model (Stage 05).
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.temporaryPassword',
  '*.token',
  '*.secret',
  '*.recoveryCode',
  '*.turnstileToken',
  '*.email',
  '*.phone',
];

/**
 * Structured JSON logger. Pretty printing is a development convenience only.
 * @param {{ logLevel: string, logPretty: boolean, env: string }} config
 */
export function createLogger(config) {
  return pino({
    level: config.logLevel,
    base: { service: 'bitbyte-server', env: config.env },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    transport: config.logPretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
  });
}
