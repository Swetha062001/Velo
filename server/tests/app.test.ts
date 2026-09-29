import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();
const CLIENT_ORIGIN = 'http://localhost:5173';

describe('GET /api/v1/health', () => {
  it('returns status in the { data } envelope', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', environment: 'test' });
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });

  it('sets a request id and security headers, hides x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sends rate-limit headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['ratelimit-policy']).toBeDefined();
  });
});

describe('CORS', () => {
  it('allows the configured client origin with credentials', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', CLIENT_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(CLIENT_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow other origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://evil.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example');
  });
});

describe('error responses', () => {
  it('returns 404 in the { error } envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /api/v1/does-not-exist not found' },
    });
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{bad json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 for oversized bodies', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(200 * 1024) }));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
