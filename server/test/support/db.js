import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { configureMongoose } from '../../src/config/db.js';
import { ALL_MODELS, ensureIndexes } from '../../src/models/index.js';

// Same major/minor as the documented target. Where downloads are blocked, point
// MONGOMS_SYSTEM_BINARY at a local mongod (see README "Tests and MongoDB").
process.env.MONGOMS_VERSION ??= '8.0.34';

/**
 * Isolated, throwaway MongoDB for one test file (mongodb-memory-server). Tests never connect to
 * a development or production database. Collections are emptied after each test.
 */
export function useTestDatabase() {
  let server;
  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    configureMongoose();
    await mongoose.connect(server.getUri(), { dbName: 'bitbyte_test' });
    await ensureIndexes();
  });
  afterEach(async () => {
    await Promise.all(ALL_MODELS.map((model) => model.deleteMany({})));
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await server?.stop();
  });
  return { uri: () => server.getUri() };
}
