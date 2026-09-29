import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Only TEST_DATABASE_URL is taken from server/.env; everything else is fixed for tests.
const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
const testDatabaseUrl =
  fileEnv.TEST_DATABASE_URL ?? 'postgres://velo:velo_dev_password@localhost:5432/velo_test';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-only-secret-that-is-at-least-32-characters-long',
    },
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setup.ts'],
    // Test files share one database, so run them one at a time.
    fileParallelism: false,
  },
});
