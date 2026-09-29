import { rateLimit } from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

interface LimiterOptions {
  windowMs: number;
  limit: number;
  message?: string;
}

/**
 * Per-IP rate limiter. Rejections go through the central error handler, so they
 * use the standard `{ error }` shape. Counters are in-memory — fine for a single
 * local process; swap in a shared store (e.g. Redis) when running multiple instances.
 */
export function createRateLimiter({
  windowMs,
  limit,
  message = 'Too many requests, please try again later',
}: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(AppError.tooManyRequests(message)),
  });
}

/** Baseline limit for the whole API. Stricter limiters (login, AI) are added per route. */
export const apiRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 600 });
