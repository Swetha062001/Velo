import { Router } from 'express';
import { optionalAuthenticate } from '../../middleware/authenticate.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { authController } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Only failed logins count, so a user who signs in successfully is never locked out.
const loginLimiter = createRateLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

const registerLimiter = createRateLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  message: 'Too many sign-up attempts. Please try again later.',
});

export const authRouter = Router();

authRouter.post(
  '/register',
  registerLimiter,
  validate({ body: registerSchema }),
  authController.register,
);
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post('/logout', authController.logout);
// 200 with `user: null` when signed out: "am I signed in?" is a question, not an error.
authRouter.get('/me', optionalAuthenticate, authController.me);
