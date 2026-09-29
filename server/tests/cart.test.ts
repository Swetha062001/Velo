import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { DEV_ACCOUNTS, seed } from '../src/db/seed.js';
import { computeTotals, type CartLine } from '../src/modules/cart/cart.pricing.js';
import { truncateAll } from './helpers/db.js';

const app = createApp();
const api = '/api/v1';

interface VariantRef {
  id: string;
  stock: number;
  price: number;
}

let plenty: VariantRef; // in stock with >= 8 units (Street Core Chalk White, ₹3,999)
let cheap: VariantRef; // Drift Slide, ₹1,499
let soldOut: VariantRef;
let lowStock: VariantRef; // 2–8 units, for over-stock checks
let draftVariant: VariantRef; // belongs to the DRAFT product

async function findVariant(where: string, params: unknown[] = []): Promise<VariantRef> {
  const { rows } = await pool.query<VariantRef>(
    `SELECT v.id, i.quantity AS stock, COALESCE(v.price_override_paise, p.price_paise) AS price
     FROM product_variants v JOIN products p ON p.id = v.product_id
     JOIN inventory i ON i.variant_id = v.id
     WHERE ${where} ORDER BY i.quantity DESC, v.sku LIMIT 1`,
    params,
  );
  if (!rows[0]) throw new Error(`No variant for ${where}`);
  return rows[0];
}

async function signIn(email: string, password: string) {
  const agent = request.agent(app);
  await agent.post(`${api}/auth/login`).send({ email, password }).expect(200);
  return agent;
}

async function newShopper() {
  const agent = request.agent(app);
  await agent
    .post(`${api}/auth/register`)
    .send({
      name: 'Cart Tester',
      email: `cart.${Date.now()}.${Math.random()}@example.test`,
      password: 'runFast42',
    })
    .expect(201);
  return agent;
}

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
  plenty = await findVariant(`p.slug = 'velo-street-core-chalk-white' AND i.quantity >= 8`);
  cheap = await findVariant(`p.slug = 'velo-drift-slide-onyx-black' AND i.quantity >= 3`);
  soldOut = await findVariant(`p.status = 'ACTIVE' AND i.quantity = 0`);
  lowStock = await findVariant(`p.status = 'ACTIVE' AND i.quantity BETWEEN 2 AND 8`);
  draftVariant = await findVariant(`p.status = 'DRAFT' AND i.quantity > 0`);
});

describe('POST /cart/quote (guest)', () => {
  it('prices lines from the database and ignores client-sent prices', async () => {
    const res = await request(app)
      .post(`${api}/cart/quote`)
      .send({ items: [{ variantId: plenty.id, quantity: 2, unitPricePaise: 1, price: 1 }] });

    expect(res.status).toBe(200);
    const cart = res.body.data;
    expect(cart.items[0]).toMatchObject({
      variantId: plenty.id,
      unitPricePaise: plenty.price,
      quantity: 2,
      lineTotalPaise: plenty.price * 2,
      issue: null,
    });
    expect(cart.subtotalPaise).toBe(plenty.price * 2);
    expect(cart.totalPaise).toBe(cart.subtotalPaise + cart.shippingPaise);
  });

  it('charges ₹99 shipping below ₹2,999 and ships free at or above it', async () => {
    const small = (
      await request(app)
        .post(`${api}/cart/quote`)
        .send({ items: [{ variantId: cheap.id, quantity: 1 }] })
    ).body.data;
    expect(small.subtotalPaise).toBe(149900);
    expect(small.shippingPaise).toBe(9900);
    expect(small.totalPaise).toBe(159800);
    expect(small.amountToFreeShippingPaise).toBe(299900 - 149900);

    const two = (
      await request(app)
        .post(`${api}/cart/quote`)
        .send({ items: [{ variantId: cheap.id, quantity: 2 }] })
    ).body.data;
    expect(two.subtotalPaise).toBe(299800);
    expect(two.shippingPaise).toBe(9900); // ₹2,998 — still below

    const big = (
      await request(app)
        .post(`${api}/cart/quote`)
        .send({ items: [{ variantId: plenty.id, quantity: 1 }] })
    ).body.data;
    expect(big.shippingPaise).toBe(0);
  });

  it('flags sold-out, unavailable and over-stock lines and excludes them from totals', async () => {
    const res = await request(app)
      .post(`${api}/cart/quote`)
      .send({
        items: [
          { variantId: soldOut.id, quantity: 1 },
          { variantId: draftVariant.id, quantity: 1 },
          { variantId: lowStock.id, quantity: lowStock.stock + 1 },
        ],
      });
    const cart = res.body.data;
    const issues = Object.fromEntries(cart.items.map((l: CartLine) => [l.variantId, l.issue]));
    expect(issues[soldOut.id]).toBe('out_of_stock');
    expect(issues[draftVariant.id]).toBe('unavailable');
    expect(issues[lowStock.id]).toBe('insufficient_stock');
    expect(cart.hasIssues).toBe(true);
    expect(cart.subtotalPaise).toBe(0);
  });

  it('merges duplicate variants and reports unknown variant ids', async () => {
    const unknown = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .post(`${api}/cart/quote`)
      .send({
        items: [
          { variantId: plenty.id, quantity: 1 },
          { variantId: plenty.id, quantity: 2 },
          { variantId: unknown, quantity: 1 },
        ],
      });
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(3);
    expect(res.body.data.unavailableVariantIds).toEqual([unknown]);
  });

  it('validates quantities and ids', async () => {
    const res = await request(app)
      .post(`${api}/cart/quote`)
      .send({
        items: [
          { variantId: 'nope', quantity: 11 },
          { variantId: plenty.id, quantity: 0 },
        ],
      });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'body.items.0.variantId',
        'body.items.0.quantity',
        'body.items.1.quantity',
      ]),
    );
  });
});

