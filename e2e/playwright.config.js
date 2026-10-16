import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests (D-040, Stage 06).
 * - "site": the PRODUCTION build served by `vite preview`, with the public API mocked from the
 *   development fixtures (no database, no network). Run `npm run build` first.
 * - "catalogue": the development server, which is the only place the component catalogue exists.
 */
const PREVIEW = 'http://localhost:4173';
const DEV = 'http://localhost:5174';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list']] : [['list']],
  use: { trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  projects: [
    { name: 'site', testMatch: /site\.spec\.js/, use: { baseURL: PREVIEW } },
    { name: 'catalogue', testMatch: /catalogue\.spec\.js/, use: { baseURL: DEV } },
  ],
  webServer: [
    {
      command: 'npx vite preview --port 4173 --strictPort',
      cwd: '../client',
      url: PREVIEW,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      cwd: '../client',
      url: DEV,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
