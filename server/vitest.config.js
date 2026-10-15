import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    // Integration tests start a real (in-memory) mongod and hash passwords with argon2id.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // `npm run test:coverage -w server`: Stage 05 acceptance is ≥ 80 % for services/controllers.
    coverage: {
      provider: 'v8',
      include: [
        'src/services/**',
        'src/controllers/**',
        'src/media/**',
        'src/seo/**',
        'src/routes/**',
      ],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80 },
    },
  },
});
