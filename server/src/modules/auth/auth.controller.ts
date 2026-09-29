import type { Request, Response } from 'express';
import { created, noContent, ok } from '../../utils/respond.js';
import { toPublicUser } from '../users/users.types.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { authService } from './auth.service.js';
import { clearSessionCookie, setSessionCookie } from './session.js';

export const authController = {
  async register(req: Request<unknown, unknown, RegisterInput>, res: Response) {
    const { user, token } = await authService.register(req.body);
    setSessionCookie(res, token);
    created(res, { user: toPublicUser(user) });
  },

  async login(req: Request<unknown, unknown, LoginInput>, res: Response) {
    const { user, token } = await authService.login(req.body);
    setSessionCookie(res, token);
    ok(res, { user: toPublicUser(user) });
  },

  /** Idempotent: works even without a valid session. */
  logout(_req: Request, res: Response) {
    clearSessionCookie(res);
    noContent(res);
  },

  me(req: Request, res: Response) {
    ok(res, { user: req.user ? toPublicUser(req.user) : null });
  },
};
