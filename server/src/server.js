import { createApp } from './app.js';
import { createDatabase } from './config/db.js';
import { ConfigError, loadConfig } from './config/env.js';
import { loadEnvFile } from './config/envFile.js';
import { createLogger } from './config/logger.js';
import { startJobs } from './jobs/scheduler.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function readConfig() {
  try {
    loadEnvFile();
    return loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}

const config = readConfig();
const logger = createLogger(config);
const db = createDatabase({ uri: config.mongodbUri, logger, autoIndex: !config.isProduction });
const app = createApp({ config, logger, db });

const server = app.listen(config.port, config.host, () => {
  logger.info({ port: config.port, env: config.env }, 'server listening');
});
server.on('error', (err) => {
  logger.fatal({ err }, 'server failed to start');
  process.exit(1);
});

db.start().catch((err) => logger.error({ err }, 'database connector stopped unexpectedly'));

// Retention purge and notification retries run here only (never in tests or CLI commands).
const jobs =
  config.jobsEnabled && config.mongodbUri
    ? startJobs({
        retention: app.locals.services.retention,
        notifications: app.locals.services.leadNotifications,
        logger,
      })
    : null;
if (config.isProduction && config.mail.driver === 'log') {
  logger.warn('MAIL_DRIVER=log: lead notification e-mails are not sent (configure Resend)');
}
if (!config.turnstile.secretKey) {
  logger.warn(
    'TURNSTILE_SECRET_KEY is not set: the contact form answers 503 until it is configured',
  );
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  const forceExit = setTimeout(() => {
    logger.error('graceful shutdown timed out; exiting');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  jobs?.stop();
  server.close();
  server.closeIdleConnections();
  try {
    await db.stop();
  } catch (err) {
    logger.error({ err }, 'error while closing the database connection');
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) =>
  logger.error({ err: reason }, 'unhandled promise rejection'),
);
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});
