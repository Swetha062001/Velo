import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';

/** database/migrations — same relative depth from src/db and dist/db. */
export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../../database/migrations');

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;
// Arbitrary constant: serialises concurrent migration runs against the same database.
const ADVISORY_LOCK_ID = 7_220_001;

interface MigrationFile {
  version: string;
  sql: string;
  checksum: string;
}

export interface MigrationStatus {
  version: string;
  state: 'applied' | 'pending' | 'modified' | 'missing-file';
  appliedAt?: Date;
}

async function loadMigrationFiles(dir: string): Promise<MigrationFile[]> {
  const names = (await readdir(dir)).filter((name) => MIGRATION_FILE.test(name)).sort();
  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(path.join(dir, name), 'utf8');
      return {
        version: name.replace(/\.sql$/, ''),
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );
}

const CREATE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version     text        PRIMARY KEY,
    checksum    text        NOT NULL,
    applied_at  timestamptz NOT NULL DEFAULT now()
  )`;

/**
 * Forward-only migrations. Each file runs in its own transaction; a file that was edited
 * after being applied is rejected (write a new migration instead).
 * Returns the versions applied in this run.
 */
export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = await loadMigrationFiles(dir);
  const client = await pool.connect();
  const appliedNow: string[] = [];

  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);
    await client.query(CREATE_TRACKING_TABLE);

    const { rows } = await client.query<{ version: string; checksum: string }>(
      'SELECT version, checksum FROM schema_migrations',
    );
    const applied = new Map(rows.map((r) => [r.version, r.checksum]));

    for (const file of files) {
      const appliedChecksum = applied.get(file.version);
      if (appliedChecksum) {
        if (appliedChecksum !== file.checksum) {
          throw new Error(
            `Migration ${file.version} was modified after it was applied. ` +
              'Revert the edit and add a new migration instead (or run db:reset in development).',
          );
        }
        continue;
      }

      try {
        await client.query('BEGIN');
        await client.query(file.sql);
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [
          file.version,
          file.checksum,
        ]);
        await client.query('COMMIT');
        appliedNow.push(file.version);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file.version} failed: ${(err as Error).message}`, {
          cause: err,
        });
      }
    }

    return appliedNow;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]).catch(() => {});
    client.release();
  }
}

export async function migrationStatus(
  pool: Pool,
  dir = MIGRATIONS_DIR,
): Promise<MigrationStatus[]> {
  const files = await loadMigrationFiles(dir);
  await pool.query(CREATE_TRACKING_TABLE);
  const { rows } = await pool.query<{ version: string; checksum: string; applied_at: Date }>(
    'SELECT version, checksum, applied_at FROM schema_migrations ORDER BY version',
  );
  const applied = new Map(rows.map((r) => [r.version, r]));

  const statuses: MigrationStatus[] = files.map((file) => {
    const row = applied.get(file.version);
    if (!row) return { version: file.version, state: 'pending' };
    return {
      version: file.version,
      state: row.checksum === file.checksum ? 'applied' : 'modified',
      appliedAt: row.applied_at,
    };
  });

  const fileVersions = new Set(files.map((f) => f.version));
  for (const row of rows) {
    if (!fileVersions.has(row.version)) {
      statuses.push({ version: row.version, state: 'missing-file', appliedAt: row.applied_at });
    }
  }

  return statuses;
}

/** Development/test only: drop every object in the public schema. */
export async function dropAllTables(pool: Pool) {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');
}
