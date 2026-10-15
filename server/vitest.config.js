import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    // Integration tests start a real (in-memory) mongod and hash passwords with argon2id.
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
