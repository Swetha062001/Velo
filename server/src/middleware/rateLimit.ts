import { rateLimit } from 'express-rate-limit';
import { isProduction } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

interface LimiterOptions {
  windowMs: number;
  limit: number;
  message?: string;
  /** Count only failed requests (status >= 400) — used for login/password attempts. */
  skipSuccessfulRequests?: boolean;
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
  skipSuccessfulRequests = false,
}: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(AppError.tooManyRequests(message)),
  });
}

/**
 * Baseline limit for the whole API. Stricter limiters (login, AI) are added per route.
 * Local development gets more headroom: hot reloads and automated browser runs make many
 * requests from one IP. Sensitive routes keep their own strict limits in every environment.
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 600 : 5000,
});
