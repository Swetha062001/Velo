import pg from 'pg';
import { env, isProduction } from '../config/env.js';
import { logger } from '../utils/logger.js';

// COUNT(*) and SUM() of integers come back as BIGINT (int8), which pg returns as strings.
// Money is stored in paise; totals stay far below Number.MAX_SAFE_INTEGER, so parse to number.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export function createPool(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Hosted Postgres (Supabase, etc.) requires TLS; its cert chain isn't one Node trusts
    // by default, so we encrypt without verifying it. Local Postgres has no TLS listener.
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  });

  // An idle client losing its connection must not crash the process.
  pool.on('error', (err) => logger.error('Unexpected PostgreSQL pool error', { err }));

  return pool;
}

/** The application's shared connection pool. */
export const pool = createPool(env.DATABASE_URL);