describe('signed-in cart', () => {
  let agent: request.Agent;
  beforeEach(async () => {
    agent = await newShopper();
  });

  it('requires authentication', async () => {
    expect((await request(app).get(`${api}/cart`)).status).toBe(401);
    expect(
      (await request(app).post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 1 }))
        .status,
    ).toBe(401);
  });

  it('starts empty, then adds and increments the same size', async () => {
    const empty = (await agent.get(`${api}/cart`)).body.data;
    expect(empty).toMatchObject({
      items: [],
      itemCount: 0,
      subtotalPaise: 0,
      shippingPaise: 0,
      totalPaise: 0,
    });

    await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 1 }).expect(200);
    const res = await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(3);
    expect(res.body.data.itemCount).toBe(3);
    expect(res.body.data.subtotalPaise).toBe(plenty.price * 3);
  });

  it('rejects sold-out, unavailable, unknown and over-stock additions', async () => {
    const out = await agent.post(`${api}/cart/items`).send({ variantId: soldOut.id, quantity: 1 });
    expect(out.status).toBe(409);
    expect(out.body.error.code).toBe('OUT_OF_STOCK');

    const draft = await agent
      .post(`${api}/cart/items`)
      .send({ variantId: draftVariant.id, quantity: 1 });
    expect(draft.body.error.code).toBe('UNAVAILABLE');

    const unknown = await agent
      .post(`${api}/cart/items`)
      .send({ variantId: '00000000-0000-4000-8000-000000000000', quantity: 1 });
    expect(unknown.status).toBe(404);

    const tooMany = await agent
      .post(`${api}/cart/items`)
      .send({ variantId: lowStock.id, quantity: lowStock.stock + 1 });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      details: { available: lowStock.stock },
    });
  });

  it('enforces the 10-per-item cap across repeated adds', async () => {
    const variant = await findVariant(`p.status = 'ACTIVE' AND i.quantity >= 11`);
    await agent.post(`${api}/cart/items`).send({ variantId: variant.id, quantity: 8 }).expect(200);
    const res = await agent.post(`${api}/cart/items`).send({ variantId: variant.id, quantity: 3 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUANTITY_LIMIT');
  });

  it('updates quantity, removes and clears', async () => {
    const added = (
      await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 1 })
    ).body.data;
    const itemId = added.items[0].id;

    const updated = await agent.patch(`${api}/cart/items/${itemId}`).send({ quantity: 4 });
    expect(updated.body.data.items[0].quantity).toBe(4);

    await agent.post(`${api}/cart/items`).send({ variantId: cheap.id, quantity: 1 }).expect(200);
    const removed = await agent.delete(`${api}/cart/items/${itemId}`);
    expect(removed.body.data.items.map((l: CartLine) => l.variantId)).toEqual([cheap.id]);

    const cleared = await agent.delete(`${api}/cart`);
    expect(cleared.body.data.items).toEqual([]);
  });

  it("can't touch another user's cart items", async () => {
    const mine = (await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 1 }))
      .body.data;
    const itemId = mine.items[0].id;

    const intruder = await newShopper();
    expect((await intruder.patch(`${api}/cart/items/${itemId}`).send({ quantity: 2 })).status).toBe(
      404,
    );
    expect((await intruder.delete(`${api}/cart/items/${itemId}`)).status).toBe(404);
    expect((await agent.get(`${api}/cart`)).body.data.items[0].quantity).toBe(1);
  });

  it('always uses the current price (carts never store prices)', async () => {
    await agent.post(`${api}/cart/items`).send({ variantId: cheap.id, quantity: 1 }).expect(200);
    await pool.query(
      `UPDATE products SET price_paise = 129900 WHERE id = (SELECT product_id FROM product_variants WHERE id = $1)`,
      [cheap.id],
    );
    try {
      expect((await agent.get(`${api}/cart`)).body.data.items[0].unitPricePaise).toBe(129900);
    } finally {
      await pool.query(
        `UPDATE products SET price_paise = $2 WHERE id = (SELECT product_id FROM product_variants WHERE id = $1)`,
        [cheap.id, cheap.price],
      );
    }
  });

  it('flags a line when its stock drops below the quantity in the bag', async () => {
    await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 3 }).expect(200);
    await pool.query('UPDATE inventory SET quantity = 1 WHERE variant_id = $1', [plenty.id]);
    try {
      const cart = (await agent.get(`${api}/cart`)).body.data;
      expect(cart.items[0]).toMatchObject({ issue: 'insufficient_stock', maxQuantity: 1 });
      expect(cart.subtotalPaise).toBe(0);
    } finally {
      await pool.query('UPDATE inventory SET quantity = $2 WHERE variant_id = $1', [
        plenty.id,
        plenty.stock,
      ]);
    }
  });
});

