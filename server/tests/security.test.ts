import { randomUUID } from 'node:crypto';
import type { Router } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { JWT_AUDIENCE, JWT_ISSUER, SESSION_COOKIE } from '../src/config/auth.js';
import { env } from '../src/config/env.js';
import { pool } from '../src/db/index.js';
import { seed } from '../src/db/seed.js';
import { addressesRouter } from '../src/modules/addresses/addresses.routes.js';
import { adminRouter } from '../src/modules/admin/admin.routes.js';
import { cartRouter } from '../src/modules/cart/cart.routes.js';
import { ordersRouter } from '../src/modules/orders/orders.routes.js';
import { usersRouter } from '../src/modules/users/users.routes.js';
import { wishlistRouter } from '../src/modules/wishlist/wishlist.routes.js';
import { truncateAll } from './helpers/db.js';
import { signedInShopper } from './helpers/users.js';

/**
 * Cross-cutting security checks. Route lists are read from the routers themselves, so an
 * endpoint added later is covered automatically.
 */

const app = createApp();
const api = '/api/v1';
type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
type Agent = ReturnType<typeof request.agent> | ReturnType<typeof request>;

const SAMPLE_PARAMS: Record<string, string> = {
  id: randomUUID(),
  itemId: randomUUID(),
  variantId: randomUUID(),
  productId: randomUUID(),
  orderNumber: 'VELO-2026-000001',
};

/** [method, path] for every route on a router, with params filled in. */
function routesOf(router: Router, mount: string): Array<[Method, string]> {
  const stack = (
    router as unknown as {
      stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }>;
    }
  ).stack;
  return stack.flatMap(({ route }) =>
    route
      ? Object.keys(route.methods).map((m): [Method, string] => [
          m as Method,
          `${mount}${route.path}`.replace(/:(\w+)/g, (_, k: string) => SAMPLE_PARAMS[k] ?? 'x'),
        ])
      : [],
  );
}

const call = (agent: Agent, method: Method, path: string) =>
  (agent as unknown as Record<Method, (p: string) => request.Test>)[method](`${api}${path}`);

const count = async (table: string) =>
  Number((await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count);

async function variantId(where = 'TRUE') {
  const { rows } = await pool.query<{ id: string; price_paise: number }>(
    `SELECT v.id, p.price_paise FROM product_variants v
     JOIN products p ON p.id = v.product_id JOIN inventory i ON i.variant_id = v.id
     WHERE p.status = 'ACTIVE' AND v.is_active AND i.quantity >= 5 AND ${where}
     ORDER BY v.sku LIMIT 1`,
  );
  return rows[0]!;
}

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
});

