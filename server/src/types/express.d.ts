import type { AuthUser } from '../modules/users/users.types.js';

declare global {
  namespace Express {
    interface Request {
      /** Unique id per request — returned as X-Request-Id and included in logs. */
      id: string;
      /** Set by the `authenticate` middleware; always loaded fresh from the database. */
      user?: AuthUser;
    }
  }
}

export {};
