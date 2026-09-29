import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestId } from '../src/middleware/requestContext.js';
import { AppError } from '../src/utils/AppError.js';

function appThatThrows(error: unknown) {
  const app = express();
  app.use(requestId);
  app.get('/boom', async () => {
    throw error; // Express 5 forwards async errors to the error handler
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('maps AppError to its status, code and message', async () => {
    const res = await request(appThatThrows(AppError.conflict('Email already registered'))).get(
      '/boom',
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'CONFLICT', message: 'Email already registered' });
  });

  it('hides unexpected error details behind a generic 500 with a request id', async () => {
    const res = await request(appThatThrows(new Error('db password is hunter2'))).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Something went wrong');
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });
});
