import { randomUUID } from 'node:crypto';
import type request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { seed } from '../src/db/seed.js';
import { truncateAll } from './helpers/db.js';
import { signedInShopper } from './helpers/users.js';

const app = createApp();
const api = '/api/v1';

interface Variant {
  id: string;
  price: number;
  productId: string;
}

let plenty: Variant; // Street Core Chalk White (₹3,999), plenty of stock
let slide: Variant; // Drift Slide (₹1,499)

async function stockOf(variantId: string) {
  const { rows } = await pool.query<{ quantity: number }>(
    'SELECT quantity FROM inventory WHERE variant_id = $1',
    [variantId],
  );
  return rows[0]!.quantity;
}

async function setStock(variantId: string, quantity: number) {
  await pool.query('UPDATE inventory SET quantity = $2 WHERE variant_id = $1', [
    variantId,
    quantity,
  ]);
}

async function variant(where: string): Promise<Variant> {
  const { rows } = await pool.query<Variant>(
    `SELECT v.id, p.price_paise AS price, p.id AS "productId"
     FROM product_variants v JOIN products p ON p.id = v.product_id
     JOIN inventory i ON i.variant_id = v.id
     WHERE ${where} ORDER BY i.quantity DESC, v.sku LIMIT 1`,
  );
  return rows[0]!;
}

/** New customer with one saved address. */
async function shopper() {
  const agent = await signedInShopper(app, 'Order Tester');
  const address = (
    await agent.post(`${api}/users/me/addresses`).send({
      fullName: 'Order Tester',
      phone: '9876543210',
      line1: '1 Test Street',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
    })
  ).body.data;
  return { agent, addressId: address.id as string };
}

function place(agent: request.Agent, addressId: string, extra: Record<string, unknown> = {}) {
  return agent.post(`${api}/orders`).send({
    addressId,
    idempotencyKey: randomUUID(),
    paymentMethod: 'MOCK_CARD',
    ...extra,
  });
}

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
  plenty = await variant(`p.slug = 'velo-street-core-chalk-white' AND i.quantity >= 5`);
  slide = await variant(`p.slug = 'velo-drift-slide-onyx-black' AND i.quantity >= 10`);
});

describe('POST /orders', () => {
  it('places an order: server totals, snapshots, stock decremented, bag cleared', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 2 }).expect(200);
    const before = await stockOf(plenty.id);

    const res = await place(agent, addressId, { expectedTotalPaise: plenty.price * 2 });
    expect(res.status).toBe(201);
    const order = res.body.data;

    expect(order.orderNumber).toMatch(/^VELO-\d{4}-\d{6}$/);
    expect(order).toMatchObject({
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentMethod: 'MOCK_CARD',
      subtotalPaise: plenty.price * 2,
      shippingPaise: 0,
      totalPaise: plenty.price * 2,
      itemCount: 2,
      canCancel: true,
    });
    expect(order.items[0]).toMatchObject({
      productName: 'VELO Street Core',
      colorway: 'Chalk White',
      unitPricePaise: plenty.price,
      quantity: 2,
      lineTotalPaise: plenty.price * 2,
    });
    expect(order.shippingAddress).toMatchObject({
      city: 'Pune',
      postalCode: '411001',
      phone: '+91 9876543210',
    });

    expect(await stockOf(plenty.id)).toBe(before - 2);
    expect((await agent.get(`${api}/cart`)).body.data.items).toEqual([]);
  });

  it('charges ₹99 shipping below ₹2,999', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: slide.id, quantity: 1 }).expect(200);
    const order = (await place(agent, addressId)).body.data;
    expect(order).toMatchObject({ subtotalPaise: 149900, shippingPaise: 9900, totalPaise: 159800 });
  });

  it('keeps the historical price when the catalogue price changes later', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: slide.id, quantity: 1 }).expect(200);
    const order = (await place(agent, addressId)).body.data;

    await pool.query('UPDATE products SET price_paise = 999900, name = $2 WHERE id = $1', [
      slide.productId,
      'Renamed Slide',
    ]);
    try {
      const again = (await agent.get(`${api}/orders/${order.orderNumber}`)).body.data;
      expect(again.items[0]).toMatchObject({
        productName: 'VELO Drift Slide',
        unitPricePaise: 149900,
      });
      expect(again.totalPaise).toBe(159800);
    } finally {
      await pool.query('UPDATE products SET price_paise = $2, name = $3 WHERE id = $1', [
        slide.productId,
        slide.price,
        'VELO Drift Slide',
      ]);
    }
  });

  it('is idempotent: replaying the same key returns the same order and deducts stock once', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 1 }).expect(200);
    const before = await stockOf(plenty.id);
    const body = { addressId, idempotencyKey: randomUUID(), paymentMethod: 'MOCK_UPI' };

    const first = await agent.post(`${api}/orders`).send(body);
    const second = await agent.post(`${api}/orders`).send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.orderNumber).toBe(first.body.data.orderNumber);
    expect(await stockOf(plenty.id)).toBe(before - 1);
    expect((await agent.get(`${api}/orders`)).body.meta.total).toBe(1);
  });

  it('handles two simultaneous submits with the same key as one order', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 1 }).expect(200);
    const body = { addressId, idempotencyKey: randomUUID(), paymentMethod: 'MOCK_CARD' };
    const [a, b] = await Promise.all([
      agent.post(`${api}/orders`).send(body),
      agent.post(`${api}/orders`).send(body),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data.orderNumber).toBe(b.body.data.orderNumber);
  });

  it('sells the last unit to only one of two customers', async () => {
    const buyerA = await shopper();
    const buyerB = await shopper();
    const original = await stockOf(slide.id);
    await buyerA.agent
      .post(`${api}/cart/items`)
      .send({ variantId: slide.id, quantity: 1 })
      .expect(200);
    await buyerB.agent
      .post(`${api}/cart/items`)
      .send({ variantId: slide.id, quantity: 1 })
      .expect(200);
    await setStock(slide.id, 1);

    try {
      const results = await Promise.all([
        place(buyerA.agent, buyerA.addressId),
        place(buyerB.agent, buyerB.addressId),
      ]);
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)!.body.error.code).toBe('CART_HAS_ISSUES');
      expect(await stockOf(slide.id)).toBe(0);
    } finally {
      await setStock(slide.id, original);
    }
  });

  it('rejects an empty bag', async () => {
    const { agent, addressId } = await shopper();
    const res = await place(agent, addressId);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_EMPTY');
  });

  it('rejects a bag with stock issues and changes nothing', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 3 }).expect(200);
    const original = await stockOf(plenty.id);
    await setStock(plenty.id, 2);
    try {
      const res = await place(agent, addressId);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({ code: 'CART_HAS_ISSUES' });
      expect(res.body.error.details.items[0]).toMatchObject({
        issue: 'insufficient_stock',
        maxQuantity: 2,
      });
      expect(await stockOf(plenty.id)).toBe(2);
      expect((await agent.get(`${api}/cart`)).body.data.items).toHaveLength(1);
      expect((await agent.get(`${api}/orders`)).body.meta.total).toBe(0);
    } finally {
      await setStock(plenty.id, original);
    }
  });

  it('refuses to charge a different total than the shopper saw', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: slide.id, quantity: 1 }).expect(200);
    const res = await place(agent, addressId, { expectedTotalPaise: 100 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'PRICE_CHANGED',
      details: { totalPaise: 159800 },
    });
    expect((await agent.get(`${api}/cart`)).body.data.items).toHaveLength(1);
  });

  it('simulated payment decline creates nothing', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: slide.id, quantity: 1 }).expect(200);
    const before = await stockOf(slide.id);
    const res = await place(agent, addressId, { simulateDecline: true });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PAYMENT_DECLINED');
    expect(await stockOf(slide.id)).toBe(before);
    expect((await agent.get(`${api}/cart`)).body.data.items).toHaveLength(1);
  });

  it('cash on delivery leaves payment pending', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: slide.id, quantity: 1 }).expect(200);
    const order = (await place(agent, addressId, { paymentMethod: 'COD' })).body.data;
    expect(order).toMatchObject({ paymentMethod: 'COD', paymentStatus: 'PENDING' });
  });

  it("can't ship to someone else's address", async () => {
    const { agent } = await shopper();
    const other = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: slide.id, quantity: 1 }).expect(200);
    const res = await place(agent, other.addressId);
    expect(res.status).toBe(404);
  });

  it('validates the request and ignores client-sent totals', async () => {
    const { agent } = await shopper();
    const res = await agent
      .post(`${api}/orders`)
      .send({ addressId: 'x', idempotencyKey: 'y', paymentMethod: 'BITCOIN', totalPaise: 1 });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining(['body.addressId', 'body.idempotencyKey', 'body.paymentMethod']),
    );
  });
});

