import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run the real app against an isolated database (`velo_e2e`) on separate
 * ports, so they never touch development data. Playwright starts both servers, resets and
 * seeds the database first, and uses the locally installed Google Chrome (no browser download).
 *
 * One-time setup:  createdb -O velo velo_e2e
 * Run:             npm run test:e2e
 */
const E2E_DB =
  process.env.E2E_DATABASE_URL ?? 'postgres://velo:velo_dev_password@localhost:5432/velo_e2e';
const API_PORT = 5002;
const WEB_PORT = 5174;
const WEB_URL = `http://localhost:${WEB_PORT}`;

if (!new URL(E2E_DB).pathname.includes('e2e')) {
  throw new Error('Refusing to run: the e2e database name must contain "e2e" (it is wiped).');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // flows share one database
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: WEB_URL,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
      testMatch: /shopping\.spec\.ts/, // the core journey also runs at phone size
    },
  ],
  webServer: [
    {
      name: 'api',
      cwd: 'server',
      command: 'npm run db:reset && npx tsx --env-file-if-exists=.env src/server.ts',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        CORS_ORIGIN: WEB_URL,
        DATABASE_URL: E2E_DB,
        PUBLIC_SERVER_URL: `http://localhost:${API_PORT}`,
        UPLOAD_DIR: 'uploads-e2e',
        AI_PROVIDER: 'mock', // deterministic answers; the real model is covered by manual QA
        // Test-only signing key (not a secret; the e2e database is throwaway).
        JWT_SECRET: 'e2e-only-signing-key-not-a-secret-0123456789abcdef',
      },
    },
    {
      name: 'web',
      cwd: 'client',
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_BASE_URL: `http://localhost:${API_PORT}/api/v1` },
    },
  ],
});
