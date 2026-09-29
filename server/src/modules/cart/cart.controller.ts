import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { ok } from '../../utils/respond.js';
import type { CartLineInput, GuestCartInput } from './cart.schemas.js';
import { cartService } from './cart.service.js';

type ItemParams = { itemId: string };

export const cartController = {
  async get(req: Request, res: Response) {
    ok(res, await cartService.getCart(currentUser(req).id));
  },

  async addItem(req: Request<unknown, unknown, CartLineInput>, res: Response) {
    ok(res, await cartService.addItem(currentUser(req).id, req.body));
  },

  async updateItem(req: Request<ItemParams, unknown, { quantity: number }>, res: Response) {
    ok(
      res,
      await cartService.updateItem(currentUser(req).id, req.params.itemId, req.body.quantity),
    );
  },

  async removeItem(req: Request<ItemParams>, res: Response) {
    ok(res, await cartService.removeItem(currentUser(req).id, req.params.itemId));
  },

  async clear(req: Request, res: Response) {
    ok(res, await cartService.clear(currentUser(req).id));
  },

  async quote(req: Request<unknown, unknown, GuestCartInput>, res: Response) {
    ok(res, await cartService.quote(req.body.items));
  },

  async merge(req: Request<unknown, unknown, GuestCartInput>, res: Response) {
    ok(res, await cartService.merge(currentUser(req).id, req.body.items));
  },
};
