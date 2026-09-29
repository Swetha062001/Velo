import { afterAll } from 'vitest';
import { pool } from '../src/db/index.js';

// Each test file gets its own module graph (and pool); close it so the worker exits cleanly.
afterAll(async () => {
  await pool.end();
});
