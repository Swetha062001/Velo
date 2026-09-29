import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { slugSchema } from '../schemas/common.js';
import { hashPassword } from '../utils/password.js';
import { withTransaction } from './index.js';

export const SEEDS_DIR = path.resolve(import.meta.dirname, '../../../database/seeds');

/**
 * DEVELOPMENT-ONLY accounts. Documented in database/README.md.
 * Never reuse these credentials anywhere real.
 */
export const DEV_ACCOUNTS = {
  admin: { name: 'VELO Admin', email: 'admin@velo.local', password: 'VeloAdmin#2026' },
  user: { name: 'Demo Customer', email: 'user@velo.local', password: 'VeloUser#2026' },
} as const;

// UK size runs. Women's shoes use a smaller run.
const SIZE_RUNS = {
  default: [6, 7, 8, 9, 10, 11],
  WOMEN: [3, 4, 5, 6, 7, 8],
};

const categorySeedSchema = z.array(
  z.object({
    name: z.string().min(1),
    slug: slugSchema,
    description: z.string().min(1),
    imageUrl: z.url(),
  }),
);

const productSeedSchema = z.array(
  z
    .object({
      name: z.string().min(1),
      slug: slugSchema,
      skuCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z]{3}$/),
      category: slugSchema,
      colorway: z.string().min(1),
      color: z.string().regex(/^[a-z]+$/),
      gender: z.enum(['MEN', 'WOMEN', 'UNISEX']),
      material: z.string().min(1),
      priceInr: z.number().int().positive(),
      compareAtPriceInr: z.number().int().positive().nullable(),
      tags: z.array(z.string().min(1)),
      status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
      featured: z.boolean(),
      description: z.string().min(20),
      images: z.array(z.url()).min(2, 'Each product needs at least 2 images'),
    })
    .refine((p) => p.compareAtPriceInr === null || p.compareAtPriceInr > p.priceInr, {
      message: 'compareAtPriceInr must be greater than priceInr',
    }),
);

async function loadJson<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const raw = JSON.parse(await readFile(path.join(SEEDS_DIR, file), 'utf8'));
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid seed file ${file}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Deterministic stock per SKU (same data on every reset). ~10% of sizes are sold out. */
export function stockForSku(sku: string) {
  let hash = 0;
  for (const char of sku) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const quantity = hash % 28;
  return quantity < 3 ? 0 : quantity;
}

const toPaise = (inr: number) => inr * 100;

async function insertUser(
  client: PoolClient,
  account: (typeof DEV_ACCOUNTS)[keyof typeof DEV_ACCOUNTS],
  role: 'USER' | 'ADMIN',
) {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [account.name, account.email, await hashPassword(account.password), role],
  );
  return rows[0]!.id;
}

export interface SeedSummary {
  categories: number;
  products: number;
  variants: number;
  images: number;
  users: number;
}

/** Seeds an EMPTY database. Refuses to run if data already exists (use db:reset). */
export async function seed(pool: Pool): Promise<SeedSummary> {
  const categories = await loadJson('categories.json', categorySeedSchema);
  const products = await loadJson('products.json', productSeedSchema);

  return withTransaction(async (client) => {
    const { rows: existing } = await client.query<{ count: number }>(
      'SELECT count(*) AS count FROM users',
    );
    if (existing[0]!.count > 0) {
      throw new Error('Database already contains data. Run `npm run db:reset` to start fresh.');
    }

    // Categories
    const categoryIds = new Map<string, string>();
    for (const [index, c] of categories.entries()) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO categories (name, slug, description, image_url, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [c.name, c.slug, c.description, c.imageUrl, index],
      );
      categoryIds.set(c.slug, rows[0]!.id);
    }

    // Products → variants → inventory
    let variantCount = 0;
    // Stagger creation dates (first product = newest) so "Newest" sorting is meaningful.
    for (const [productIndex, p] of products.entries()) {
      const categoryId = categoryIds.get(p.category);
      if (!categoryId)
        throw new Error(`Product ${p.slug} references unknown category ${p.category}`);

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO products
           (category_id, name, slug, description, material, gender, color, colorway, tags,
            price_paise, compare_at_price_paise, status, is_featured, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                 now() - make_interval(days => $14))
         RETURNING id`,
        [
          categoryId,
          p.name,
          p.slug,
          p.description,
          p.material,
          p.gender,
          p.color,
          p.colorway,
          p.tags,
          toPaise(p.priceInr),
          p.compareAtPriceInr === null ? null : toPaise(p.compareAtPriceInr),
          p.status,
          p.featured,
          productIndex * 3,
        ],
      );
      const productId = rows[0]!.id;

      for (const [index, url] of p.images.entries()) {
        await client.query(
          `INSERT INTO product_images (product_id, url, alt_text, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [productId, url, `${p.name} in ${p.colorway}, view ${index + 1}`, index],
        );
      }

      const sizes = p.gender === 'WOMEN' ? SIZE_RUNS.WOMEN : SIZE_RUNS.default;
      for (const [index, size] of sizes.entries()) {
        const sku = `VELO-${p.skuCode}-${String(size).padStart(2, '0')}`;
        const { rows: variantRows } = await client.query<{ id: string }>(
          `INSERT INTO product_variants (product_id, size_label, sort_order, sku)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [productId, `UK ${size}`, index, sku],
        );
        await client.query('INSERT INTO inventory (variant_id, quantity) VALUES ($1, $2)', [
          variantRows[0]!.id,
          stockForSku(sku),
        ]);
        variantCount++;
      }
    }

    // Development accounts
    await insertUser(client, DEV_ACCOUNTS.admin, 'ADMIN');
    const userId = await insertUser(client, DEV_ACCOUNTS.user, 'USER');
    await client.query(
      `INSERT INTO addresses
         (user_id, full_name, phone, line1, line2, city, state, postal_code, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [
        userId,
        'Demo Customer',
        '+91 90000 00000',
        '221 Example Residency, 4th Cross',
        'Indiranagar',
        'Bengaluru',
        'Karnataka',
        '560038',
      ],
    );

    return {
      categories: categories.length,
      products: products.length,
      variants: variantCount,
      images: products.reduce((n, p) => n + p.images.length, 0),
      users: 2,
    };
  }, pool);
}
