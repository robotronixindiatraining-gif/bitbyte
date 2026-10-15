import mongoose from 'mongoose';
import { DB_STATES } from '@bitbyte/shared';
import { ensureIndexes } from '../models/index.js';

const MAX_RETRY_DELAY_MS = 30_000;

/** Global Mongoose safety settings (also applied by tests and the CLI). */
export function configureMongoose() {
  mongoose.set('strictQuery', true);
  // Reject query operators injected through user input (e.g. { "$gt": "" }).
  mongoose.set('sanitizeFilter', true);
  // Fail fast (→ 503) instead of queueing queries while the database is unavailable.
  mongoose.set('bufferCommands', false);
}

/**
 * MongoDB connection manager. The server starts without waiting for the database and keeps
 * retrying in the background, so health endpoints can report the state (D-041).
 * Schemas and models arrive in Stage 04.
 *
 * @param {{ uri: string | null, logger: import('pino').Logger, autoIndex?: boolean }} options
 */
export function createDatabase({ uri, logger, autoIndex = true }) {
  let stopped = false;
  let attempts = 0;
  let connectedOnce = false;
  let retryTimer = null;
  let wakeUp = null;

  configureMongoose();

  function getState() {
    if (!uri) return DB_STATES.DISABLED;
    const { readyState } = mongoose.connection;
    if (readyState === 1) return DB_STATES.UP;
    if (readyState === 2 || attempts === 0) return DB_STATES.CONNECTING;
    return DB_STATES.DOWN;
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      wakeUp = resolve;
      retryTimer = setTimeout(resolve, ms);
      retryTimer.unref();
    });
  }

  async function start() {
    if (!uri) {
      logger.warn('MONGODB_URI is not set; running without a database');
      return;
    }
    mongoose.connection.on('disconnected', () => {
      if (connectedOnce && !stopped) logger.warn('database disconnected');
    });
    mongoose.connection.on('reconnected', () => logger.info('database reconnected'));

    while (!stopped) {
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000, autoIndex });
        attempts += 1;
        connectedOnce = true;
        logger.info('database connected');
        // Create missing indexes (never drops existing ones).
        await ensureIndexes().catch((err) => logger.error({ err }, 'index creation failed'));
        return;
      } catch (err) {
        attempts += 1;
        if (stopped) return;
        const delay = Math.min(MAX_RETRY_DELAY_MS, 1_000 * 2 ** Math.min(attempts, 5));
        logger.warn(
          { err: { name: err.name, message: err.message }, attempt: attempts, retryInMs: delay },
          'database connection failed',
        );
        await sleep(delay);
      }
    }
  }

  async function stop() {
    stopped = true;
    clearTimeout(retryTimer);
    wakeUp?.();
    if (uri) await mongoose.disconnect();
  }

  return { start, stop, getState };
}
