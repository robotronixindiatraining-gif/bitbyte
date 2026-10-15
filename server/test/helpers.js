import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

export const silentLogger = pino({ level: 'silent' });

/** Build an isolated app instance with a stub database state. */
export function buildApp({ dbState = 'up', env = {} } = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    CLIENT_DIST_DIR: '/nonexistent-client-dist',
    ...env,
  });
  return createApp({ config, logger: silentLogger, db: { getState: () => dbState } });
}
