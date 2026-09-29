import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { DEV_ACCOUNTS, seed } from '../src/db/seed.js';
import { truncateAll } from './helpers/db.js';
import { signedInShopper } from './helpers/users.js';

const app = createApp();
const api = '/api/v1/admin';

let admin: request.Agent;
let categoryId: string;

async function adminAgent() {
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/login')
    .send({ email: DEV_ACCOUNTS.admin.email, password: DEV_ACCOUNTS.admin.password })
    .expect(200);
  return agent;
}

const newProduct = (overrides: Record<string, unknown> = {}) => ({
  categoryId,
  name: 'VELO Test Runner',
  colorway: `Test ${randomUUID().slice(0, 6)}`,
  color: 'white',
  gender: 'UNISEX',
  description: 'A test product used by the admin suite to check create and update flows.',
  material: 'Mesh',
  tags: ['running', 'test'],
  pricePaise: 499900,
  images: [
    { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', altText: 'Test shoe' },
  ],
  variants: [
    { sizeLabel: 'UK 8', sku: `TST-${randomUUID().slice(0, 8)}`, quantity: 10 },
    {
      sizeLabel: 'UK 9',
      sku: `TST-${randomUUID().slice(0, 8)}`,
      quantity: 2,
      lowStockThreshold: 3,
    },
  ],
  ...overrides,
});

/** Places a real order as a fresh customer and returns its number. */
async function placeOrder(paymentMethod = 'MOCK_CARD') {
  const customer = await signedInShopper(app);
  const { rows } = await pool.query<{ id: string }>(
    `SELECT v.id FROM product_variants v JOIN inventory i ON i.variant_id = v.id
     JOIN products p ON p.id = v.product_id
     WHERE p.status = 'ACTIVE' AND i.quantity >= 5 ORDER BY v.sku LIMIT 1`,
  );
  await customer
    .post('/api/v1/cart/items')
    .send({ variantId: rows[0]!.id, quantity: 1 })
    .expect(200);
  const address = (
    await customer.post('/api/v1/users/me/addresses').send({
      fullName: 'Admin Test',
      phone: '9876543210',
      line1: '1 Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
    })
  ).body.data;
  const order = await customer
    .post('/api/v1/orders')
    .send({ addressId: address.id, idempotencyKey: randomUUID(), paymentMethod })
    .expect(201);
  return { orderNumber: order.body.data.orderNumber as string, variantId: rows[0]!.id, customer };
}

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
  admin = await adminAgent();
  categoryId = (await pool.query(`SELECT id FROM categories WHERE slug = 'running'`)).rows[0].id;
});

describe('access control', () => {
  const endpoints: Array<[string, string]> = [
    ['get', '/stats'],
    ['get', '/products'],
    ['post', '/products'],
    ['get', '/categories'],
    ['get', '/inventory'],
    ['get', '/orders'],
    ['get', '/users'],
  ];

  it.each(endpoints)('%s %s → 401 signed out, 403 for customers', async (method, path) => {
    const anon = await (request(app) as unknown as Record<string, (p: string) => request.Test>)[
      method
    ]!(`${api}${path}`);
    expect(anon.status).toBe(401);

    const customer = await signedInShopper(app);
    const res = await (customer as unknown as Record<string, (p: string) => request.Test>)[method]!(
      `${api}${path}`,
    );
    expect(res.status).toBe(403);
  });
});

describe('dashboard', () => {
  it('reports revenue excluding cancelled orders, counts and low stock', async () => {
    const before = (await admin.get(`${api}/stats`)).body.data;
    const { orderNumber } = await placeOrder();
    const after = (await admin.get(`${api}/stats`)).body.data;

    expect(after.orderCount).toBe(before.orderCount + 1);
    expect(after.revenuePaise).toBeGreaterThan(before.revenuePaise);
    expect(after.revenueByDay).toHaveLength(14);
    expect(after.revenueByDay.at(-1).orders).toBeGreaterThanOrEqual(1);
    expect(after.products).toMatchObject({ active: 19, draft: 1 });
    expect(after.lowStock.total).toBeGreaterThan(0);
    expect(after.recentOrders[0].orderNumber).toBe(orderNumber);

    await admin
      .patch(`${api}/orders/${orderNumber}/status`)
      .send({ status: 'CANCELLED' })
      .expect(200);
    const cancelled = (await admin.get(`${api}/stats`)).body.data;
    expect(cancelled.revenuePaise).toBe(before.revenuePaise);
  });
});

