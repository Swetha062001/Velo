import type { Response } from 'express';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, sessionCookieOptions } from '../../config/auth.js';

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
}
