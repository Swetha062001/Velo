import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/index.js';
import { MIGRATIONS_DIR, migrate, migrationStatus } from '../src/db/migrator.js';
import { DEV_ACCOUNTS, seed, stockForSku } from '../src/db/seed.js';
import { verifyPassword } from '../src/utils/password.js';
import { inRollback, pgErrorCode, truncateAll } from './helpers/db.js';

describe('migrations', () => {
  it('applies every migration file', async () => {
    const statuses = await migrationStatus(pool);
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every((s) => s.state === 'applied')).toBe(true);
  });

  it('is idempotent', async () => {
    expect(await migrate(pool)).toEqual([]);
  });

  it('rejects a migration edited after it was applied', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'velo-migrations-'));
    const original = await readFile(path.join(MIGRATIONS_DIR, '0001_initial_schema.sql'), 'utf8');
    await writeFile(path.join(dir, '0001_initial_schema.sql'), `${original}\n-- edited`);

    await expect(migrate(pool, dir)).rejects.toThrow(/modified after it was applied/);
  });
});

describe('seed', () => {
  beforeAll(async () => {
    await truncateAll();
    await seed(pool);
  });

  it('creates the demo catalogue', async () => {
    const { rows } = await pool.query<{ categories: number; products: number; active: number }>(`
      SELECT (SELECT count(*) FROM categories) AS categories,
             (SELECT count(*) FROM products) AS products,
             (SELECT count(*) FROM products WHERE status = 'ACTIVE') AS active`);
    expect(rows[0]!.categories).toBe(5);
    expect(rows[0]!.products).toBeGreaterThanOrEqual(15);
    expect(rows[0]!.active).toBeLessThan(rows[0]!.products); // at least one draft for admin demos
  });

  it('gives every product multiple sizes, each with an inventory row', async () => {
    const { rows } = await pool.query<{ missing_inventory: number; min_sizes: number }>(`
      SELECT
        (SELECT count(*) FROM product_variants v LEFT JOIN inventory i ON i.variant_id = v.id
          WHERE i.variant_id IS NULL) AS missing_inventory,
        (SELECT min(n) FROM (SELECT count(*) AS n FROM product_variants GROUP BY product_id) t) AS min_sizes`);
    expect(rows[0]!.missing_inventory).toBe(0);
    expect(rows[0]!.min_sizes).toBeGreaterThanOrEqual(4);
  });

  it('stores bcrypt hashes, never plaintext passwords', async () => {
    const { rows } = await pool.query<{ email: string; password_hash: string; role: string }>(
      'SELECT email, password_hash, role FROM users ORDER BY email',
    );
    expect(rows.map((r) => [r.email, r.role])).toEqual([
      ['admin@velo.local', 'ADMIN'],
      ['user@velo.local', 'USER'],
    ]);
    const admin = rows[0]!;
    expect(admin.password_hash).toMatch(/^\$2[aby]\$12\$/);
    expect(admin.password_hash).not.toContain(DEV_ACCOUNTS.admin.password);
    expect(await verifyPassword(DEV_ACCOUNTS.admin.password, admin.password_hash)).toBe(true);
    expect(await verifyPassword('wrong-password', admin.password_hash)).toBe(false);
  });

  it('refuses to seed a database that already has data', async () => {
    await expect(seed(pool)).rejects.toThrow(/already contains data/);
  });

  it('produces deterministic stock', () => {
    expect(stockForSku('VELO-PLSR-WHT-08')).toBe(stockForSku('VELO-PLSR-WHT-08'));
  });
});

describe('schema constraints', () => {
  // Uses seeded data from the block above; each test rolls back.

  it('rejects duplicate emails regardless of case', async () => {
    const code = await inRollback((c) =>
      pgErrorCode(
        c.query(
          `INSERT INTO users (name, email, password_hash) VALUES ('X', 'ADMIN@velo.local', 'h')`,
        ),
      ),
    );
    expect(code).toBe('23505'); // unique_violation
  });

  it('rejects negative inventory', async () => {
    const code = await inRollback((c) =>
      pgErrorCode(c.query('UPDATE inventory SET quantity = -1')),
    );
    expect(code).toBe('23514'); // check_violation
  });

  it('allows only one default address per user', async () => {
    const code = await inRollback((c) =>
      pgErrorCode(
        c.query(`
          INSERT INTO addresses (user_id, full_name, phone, line1, city, state, postal_code, is_default)
          SELECT id, 'Second', '9000000001', 'Line', 'City', 'State', '560001', true
          FROM users WHERE email = 'user@velo.local'`),
      ),
    );
    expect(code).toBe('23505');
  });

  it('rejects an order whose total is not subtotal + shipping', async () => {
    const code = await inRollback((c) =>
      pgErrorCode(
        c.query(`
          INSERT INTO orders (user_id, shipping_address, subtotal_paise, shipping_paise, total_paise)
          SELECT id, '{}'::jsonb, 100000, 9900, 1 FROM users WHERE email = 'user@velo.local'`),
      ),
    );
    expect(code).toBe('23514');
  });

  it('rejects a compare-at price that is not higher than the price', async () => {
    const code = await inRollback((c) =>
      pgErrorCode(c.query('UPDATE products SET compare_at_price_paise = price_paise')),
    );
    expect(code).toBe('23514');
  });

  it('generates human-friendly order numbers', async () => {
    const orderNumber = await inRollback(async (c) => {
      const { rows } = await c.query<{ order_number: string }>(`
        INSERT INTO orders (user_id, shipping_address, subtotal_paise, shipping_paise, total_paise)
        SELECT id, '{}'::jsonb, 100000, 0, 100000 FROM users WHERE email = 'user@velo.local'
        RETURNING order_number`);
      return rows[0]!.order_number;
    });
    expect(orderNumber).toMatch(/^VELO-\d{4}-\d{6}$/);
  });

  it('maintains updated_at on update', async () => {
    const updatedAt = await inRollback(async (c) => {
      await c.query(`UPDATE categories SET updated_at = '2000-01-01' WHERE slug = 'running'`);
      const { rows } = await c.query<{ updated_at: Date }>(
        `UPDATE categories SET name = 'Running' WHERE slug = 'running' RETURNING updated_at`,
      );
      return rows[0]!.updated_at;
    });
    expect(updatedAt.getFullYear()).toBeGreaterThan(2000);
  });

  it('supports full-text product search', async () => {
    const { rows } = await pool.query<{ slug: string }>(
      `SELECT slug FROM products WHERE search_vector @@ websearch_to_tsquery('english', 'leather')`,
    );
    expect(rows.map((r) => r.slug)).toContain('velo-street-core-chalk-white');
  });
});
