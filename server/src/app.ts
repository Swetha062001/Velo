import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { requestId, requestLogger } from './middleware/requestContext.js';
import { apiRouter } from './routes.js';
import { localStorage, UPLOADS_ROUTE } from './storage/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Order matters: identify + log first, then security, then parsing, then routes.
  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  // Uploaded images. Filenames are random UUIDs, so responses can be cached forever.
  // CORP cross-origin lets the storefront (another port/origin) display them; the strict CSP
  // and nosniff stop a file from ever being interpreted as a page or script.
  app.use(
    UPLOADS_ROUTE,
    express.static(localStorage.rootDir, {
      index: false,
      dotfiles: 'deny',
      immutable: true,
      maxAge: '365d',
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // API responses can contain private data (profile, cart, orders): never cache them.
  app.set('etag', false);
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/v1', apiRateLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
