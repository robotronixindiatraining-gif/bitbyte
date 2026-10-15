import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultEnvFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');

/**
 * Load server/.env for local development when it exists (Node's built-in loader; no dotenv).
 * Variables already set in the real environment take precedence. Set SKIP_ENV_FILE=true to
 * ignore the file (used by the smoke test). Production configuration comes from the host's
 * environment, never from a committed file.
 */
export function loadEnvFile(file = defaultEnvFile) {
  if (process.env.SKIP_ENV_FILE === 'true' || !existsSync(file)) return false;
  process.loadEnvFile(file);
  return true;
}
