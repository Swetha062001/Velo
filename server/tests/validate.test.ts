import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { validate } from '../src/middleware/validate.js';
import { idParamSchema } from '../src/schemas/common.js';
import { paginationQuerySchema } from '../src/utils/pagination.js';

const bodySchema = z.object({
  name: z.string().trim().min(2),
  quantity: z.number().int().min(1),
});

const app = express();
app.use(express.json());
app.post(
  '/items/:id',
  validate({ params: idParamSchema, query: paginationQuerySchema, body: bodySchema }),
  (req, res) => {
    res.json({ params: req.params, query: req.query, body: req.body });
  },
);
app.use(errorHandler);

const VALID_ID = '5b4a2c3e-8f1d-4e6a-9c7b-2d3e4f5a6b7c';

describe('validate middleware', () => {
  it('passes parsed values to the handler (trimmed, coerced, defaulted)', async () => {
    const res = await request(app)
      .post(`/items/${VALID_ID}?page=3`)
      .send({ name: '  Aero One  ', quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ name: 'Aero One', quantity: 2 });
    expect(res.body.query).toEqual({ page: 3, limit: 12 }); // "3" → 3, limit defaulted
    expect(res.body.params).toEqual({ id: VALID_ID });
  });

  it('reports every invalid field across params, query and body at once', async () => {
    const res = await request(app)
      .post('/items/not-a-uuid?limit=500')
      .send({ name: 'A', quantity: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining(['params.id', 'query.limit', 'body.name', 'body.quantity']),
    );
  });

  it('strips unknown body fields (e.g. a client-sent price)', async () => {
    const res = await request(app)
      .post(`/items/${VALID_ID}`)
      .send({ name: 'Aero One', quantity: 1, price: 1 });

    expect(res.status).toBe(200);
    expect(res.body.body).not.toHaveProperty('price');
  });
});
