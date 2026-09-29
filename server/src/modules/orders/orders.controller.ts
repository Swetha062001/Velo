import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { validatedQuery } from '../../middleware/validate.js';
import type { PaginationQuery } from '../../utils/pagination.js';
import { created, ok } from '../../utils/respond.js';
import type { PlaceOrderInput } from './orders.schemas.js';
import { ordersService } from './orders.service.js';

type OrderParams = { orderNumber: string };

export const ordersController = {
  /** 201 for a new order; 200 when an idempotent retry returns the existing one. */
  async place(req: Request<unknown, unknown, PlaceOrderInput>, res: Response) {
    const { order, created: isNew } = await ordersService.placeOrder(currentUser(req).id, req.body);
    if (isNew) created(res, order);
    else ok(res, order);
  },

  async list(req: Request, res: Response) {
    const { items, meta } = await ordersService.list(
      currentUser(req).id,
      validatedQuery<PaginationQuery>(req),
    );
    ok(res, items, meta);
  },

  async get(req: Request<OrderParams>, res: Response) {
    ok(res, await ordersService.get(currentUser(req).id, req.params.orderNumber));
  },

  async cancel(req: Request<OrderParams>, res: Response) {
    ok(res, await ordersService.cancel(currentUser(req).id, req.params.orderNumber));
  },
};