describe('POST /cart/merge', () => {
  it('combines guest items with the saved cart, clamped to stock, skipping unavailable', async () => {
    const agent = await signIn(DEV_ACCOUNTS.user.email, DEV_ACCOUNTS.user.password);
    await agent.delete(`${api}/cart`);
    await agent.post(`${api}/cart/items`).send({ variantId: plenty.id, quantity: 2 }).expect(200);

    const res = await agent.post(`${api}/cart/merge`).send({
      items: [
        { variantId: plenty.id, quantity: 3 },
        { variantId: cheap.id, quantity: 10 },
        { variantId: soldOut.id, quantity: 1 },
        { variantId: draftVariant.id, quantity: 1 },
      ],
    });
    expect(res.status).toBe(200);
    const byVariant = Object.fromEntries(
      res.body.data.items.map((l: CartLine) => [l.variantId, l.quantity]),
    );
    expect(byVariant[plenty.id]).toBe(Math.min(5, plenty.stock));
    expect(byVariant[cheap.id]).toBe(Math.min(10, cheap.stock));
    expect(byVariant[soldOut.id]).toBeUndefined();
    expect(byVariant[draftVariant.id]).toBeUndefined();
    expect(res.body.data.hasIssues).toBe(false);
  });
});

describe('computeTotals', () => {
  const line = (price: number, qty: number, issue: CartLine['issue'] = null) =>
    ({ unitPricePaise: price, quantity: qty, lineTotalPaise: price * qty, issue }) as CartLine;

  it('is zero for an empty cart (no shipping charged)', () => {
    expect(computeTotals([])).toMatchObject({ subtotalPaise: 0, shippingPaise: 0, totalPaise: 0 });
  });

  it('applies free shipping exactly at the threshold', () => {
    expect(computeTotals([line(299900, 1)]).shippingPaise).toBe(0);
    expect(computeTotals([line(299899, 1)]).shippingPaise).toBe(9900);
  });

  it('ignores lines with issues', () => {
    const totals = computeTotals([line(100000, 1), line(500000, 1, 'out_of_stock')]);
    expect(totals.subtotalPaise).toBe(100000);
    expect(totals.itemCount).toBe(2);
    expect(totals.hasIssues).toBe(true);
  });
});
