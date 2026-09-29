import type { CookieOptions } from 'express';
import { isProduction } from './env.js';

/** Distinct name: browsers share localhost cookies across ports and projects. */
export const SESSION_COOKIE = 'velo_session';

/** Sessions last 7 days; the JWT expiry and the cookie max-age always match. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const JWT_ISSUER = 'velo-api';
export const JWT_AUDIENCE = 'velo-client';

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true, // not readable from JavaScript → safe from XSS token theft
  sameSite: 'lax', // not sent on cross-site POSTs → CSRF protection
  secure: isProduction, // HTTPS-only once deployed
  path: '/',
};

/** bcrypt only uses the first 72 bytes of a password. */
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_MIN_LENGTH = 8;
