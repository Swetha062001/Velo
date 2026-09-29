import type { Request, RequestHandler } from 'express';
import { SESSION_COOKIE } from '../config/auth.js';
import { authService } from '../modules/auth/auth.service.js';
import { clearSessionCookie } from '../modules/auth/session.js';
import type { AuthUser, Role } from '../modules/users/users.types.js';
import { AppError } from '../utils/AppError.js';

/** Requires a valid session cookie; attaches the (freshly loaded) user to `req.user`. */
export const authenticate: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || token === '') throw AppError.unauthorized();

  const user = await authService.resolveSession(token);
  if (!user) {
    clearSessionCookie(res); // drop the dead cookie so the browser stops sending it
    throw AppError.unauthorized('Your session has expired. Please sign in again.');
  }

  req.user = user;
  next();
};

/**
 * Attaches `req.user` when a valid session exists, but never rejects the request.
 * Used where signed-out visitors are welcome (e.g. "who am I", guest cart).
 */
export const optionalAuthenticate: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token !== '') {
    const user = await authService.resolveSession(token);
    if (user) req.user = user;
    else clearSessionCookie(res);
  }
  next();
};

/**
 * Role-based authorization. Use after `authenticate`.
 * This — not the frontend — is the security boundary for admin features.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}

/** Typed access to the signed-in user inside handlers protected by `authenticate`. */
export function currentUser(req: Pick<Request, 'user'>): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
