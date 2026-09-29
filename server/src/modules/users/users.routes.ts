import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { usersController } from './users.controller.js';
import { changePasswordSchema, updateProfileSchema } from './users.schemas.js';

const passwordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many password attempts. Please wait 15 minutes and try again.',
});

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.patch('/me', validate({ body: updateProfileSchema }), usersController.updateProfile);
usersRouter.post(
  '/me/password',
  passwordLimiter,
  validate({ body: changePasswordSchema }),
  usersController.changePassword,
);