describe('route protection (enumerated from the routers)', () => {
  const adminRoutes = routesOf(adminRouter, '/admin');
  const customerRoutes = [
    ...routesOf(cartRouter, '/cart').filter(([, p]) => p !== '/cart/quote'), // quote is public
    ...routesOf(wishlistRouter, '/wishlist'),
    ...routesOf(ordersRouter, '/orders'),
    ...routesOf(addressesRouter, '/users/me/addresses'),
    ...routesOf(usersRouter, '/users'),
  ];

  it('found the routes to check', () => {
    expect(adminRoutes.length).toBeGreaterThanOrEqual(20);
    expect(customerRoutes.length).toBeGreaterThanOrEqual(20);
  });

  it('every admin route: 401 signed out, 403 for customers', async () => {
    const customer = await signedInShopper(app);
    const failures: string[] = [];
    for (const [method, path] of adminRoutes) {
      const anon = await call(request(app), method, path);
      const user = await call(customer, method, path);
      if (anon.status !== 401 || user.status !== 403) {
        failures.push(`${method.toUpperCase()} ${path}: ${anon.status}/${user.status}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('every customer route: 401 when signed out', async () => {
    const failures: string[] = [];
    for (const [method, path] of customerRoutes) {
      const res = await call(request(app), method, path);
      if (res.status !== 401) failures.push(`${method.toUpperCase()} ${path}: ${res.status}`);
    }
    expect(failures).toEqual([]);
  });
});

describe('one customer cannot touch another customer’s data (IDOR)', () => {
  it('cart lines', async () => {
    const alice = await signedInShopper(app, 'Alice');
    const bob = await signedInShopper(app, 'Bob');
    const { id } = await variantId();
    const cart = (await alice.post(`${api}/cart/items`).send({ variantId: id, quantity: 1 })).body
      .data;
    const lineId = cart.items[0].id as string;

    await bob.patch(`${api}/cart/items/${lineId}`).send({ quantity: 5 }).expect(404);
    await bob.delete(`${api}/cart/items/${lineId}`).expect(404);
    const after = (await alice.get(`${api}/cart`)).body.data;
    expect(after.items).toHaveLength(1);
    expect(after.items[0].quantity).toBe(1);
  });

  it('addresses', async () => {
    const alice = await signedInShopper(app, 'Alice');
    const bob = await signedInShopper(app, 'Bob');
    const address = (
      await alice.post(`${api}/users/me/addresses`).send({
        fullName: 'Alice',
        phone: '9876543210',
        line1: '1 Private Road',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
      })
    ).body.data;

    expect((await bob.get(`${api}/users/me/addresses`)).body.data).toEqual([]);
    await bob.patch(`${api}/users/me/addresses/${address.id}`).send({ city: 'Hacked' }).expect(404);
    await bob.delete(`${api}/users/me/addresses/${address.id}`).expect(404);
    const [kept] = (await alice.get(`${api}/users/me/addresses`)).body.data;
    expect(kept.city).toBe('Pune');
  });

  it('orders', async () => {
    const alice = await signedInShopper(app, 'Alice');
    const bob = await signedInShopper(app, 'Bob');
    const { id } = await variantId();
    await alice.post(`${api}/cart/items`).send({ variantId: id, quantity: 1 });
    const address = (
      await alice.post(`${api}/users/me/addresses`).send({
        fullName: 'Alice',
        phone: '9876543210',
        line1: '1 Private Road',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
      })
    ).body.data;
    const order = (
      await alice.post(`${api}/orders`).send({
        addressId: address.id,
        idempotencyKey: randomUUID(),
        paymentMethod: 'MOCK_CARD',
      })
    ).body.data;

    await bob.get(`${api}/orders/${order.orderNumber}`).expect(404);
    await bob.post(`${api}/orders/${order.orderNumber}/cancel`).expect(404);
    expect((await bob.get(`${api}/orders`)).body.data).toEqual([]);
    expect((await alice.get(`${api}/orders/${order.orderNumber}`)).body.data.status).toBe(
      'CONFIRMED',
    );
  });
});

describe('the client cannot set privileged or server-owned values', () => {
  it('profile updates cannot change role, email or password hash', async () => {
    const agent = await signedInShopper(app);
    const me = (await agent.get(`${api}/auth/me`)).body.data.user;
    await agent.patch(`${api}/users/me`).send({
      name: 'Renamed',
      role: 'ADMIN',
      email: 'admin@velo.local',
      passwordHash: 'x',
      tokenVersion: 0,
    });
    const { rows } = await pool.query('SELECT role, email FROM users WHERE id = $1', [me.id]);
    expect(rows[0]).toEqual({ role: 'USER', email: me.email });
    await agent.get(`${api}/admin/stats`).expect(403);
  });

  it('cart prices always come from the catalogue', async () => {
    const agent = await signedInShopper(app);
    const { id, price_paise } = await variantId();
    const res = await agent
      .post(`${api}/cart/items`)
      .send({ variantId: id, quantity: 2, pricePaise: 1, unitPricePaise: 1, subtotalPaise: 2 });
    // Unknown fields are either rejected or ignored — never applied.
    if (res.status === 200) {
      const [line] = res.body.data.items;
      expect(line.unitPricePaise).toBe(price_paise);
      expect(res.body.data.subtotalPaise).toBe(price_paise * 2);
    } else {
      expect(res.status).toBe(400);
    }

    const quote = await request(app)
      .post(`${api}/cart/quote`)
      .send({ items: [{ variantId: id, quantity: 1, pricePaise: 1 }] });
    if (quote.status === 200) expect(quote.body.data.items[0].unitPricePaise).toBe(price_paise);
    else expect(quote.status).toBe(400);
  });

  it('quantities outside 1–10 are rejected', async () => {
    const agent = await signedInShopper(app);
    const { id } = await variantId();
    // Numeric strings ("3") are coerced by design; anything that isn't 1–10 is rejected.
    for (const quantity of [0, -1, 11, 1.5, 1e9, 'abc', null]) {
      const res = await agent.post(`${api}/cart/items`).send({ variantId: id, quantity });
      expect(res.status, `quantity=${quantity}`).toBe(400);
    }
  });
});

describe('sessions', () => {
  const tokenFor = async (email: string, options: jwt.SignOptions & { secret?: string } = {}) => {
    const { rows } = await pool.query('SELECT id, token_version FROM users WHERE email = $1', [
      email,
    ]);
    const { secret = env.JWT_SECRET, ...rest } = options;
    return jwt.sign({ tv: rows[0].token_version }, secret, {
      algorithm: 'HS256',
      subject: rows[0].id,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: 3600,
      ...rest,
    });
  };
  const asCookie = (token: string) => `${SESSION_COOKIE}=${token}`;

  it('accepts a correctly signed token (control)', async () => {
    const token = await tokenFor('admin@velo.local');
    await request(app).get(`${api}/admin/stats`).set('Cookie', asCookie(token)).expect(200);
  });

  it.each([
    ['expired', { expiresIn: -10 }],
    ['wrong issuer', { issuer: 'someone-else' }],
    ['wrong audience', { audience: 'another-app' }],
  ] as const)('rejects a %s token', async (_label, options) => {
    const token = await tokenFor('admin@velo.local', options);
    await request(app).get(`${api}/admin/stats`).set('Cookie', asCookie(token)).expect(401);
  });

  it('rejects a token for a deleted account', async () => {
    const agent = await signedInShopper(app);
    const me = (await agent.get(`${api}/auth/me`)).body.data.user;
    await pool.query('DELETE FROM users WHERE id = $1', [me.id]);
    await agent.get(`${api}/cart`).expect(401);
  });

  it('only accepts the session from the cookie, not an Authorization header', async () => {
    const token = await tokenFor('admin@velo.local');
    await request(app)
      .get(`${api}/admin/stats`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});

describe('hostile input never causes a server error or leaks data', () => {
  const PAYLOADS = [
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    '" OR ""="',
    '1) OR (1=1',
    '%',
    '_',
    '\\',
    '<script>alert(1)</script>',
    '../../etc/passwd',
    '\u0000',
  ];

  it('catalogue query parameters and slugs', async () => {
    const before = await Promise.all(['users', 'products', 'orders'].map(count));
    const all = (await request(app).get(`${api}/products?limit=48`)).body.meta.total as number;
    const failures: string[] = [];
    for (const p of PAYLOADS) {
      const e = encodeURIComponent(p);
      for (const path of [
        `/products?q=${e}`,
        `/products?category=${e}`,
        `/products?color=${e}`,
        `/products?size=${e}`,
        `/products?sort=${e}`,
        `/products?minPrice=${e}`,
        `/products/${e}`,
        `/categories/${e}`,
      ]) {
        const res = await request(app).get(`${api}${path}`);
        if (res.status >= 500) failures.push(`${path} → ${res.status}`);
        // Symbol-only searches are stripped to "no filter" (public catalogue); anything with
        // words, like "' OR 1=1 --", must not match everything.
        const hasWords = /[a-z]/i.test(p);
        if (hasWords && path.startsWith('/products?q=') && res.body.meta?.total >= all) {
          failures.push(`${path} matched the whole catalogue`);
        }
      }
    }
    expect(failures).toEqual([]);
    expect(await Promise.all(['users', 'products', 'orders'].map(count))).toEqual(before);
  });

  it('admin search and customer lookups', async () => {
    const admin = request.agent(app);
    await admin
      .post(`${api}/auth/login`)
      .send({ email: 'admin@velo.local', password: 'VeloAdmin#2026' });
    const shopper = await signedInShopper(app);
    const failures: string[] = [];
    for (const p of PAYLOADS) {
      const e = encodeURIComponent(p);
      for (const [agent, path] of [
        [admin, `/admin/orders?q=${e}`],
        [admin, `/admin/users?q=${e}`],
        [admin, `/admin/products?q=${e}`],
        [admin, `/admin/orders/${e}`],
        [shopper, `/orders/${e}`],
      ] as const) {
        const res = await agent.get(`${api}${path}`);
        if (res.status >= 500) failures.push(`${path} → ${res.status}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('uploaded files cannot be used to read outside the uploads folder', async () => {
    for (const path of [
      '/uploads/..%2f..%2f.env',
      '/uploads/%2e%2e/%2e%2e/package.json',
      '/uploads/....//....//.env',
    ]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBeGreaterThanOrEqual(400);
      expect(res.text).not.toMatch(/JWT_SECRET|"dependencies"/);
    }
  });

  it('text the database cannot store is a 400, not a 500 (bodies too)', async () => {
    const shopper = await signedInShopper(app);
    const res = await shopper.patch(`${api}/users/me`).send({ name: 'Bad\u0000Name' });
    expect(res.status).toBe(400);
  });

  it('errors never expose stack traces or SQL', async () => {
    const res = await request(app).get(`${api}/products/${encodeURIComponent("x' OR '1'='1")}`);
    expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(|SELECT|syntax error|node_modules/i);
  });
});
