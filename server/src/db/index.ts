import type { Pool, PoolClient, QueryResultRow } from 'pg';
import { pool } from './pool.js';

export { pool } from './pool.js';

/**
 * Anything that can run a query: the pool, or a client inside a transaction.
 * Repositories accept a `Queryable` so services can compose them in one transaction.
 */
export type Queryable = Pool | PoolClient;

/** Run a parameterised query and return its rows. Never interpolate values into SQL. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  db: Queryable = pool,
): Promise<T[]> {
  const result = await db.query<T>(text, params);
  return result.rows;
}

/** Run `fn` inside BEGIN/COMMIT; any thrown error rolls the whole transaction back. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  db: Pool = pool,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