describe('products', () => {
  it('lists all statuses (including drafts) with stock summaries', async () => {
    const res = await admin.get(`${api}/products?limit=48`);
    expect(res.body.meta.total).toBe(20);
    const draft = res.body.data.find((p: { status: string }) => p.status === 'DRAFT');
    expect(draft).toBeDefined();
    expect(draft).toHaveProperty('totalStock');
    expect((await admin.get(`${api}/products?status=DRAFT`)).body.meta.total).toBe(1);
    expect((await admin.get(`${api}/products?q=aero`)).body.meta.total).toBe(2);
  });

  it('creates a draft product with images and sizes, auto-generating the slug', async () => {
    const input = newProduct();
    const res = await admin.post(`${api}/products`).send(input);
    expect(res.status).toBe(201);
    const p = res.body.data;
    expect(p).toMatchObject({ status: 'DRAFT', pricePaise: 499900, canDelete: true });
    expect(p.slug).toBe(`velo-test-runner-${input.colorway.toLowerCase().replace(' ', '-')}`);
    expect(p.images).toHaveLength(1);
    expect(p.variants.map((v: { quantity: number }) => v.quantity)).toEqual([10, 2]);

    // Drafts are invisible in the storefront until activated
    expect((await request(app).get(`/api/v1/products/${p.slug}`)).status).toBe(404);
    await admin.patch(`${api}/products/${p.id}`).send({ status: 'ACTIVE' }).expect(200);
    expect((await request(app).get(`/api/v1/products/${p.slug}`)).status).toBe(200);
  });

  it('validates input, including price rules and https images', async () => {
    const res = await admin.post(`${api}/products`).send(
      newProduct({
        name: '',
        color: 'Bright White',
        pricePaise: 50,
        compareAtPricePaise: 10,
        images: [{ url: 'http://insecure.example/x.jpg', altText: 'x' }],
      }),
    );
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining(['body.name', 'body.color', 'body.pricePaise', 'body.images.0.url']),
    );
  });

  it('rejects compare-at prices not above the price, even on partial updates', async () => {
    const p = (await admin.post(`${api}/products`).send(newProduct())).body.data;
    const res = await admin.patch(`${api}/products/${p.id}`).send({ compareAtPricePaise: 100000 });
    expect(res.status).toBe(400);
  });

  it('reports duplicate slugs and SKUs as conflicts', async () => {
    const first = (await admin.post(`${api}/products`).send(newProduct())).body.data;
    const dupSlug = await admin.post(`${api}/products`).send(newProduct({ slug: first.slug }));
    expect(dupSlug.status).toBe(409);
    expect(dupSlug.body.error.message).toMatch(/slug/);

    const dupSku = await admin
      .post(`${api}/products/${first.id}/variants`)
      .send({ sizeLabel: 'UK 10', sku: first.variants[0].sku, quantity: 1 });
    expect(dupSku.status).toBe(409);
    expect(dupSku.body.error.message).toMatch(/SKU/);
  });

  it('manages sizes: add, update, deactivate, delete', async () => {
    const p = (await admin.post(`${api}/products`).send(newProduct())).body.data;
    const added = await admin
      .post(`${api}/products/${p.id}/variants`)
      .send({ sizeLabel: 'UK 10', sku: `TST-${randomUUID().slice(0, 8)}`, quantity: 4 });
    expect(added.status).toBe(201);
    const v = added.body.data.variants.find((x: { sizeLabel: string }) => x.sizeLabel === 'UK 10');
    expect(v.sortOrder).toBe(2);

    const updated = await admin
      .patch(`${api}/variants/${v.id}`)
      .send({ isActive: false, priceOverridePaise: 519900 });
    const after = updated.body.data.variants.find((x: { id: string }) => x.id === v.id);
    expect(after).toMatchObject({ isActive: false, priceOverridePaise: 519900 });

    const removed = await admin.delete(`${api}/variants/${v.id}`);
    expect(removed.body.data.variants).toHaveLength(2);
  });

  it('replaces the image list in order', async () => {
    const p = (await admin.post(`${api}/products`).send(newProduct())).body.data;
    const res = await admin.put(`${api}/products/${p.id}/images`).send({
      images: [
        { url: 'https://images.unsplash.com/photo-b', altText: 'Second first' },
        { url: 'https://images.unsplash.com/photo-a', altText: 'Now second' },
      ],
    });
    expect(res.body.data.images.map((i: { altText: string }) => i.altText)).toEqual([
      'Second first',
      'Now second',
    ]);
  });

  it('deletes never-ordered products but only archives ordered ones', async () => {
    const fresh = (await admin.post(`${api}/products`).send(newProduct())).body.data;
    expect((await admin.delete(`${api}/products/${fresh.id}`)).status).toBe(204);
    expect((await admin.get(`${api}/products/${fresh.id}`)).status).toBe(404);

    const { variantId } = await placeOrder();
    const productId = (
      await pool.query(`SELECT product_id FROM product_variants WHERE id = $1`, [variantId])
    ).rows[0].product_id;
    const res = await admin.delete(`${api}/products/${productId}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PRODUCT_HAS_ORDERS');
    expect((await admin.delete(`${api}/variants/${variantId}`)).body.error.code).toBe(
      'VARIANT_HAS_ORDERS',
    );
  });
});

describe('categories', () => {
  it('creates, updates and hides categories; refuses to delete non-empty ones', async () => {
    const created = await admin.post(`${api}/categories`).send({ name: 'Trail Running' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      slug: 'trail-running',
      productCount: 0,
      isActive: true,
    });

    const hidden = await admin
      .patch(`${api}/categories/${created.body.data.id}`)
      .send({ isActive: false });
    expect(hidden.body.data.isActive).toBe(false);
    expect(
      (await request(app).get('/api/v1/categories')).body.data.map((c: { slug: string }) => c.slug),
    ).not.toContain('trail-running');

    expect((await admin.delete(`${api}/categories/${created.body.data.id}`)).status).toBe(204);

    const busy = await admin.delete(`${api}/categories/${categoryId}`);
    expect(busy.status).toBe(409);
    expect(busy.body.error.code).toBe('CATEGORY_NOT_EMPTY');

    const dup = await admin.post(`${api}/categories`).send({ name: 'Running' });
    expect(dup.status).toBe(409);
  });
});

describe('inventory', () => {
  it('filters low / out of stock and sets absolute quantities', async () => {
    const out = (await admin.get(`${api}/inventory?filter=out&limit=100`)).body;
    expect(out.data.length).toBeGreaterThan(0);
    expect(out.data.every((r: { quantity: number }) => r.quantity === 0)).toBe(true);

    const low = (await admin.get(`${api}/inventory?filter=low&limit=100`)).body.data;
    expect(
      low.every(
        (r: { quantity: number; lowStockThreshold: number }) =>
          r.quantity > 0 && r.quantity <= r.lowStockThreshold,
      ),
    ).toBe(true);

    const target = out.data[0];
    const res = await admin
      .patch(`${api}/inventory/${target.variantId}`)
      .send({ quantity: 25, lowStockThreshold: 4 });
    expect(res.body.data).toMatchObject({ quantity: 25, lowStockThreshold: 4 });

    expect(
      (await admin.patch(`${api}/inventory/${target.variantId}`).send({ quantity: -1 })).status,
    ).toBe(400);
    expect((await admin.patch(`${api}/inventory/${target.variantId}`).send({})).status).toBe(400);
  });
});

describe('orders', () => {
  it('lists and searches all customers’ orders', async () => {
    const { orderNumber } = await placeOrder();
    const res = await admin.get(`${api}/orders?q=${orderNumber}`);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0]).toMatchObject({ orderNumber, status: 'CONFIRMED' });
    expect(res.body.data[0].customer.email).toMatch(/@example\.test$/);
  });

  it('moves an order through its lifecycle and blocks invalid transitions', async () => {
    const { orderNumber, customer } = await placeOrder('COD');
    const detail = (await admin.get(`${api}/orders/${orderNumber}`)).body.data;
    expect(detail.allowedTransitions).toEqual(['PROCESSING', 'CANCELLED']);

    const skip = await admin
      .patch(`${api}/orders/${orderNumber}/status`)
      .send({ status: 'DELIVERED' });
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe('INVALID_TRANSITION');

    for (const status of ['PROCESSING', 'SHIPPED', 'DELIVERED']) {
      await admin.patch(`${api}/orders/${orderNumber}/status`).send({ status }).expect(200);
    }
    const delivered = (await admin.get(`${api}/orders/${orderNumber}`)).body.data;
    expect(delivered).toMatchObject({
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      allowedTransitions: [],
    });

    // The customer sees the new status and can no longer cancel.
    const mine = (await customer.get(`/api/v1/orders/${orderNumber}`)).body.data;
    expect(mine).toMatchObject({ status: 'DELIVERED', canCancel: false });
  });

  it('admin cancellation restocks and refunds', async () => {
    const { orderNumber, variantId } = await placeOrder();
    const stock = async () =>
      (await pool.query(`SELECT quantity FROM inventory WHERE variant_id = $1`, [variantId]))
        .rows[0].quantity;
    const before = await stock();
    await admin
      .patch(`${api}/orders/${orderNumber}/status`)
      .send({ status: 'PROCESSING' })
      .expect(200);
    const res = await admin
      .patch(`${api}/orders/${orderNumber}/status`)
      .send({ status: 'CANCELLED' });
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', paymentStatus: 'REFUNDED' });
    expect(await stock()).toBe(before + 1);
  });
});

describe('users', () => {
  it('lists users with order stats and changes roles (not your own)', async () => {
    const { customer } = await placeOrder();
    const me = (await customer.get('/api/v1/auth/me')).body.data.user;

    const list = await admin.get(`${api}/users?q=${encodeURIComponent(me.email)}`);
    expect(list.body.data[0]).toMatchObject({ id: me.id, role: 'USER', orderCount: 1 });

    await admin.patch(`${api}/users/${me.id}/role`).send({ role: 'ADMIN' }).expect(200);
    expect((await customer.get(`${api}/stats`)).status).toBe(200); // promoted immediately
    await admin.patch(`${api}/users/${me.id}/role`).send({ role: 'USER' }).expect(200);
    expect((await customer.get(`${api}/stats`)).status).toBe(403); // demoted immediately

    const adminId = (await admin.get('/api/v1/auth/me')).body.data.user.id;
    const self = await admin.patch(`${api}/users/${adminId}/role`).send({ role: 'USER' });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('CANNOT_CHANGE_OWN_ROLE');
  });
});
