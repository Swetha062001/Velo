import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { seed } from '../src/db/seed.js';
import { truncateAll } from './helpers/db.js';

const app = createApp();
const api = '/api/v1';

let product: { id: string; slug: string };
let otherProduct: { id: string };
let draftProduct: { id: string };
let inStockVariant: string; // belongs to `product`
let soldOutVariant: { id: string; productId: string };
let foreignVariant: string; // belongs to `otherProduct`

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await pool.query(sql, params);
  if (!rows[0]) throw new Error(`No row for: ${sql}`);
  return rows[0] as T;
}

async function newShopper() {
  const agent = request.agent(app);
  await agent
    .post(`${api}/auth/register`)
    .send({
      name: 'Wish Tester',
      email: `wish.${Date.now()}.${Math.random()}@example.test`,
      password: 'runFast42',
    })
    .expect(201);
  return agent;
}

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
  product = await one(`SELECT id, slug FROM products WHERE slug = 'velo-street-core-chalk-white'`);
  otherProduct = await one(`SELECT id FROM products WHERE slug = 'velo-drift-slide-onyx-black'`);
  draftProduct = await one(`SELECT id FROM products WHERE status = 'DRAFT' LIMIT 1`);
  inStockVariant = (
    await one<{ id: string }>(
      `SELECT v.id FROM product_variants v JOIN inventory i ON i.variant_id = v.id
       WHERE v.product_id = $1 AND i.quantity > 0 ORDER BY v.sort_order LIMIT 1`,
      [product.id],
    )
  ).id;
  soldOutVariant = await one(
    `SELECT v.id, v.product_id AS "productId" FROM product_variants v
     JOIN inventory i ON i.variant_id = v.id JOIN products p ON p.id = v.product_id
     WHERE i.quantity = 0 AND p.status = 'ACTIVE' LIMIT 1`,
  );
  foreignVariant = (
    await one<{ id: string }>(`SELECT id FROM product_variants WHERE product_id = $1 LIMIT 1`, [
      otherProduct.id,
    ])
  ).id;
});

describe('wishlist', () => {
  let agent: request.Agent;
  beforeEach(async () => {
    agent = await newShopper();
  });

  it('requires authentication', async () => {
    expect((await request(app).get(`${api}/wishlist`)).status).toBe(401);
    expect(
      (await request(app).post(`${api}/wishlist`).send({ productId: product.id })).status,
    ).toBe(401);
  });

  it('adds products (idempotently) with summary and sizes, newest first', async () => {
    await agent.post(`${api}/wishlist`).send({ productId: product.id }).expect(200);
    await agent.post(`${api}/wishlist`).send({ productId: product.id }).expect(200); // again
    const res = await agent.post(`${api}/wishlist`).send({ productId: otherProduct.id });

    const wl = res.body.data;
    expect(wl.count).toBe(2);
    expect(wl.items.map((i: { productId: string }) => i.productId)).toEqual([
      otherProduct.id,
      product.id,
    ]);
    const saved = wl.items[1];
    expect(saved).toMatchObject({ available: true, product: { slug: product.slug } });
    expect(saved.variants.length).toBeGreaterThan(0);
    expect(saved.variants[0]).toHaveProperty('stockStatus');
    expect(JSON.stringify(wl)).not.toMatch(/"quantity"/); // no raw stock numbers
  });

  it('rejects unknown and draft products', async () => {
    const unknown = await agent
      .post(`${api}/wishlist`)
      .send({ productId: '00000000-0000-4000-8000-000000000000' });
    expect(unknown.status).toBe(404);
    expect((await agent.post(`${api}/wishlist`).send({ productId: draftProduct.id })).status).toBe(
      404,
    );
    expect((await agent.post(`${api}/wishlist`).send({ productId: 'nope' })).status).toBe(400);
  });

  it('removes idempotently', async () => {
    await agent.post(`${api}/wishlist`).send({ productId: product.id }).expect(200);
    const res = await agent.delete(`${api}/wishlist/${product.id}`);
    expect(res.body.data).toEqual({ items: [], count: 0 });
    expect((await agent.delete(`${api}/wishlist/${product.id}`)).status).toBe(200);
  });

  it('keeps a product that becomes unavailable, flagged and without sizes', async () => {
    await agent.post(`${api}/wishlist`).send({ productId: product.id }).expect(200);
    await pool.query(`UPDATE products SET status = 'ARCHIVED' WHERE id = $1`, [product.id]);
    try {
      const item = (await agent.get(`${api}/wishlist`)).body.data.items[0];
      expect(item).toMatchObject({ productId: product.id, available: false, variants: [] });
    } finally {
      await pool.query(`UPDATE products SET status = 'ACTIVE' WHERE id = $1`, [product.id]);
    }
  });

  it('is private to each user', async () => {
    await agent.post(`${api}/wishlist`).send({ productId: product.id }).expect(200);
    const other = await newShopper();
    expect((await other.get(`${api}/wishlist`)).body.data.count).toBe(0);
  });

  describe('move to bag', () => {
    it('adds the chosen size to the bag and removes it from the wishlist', async () => {
      await agent.post(`${api}/wishlist`).send({ productId: product.id }).expect(200);
      const res = await agent
        .post(`${api}/wishlist/${product.id}/move-to-cart`)
        .send({ variantId: inStockVariant });

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist.count).toBe(0);
      expect(res.body.data.cart.items).toHaveLength(1);
      expect(res.body.data.cart.items[0]).toMatchObject({ variantId: inStockVariant, quantity: 1 });
    });

    it('rejects a size from a different product', async () => {
      await agent.post(`${api}/wishlist`).send({ productId: product.id }).expect(200);
      const res = await agent
        .post(`${api}/wishlist/${product.id}/move-to-cart`)
        .send({ variantId: foreignVariant });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].path).toBe('body.variantId');
    });

    it('keeps the item in the wishlist when the size is sold out', async () => {
      await agent.post(`${api}/wishlist`).send({ productId: soldOutVariant.productId }).expect(200);
      const res = await agent
        .post(`${api}/wishlist/${soldOutVariant.productId}/move-to-cart`)
        .send({ variantId: soldOutVariant.id });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('OUT_OF_STOCK');
      expect((await agent.get(`${api}/wishlist`)).body.data.count).toBe(1);
    });

    it('404s for a product not in the wishlist', async () => {
      const res = await agent
        .post(`${api}/wishlist/${product.id}/move-to-cart`)
        .send({ variantId: inStockVariant });
      expect(res.status).toBe(404);
    });
  });
});