describe('order history & cancellation', () => {
  it('lists only your own orders, newest first, paginated', async () => {
    const { agent, addressId } = await shopper();
    for (let i = 0; i < 3; i++) {
      await agent.post(`${api}/cart/items`).send({ variantId: slide.id, quantity: 1 }).expect(200);
      await place(agent, addressId).expect(201);
    }
    const page1 = (await agent.get(`${api}/orders?limit=2`)).body;
    expect(page1.meta).toMatchObject({ total: 3, totalPages: 2 });
    expect(page1.data[0]).toMatchObject({ itemCount: 1, totalPaise: 159800 });
    expect(page1.data[0].previewImages.length).toBe(1);

    const stranger = await shopper();
    expect((await stranger.agent.get(`${api}/orders`)).body.meta.total).toBe(0);
    expect((await stranger.agent.get(`${api}/orders/${page1.data[0].orderNumber}`)).status).toBe(
      404,
    );
  });

  it('cancels a confirmed order: restocks, refunds, and only once', async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 2 }).expect(200);
    const order = (await place(agent, addressId)).body.data;
    const afterOrder = await stockOf(plenty.id);

    const res = await agent.post(`${api}/orders/${order.orderNumber}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      canCancel: false,
    });
    expect(await stockOf(plenty.id)).toBe(afterOrder + 2);

    const again = await agent.post(`${api}/orders/${order.orderNumber}/cancel`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('NOT_CANCELLABLE');
    expect(await stockOf(plenty.id)).toBe(afterOrder + 2);
  });

  it("can't cancel once processing, or someone else's order", async () => {
    const { agent, addressId } = await shopper();
    await agent.post(`${api}/cart/items`).send({ variantId: slide.id, quantity: 1 }).expect(200);
    const order = (await place(agent, addressId)).body.data;

    const stranger = await shopper();
    expect((await stranger.agent.post(`${api}/orders/${order.orderNumber}/cancel`)).status).toBe(
      404,
    );

    await pool.query(`UPDATE orders SET status = 'PROCESSING' WHERE order_number = $1`, [
      order.orderNumber,
    ]);
    const res = await agent.post(`${api}/orders/${order.orderNumber}/cancel`);
    expect(res.status).toBe(409);
  });

  it('rejects malformed order numbers', async () => {
    const { agent } = await shopper();
    expect((await agent.get(`${api}/orders/abc`)).status).toBe(400);
  });
});
