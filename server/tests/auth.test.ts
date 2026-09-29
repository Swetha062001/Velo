import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config/auth.js';
import { pool } from '../src/db/index.js';
import { DEV_ACCOUNTS, seed } from '../src/db/seed.js';
import { authenticate, requireRole } from '../src/middleware/authenticate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { signSessionToken } from '../src/utils/jwt.js';
import { truncateAll } from './helpers/db.js';

const app = createApp();
const api = '/api/v1';

let counter = 0;
const uniqueEmail = () => `shopper${++counter}.${Date.now()}@example.test`;
const validRegistration = () => ({
  name: 'Test Shopper',
  email: uniqueEmail(),
  password: 'runFast42',
});

function sessionCookie(res: request.Response) {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
}

async function signIn(email: string, password: string) {
  const agent = request.agent(app);
  await agent.post(`${api}/auth/login`).send({ email, password }).expect(200);
  return agent;
}

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
});

describe('POST /auth/register', () => {
  it('creates a USER, sets a secure session cookie and never returns the hash', async () => {
    const input = validRegistration();
    const res = await request(app).post(`${api}/auth/register`).send(input);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      name: input.name,
      email: input.email,
      role: 'USER',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);

    const cookie = sessionCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
  });

  it('normalises email to lowercase and rejects case-insensitive duplicates', async () => {
    const input = validRegistration();
    const first = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...input, email: `  ${input.email.toUpperCase()} ` });
    expect(first.body.data.user.email).toBe(input.email);

    const dup = await request(app).post(`${api}/auth/register`).send(input);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CONFLICT');
  });

  it('ignores a client-supplied role', async () => {
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...validRegistration(), role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('USER');
  });

  it('validates name, email and password strength', async () => {
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ name: 'A', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['body.name', 'body.email', 'body.password']));
  });

  it('rejects passwords without a number', async () => {
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...validRegistration(), password: 'onlyletters' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('signs in the seeded admin', async () => {
    const res = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: DEV_ACCOUNTS.admin.email, password: DEV_ACCOUNTS.admin.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(sessionCookie(res)).toBeDefined();
  });

  it('returns the same generic error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: DEV_ACCOUNTS.user.email, password: 'wrongPass1' });
    const unknownEmail = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: 'nobody@example.test', password: 'wrongPass1' });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password',
      });
      expect(sessionCookie(res)).toBeUndefined();
    }
  });
});

