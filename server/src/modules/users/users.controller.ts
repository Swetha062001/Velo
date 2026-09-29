import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { ok } from '../../utils/respond.js';
import { setSessionCookie } from '../auth/session.js';
import type { ChangePasswordInput, UpdateProfileInput } from './users.schemas.js';
import { usersService } from './users.service.js';
import { toPublicUser } from './users.types.js';

export const usersController = {
  async updateProfile(req: Request<unknown, unknown, UpdateProfileInput>, res: Response) {
    const user = await usersService.updateProfile(currentUser(req).id, req.body);
    ok(res, { user: toPublicUser(user) });
  },

  async changePassword(req: Request<unknown, unknown, ChangePasswordInput>, res: Response) {
    const { user, token } = await usersService.changePassword(currentUser(req).id, req.body);
    setSessionCookie(res, token); // other devices are signed out; this one stays signed in
    ok(res, { user: toPublicUser(user) });
  },
};
