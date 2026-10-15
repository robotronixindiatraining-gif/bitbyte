import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import pino from 'pino';
import { createServices } from '../container.js';
import { configureMongoose } from '../config/db.js';
import { ConfigError, loadConfig } from '../config/env.js';
import { loadEnvFile } from '../config/envFile.js';
import { ensureIndexes } from '../models/index.js';

/**
 * Shared CLI start-up: load config, refuse production unless explicitly authorised with
 * --allow-production, connect to MongoDB and build services. CLI actions are audited as
 * actor "system" (D-039 #9).
 */
export async function bootstrapCli({ name, options = {}, needsDb = true }) {
  let args;
  try {
    ({ values: args } = parseArgs({
      options: {
        ...options,
        'allow-production': { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
      strict: true,
    }));
  } catch (err) {
    fail(`${name}: ${err.message}`);
  }

  loadEnvFile();
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) fail(err.message);
    throw err;
  }
  if (config.isProduction && !args['allow-production']) {
    fail(`${name}: refusing to run against production without --allow-production.`);
  }

  const logger = pino({ level: 'warn' });
  if (needsDb) {
    if (!config.mongodbUri) fail(`${name}: MONGODB_URI is not configured.`);
    configureMongoose();
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5_000 }).catch((err) => {
      fail(`${name}: cannot connect to MongoDB (${err.message}).`);
    });
    await ensureIndexes();
  }
  const services = createServices({ config, logger });
  return {
    args,
    config,
    services,
    async close() {
      if (needsDb) await mongoose.disconnect();
    },
  };
}

export function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

export function requireArg(args, key, usage) {
  if (!args[key]) fail(`Missing --${key}.\n${usage}`);
  return args[key];
}
