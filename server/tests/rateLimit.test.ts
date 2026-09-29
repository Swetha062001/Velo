import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { createRateLimiter } from '../src/middleware/rateLimit.js';

describe('createRateLimiter', () => {
  it('returns 429 in the { error } envelope once the limit is exceeded', async () => {
    const app = express();
    app.get('/limited', createRateLimiter({ windowMs: 60_000, limit: 2 }), (_req, res) => {
      res.json({ data: 'ok' });
    });
    app.use(errorHandler);

    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);
    const res = await request(app).get('/limited');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['ratelimit']).toBeDefined();
  });
});
