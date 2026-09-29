import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { seed } from '../src/db/seed.js';
import { truncateAll } from './helpers/db.js';
import { signedInShopper } from './helpers/users.js';

const app = createApp();
const url = '/api/v1/users/me/addresses';

const valid = (overrides: Record<string, unknown> = {}) => ({
  fullName: 'Asha Rao',
  phone: '98765 43210',
  line1: '12 MG Road',
  line2: 'Near Metro',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  ...overrides,
});

const newShopper = () => signedInShopper(app, 'Addr Tester');

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
});

describe('addresses', () => {
  let agent: request.Agent;
  beforeEach(async () => {
    agent = await newShopper();
  });

  it('requires authentication', async () => {
    expect((await request(app).get(url)).status).toBe(401);
  });

  it('creates an address, normalises the phone and makes the first one default', async () => {
    const res = await agent.post(url).send(valid());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      fullName: 'Asha Rao',
      phone: '+91 9876543210',
      postalCode: '560001',
      country: 'IN',
      isDefault: true,
    });
  });

  it('validates Indian PIN codes, mobile numbers and states', async () => {
    const res = await agent
      .post(url)
      .send(valid({ phone: '12345', postalCode: '012345', state: 'Atlantis', fullName: '' }));
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining(['body.phone', 'body.postalCode', 'body.state', 'body.fullName']),
    );
  });

  it('moves the default when another address is marked default', async () => {
    const first = (await agent.post(url).send(valid())).body.data;
    const second = (await agent.post(url).send(valid({ line1: '99 Park St', isDefault: true })))
      .body.data;
    const list = (await agent.get(url)).body.data;

    expect(list.map((a: { id: string }) => a.id)).toEqual([second.id, first.id]); // default first
    expect(list.filter((a: { isDefault: boolean }) => a.isDefault)).toHaveLength(1);

    await agent.patch(`${url}/${first.id}`).send({ isDefault: true }).expect(200);
    const after = (await agent.get(url)).body.data;
    expect(after.find((a: { id: string }) => a.id === first.id).isDefault).toBe(true);
    expect(after.filter((a: { isDefault: boolean }) => a.isDefault)).toHaveLength(1);
  });

  it('updates fields partially', async () => {
    const a = (await agent.post(url).send(valid())).body.data;
    const res = await agent.patch(`${url}/${a.id}`).send({ city: 'Mysuru', postalCode: '570001' });
    expect(res.body.data).toMatchObject({
      city: 'Mysuru',
      postalCode: '570001',
      line1: '12 MG Road',
    });
  });

  it('promotes another address when the default is deleted', async () => {
    const first = (await agent.post(url).send(valid())).body.data;
    const second = (await agent.post(url).send(valid({ line1: '2 Lake View' }))).body.data;
    await agent.delete(`${url}/${first.id}`).expect(204);
    const list = (await agent.get(url)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: second.id, isDefault: true });
  });

  it("can't read, edit or delete another user's address", async () => {
    const mine = (await agent.post(url).send(valid())).body.data;
    const other = await newShopper();
    expect((await other.patch(`${url}/${mine.id}`).send({ city: 'X' })).status).toBe(404);
    expect((await other.delete(`${url}/${mine.id}`)).status).toBe(404);
    expect((await other.get(url)).body.data).toEqual([]);
  });

  it('caps saved addresses at 10', async () => {
    for (let i = 0; i < 10; i++)
      await agent
        .post(url)
        .send(valid({ line1: `House ${i}` }))
        .expect(201);
    const res = await agent.post(url).send(valid());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ADDRESS_LIMIT');
  });
});
