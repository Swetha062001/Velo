import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { ordersController } from './orders.controller.js';
import {
  listOrdersQuerySchema,
  orderNumberParamSchema,
  placeOrderSchema,
} from './orders.schemas.js';

const placeOrderLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many checkout attempts. Please wait a few minutes and try again.',
});

/** Customers only ever see and act on their own orders. */
export const ordersRouter = Router();

ordersRouter.use(authenticate);

ordersRouter.post(
  '/',
  placeOrderLimiter,
  validate({ body: placeOrderSchema }),
  ordersController.place,
);
ordersRouter.get('/', validate({ query: listOrdersQuerySchema }), ordersController.list);
ordersRouter.get(
  '/:orderNumber',
  validate({ params: orderNumberParamSchema }),
  ordersController.get,
);
ordersRouter.post(
  '/:orderNumber/cancel',
  validate({ params: orderNumberParamSchema }),
  ordersController.cancel,
);
