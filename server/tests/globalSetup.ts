import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { dropAllTables, migrate } from '../src/db/migrator.js';

/** Runs once before the suite: rebuilds the test database schema from the migrations. */
export default async function setup(project: TestProject) {
  const url = project.config.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set for tests');

  // Safety net: never wipe a database that isn't clearly a test database.
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.includes('test')) {
    throw new Error(`Refusing to reset "${dbName}" — test database names must contain "test".`);
  }

  const pool = new pg.Pool({ connectionString: url });
  try {
    await dropAllTables(pool);
    await migrate(pool);
  } finally {
    await pool.end();
  }
}
