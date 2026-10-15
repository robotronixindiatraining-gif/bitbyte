import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

export const silentLogger = pino({ level: 'silent' });

/** Test-only configuration. These secrets exist only in tests and protect nothing real. */
export const TEST_ENV = Object.freeze({
  NODE_ENV: 'test',
  CLIENT_DIST_DIR: '/nonexistent-client-dist',
  PUBLIC_SITE_URL: 'http://localhost:5173',
  TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  RECOVERY_CODE_PEPPER: 'test-recovery-code-pepper-0123456789',
  IP_HASH_SALT: 'test-ip-hash-salt',
});

export const testConfig = (env = {}) => loadConfig({ ...TEST_ENV, ...env });

/** Build an isolated app instance with a stub database state. */
export function buildApp({ dbState = 'up', env = {}, overrides } = {}) {
  return createApp({
    config: testConfig(env),
    logger: silentLogger,
    db: { getState: () => dbState },
    overrides,
  });
}
