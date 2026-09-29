import { Router } from 'express';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { aiController } from './ai.controller.js';
import { assistantRequestSchema } from './schemas/ai.schemas.js';

// Model calls are the most expensive requests in the app.
const assistantLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  message: 'The assistant is getting a lot of questions — please try again in a few minutes.',
});

/** Public: shoppers can ask without signing in. */
export const aiRouter = Router();

aiRouter.get('/status', aiController.status);
aiRouter.post(
  '/assistant',
  assistantLimiter,
  validate({ body: assistantRequestSchema }),
  aiController.assistant,
);