describe('session', () => {
  it('GET /auth/me returns the user for a valid session and null without one', async () => {
    const agent = await signIn(DEV_ACCOUNTS.user.email, DEV_ACCOUNTS.user.password);
    const me = await agent.get(`${api}/auth/me`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(DEV_ACCOUNTS.user.email);

    const anonymous = await request(app).get(`${api}/auth/me`);
    expect(anonymous.status).toBe(200);
    expect(anonymous.body.data.user).toBeNull();
  });

  it('marks API responses as non-cacheable', async () => {
    const agent = await signIn(DEV_ACCOUNTS.user.email, DEV_ACCOUNTS.user.password);
    const res = await agent.get(`${api}/auth/me`);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers.etag).toBeUndefined();
  });

  it('rejects tokens signed with another secret', async () => {
    const forged = jwt.sign({ tv: 0 }, 'x'.repeat(40), {
      subject: '00000000-0000-0000-0000-000000000000',
      issuer: 'velo-api',
      audience: 'velo-client',
    });
    const res = await request(app)
      .get(`${api}/auth/me`)
      .set('Cookie', `${SESSION_COOKIE}=${forged}`);
    expect(res.body.data.user).toBeNull();
  });

  it('rejects unsigned "alg: none" tokens', async () => {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
      DEV_ACCOUNTS.admin.email,
    ]);
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
      sub: rows[0]!.id,
      tv: 0,
      iss: 'velo-api',
      aud: 'velo-client',
    })}.`;
    const res = await request(app)
      .get(`${api}/auth/me`)
      .set('Cookie', `${SESSION_COOKIE}=${unsigned}`);
    expect(res.body.data.user).toBeNull();
  });

  it('clears a dead session cookie', async () => {
    const res = await request(app).get(`${api}/auth/me`).set('Cookie', `${SESSION_COOKIE}=garbage`);
    expect(res.body.data.user).toBeNull();
    expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('POST /auth/logout clears the cookie', async () => {
    const agent = await signIn(DEV_ACCOUNTS.user.email, DEV_ACCOUNTS.user.password);
    const res = await agent.post(`${api}/auth/logout`);
    expect(res.status).toBe(204);
    expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await agent.get(`${api}/auth/me`)).body.data.user).toBeNull();
    expect((await agent.patch(`${api}/users/me`).send({ name: 'X Y' })).status).toBe(401);
  });

  it('reflects role changes immediately (role is read from the DB, not the token)', async () => {
    const input = validRegistration();
    const agent = request.agent(app);
    await agent.post(`${api}/auth/register`).send(input).expect(201);

    await pool.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [input.email]);
    const me = await agent.get(`${api}/auth/me`);
    expect(me.body.data.user.role).toBe('ADMIN');
  });
});

describe('profile & password', () => {
  it('updates the display name', async () => {
    const agent = request.agent(app);
    await agent.post(`${api}/auth/register`).send(validRegistration()).expect(201);

    const res = await agent.patch(`${api}/users/me`).send({ name: '  New Name  ' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('New Name');
  });

  it('requires authentication', async () => {
    const res = await request(app).patch(`${api}/users/me`).send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });

  it('changing the password revokes other sessions but keeps this one', async () => {
    const input = validRegistration();
    const deviceA = request.agent(app);
    await deviceA.post(`${api}/auth/register`).send(input).expect(201);
    const deviceB = await signIn(input.email, input.password);

    const res = await deviceA
      .post(`${api}/users/me/password`)
      .send({ currentPassword: input.password, newPassword: 'newPace99' });
    expect(res.status).toBe(200);

    expect((await deviceA.get(`${api}/auth/me`)).body.data.user).not.toBeNull(); // re-issued
    expect((await deviceB.get(`${api}/auth/me`)).body.data.user).toBeNull(); // revoked
    expect((await deviceB.patch(`${api}/users/me`).send({ name: 'X Y' })).status).toBe(401);

    await request(app)
      .post(`${api}/auth/login`)
      .send({ email: input.email, password: 'newPace99' })
      .expect(200);
  });

  it('rejects an incorrect current password on the right field', async () => {
    const input = validRegistration();
    const agent = request.agent(app);
    await agent.post(`${api}/auth/register`).send(input).expect(201);

    const res = await agent
      .post(`${api}/users/me/password`)
      .send({ currentPassword: 'wrongOne1', newPassword: 'newPace99' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('body.currentPassword');
  });
});

describe('authorization', () => {
  it('guards /admin: 401 signed out, 403 for users, allowed for admins', async () => {
    expect((await request(app).get(`${api}/admin/anything`)).status).toBe(401);

    const user = await signIn(DEV_ACCOUNTS.user.email, DEV_ACCOUNTS.user.password);
    const forbidden = await user.get(`${api}/admin/anything`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    const admin = await signIn(DEV_ACCOUNTS.admin.email, DEV_ACCOUNTS.admin.password);
    expect((await admin.get(`${api}/admin/anything`)).status).toBe(404); // passed the guard
  });

  it('requireRole checks the role loaded from the database', async () => {
    const testApp = express();
    testApp.use(cookieParser());
    testApp.get('/secret', authenticate, requireRole('ADMIN'), (_req, res) => {
      res.json({ data: 'ok' });
    });
    testApp.use(errorHandler);

    const { rows } = await pool.query<{ id: string; token_version: number }>(
      `SELECT id, token_version FROM users WHERE email = $1`,
      [DEV_ACCOUNTS.user.email],
    );
    // A valid token for a USER can never reach an ADMIN route.
    const token = signSessionToken({ sub: rows[0]!.id, tv: rows[0]!.token_version });
    const res = await request(testApp).get('/secret').set('Cookie', `${SESSION_COOKIE}=${token}`);
    expect(res.status).toBe(403);
  });
});

describe('rate limiting', () => {
  it('blocks repeated failed sign-ins', async () => {
    let status = 0;
    let attempts = 0;
    while (status !== 429 && attempts < 20) {
      attempts++;
      const res = await request(app)
        .post(`${api}/auth/login`)
        .send({ email: 'brute@example.test', password: 'guess12345' });
      status = res.status;
    }
    expect(status).toBe(429);
    expect(attempts).toBeLessThanOrEqual(11);
  });
});
