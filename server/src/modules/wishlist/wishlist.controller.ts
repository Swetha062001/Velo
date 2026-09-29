import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { ok } from '../../utils/respond.js';
import { wishlistService } from './wishlist.service.js';

type ProductParams = { productId: string };

export const wishlistController = {
  async get(req: Request, res: Response) {
    ok(res, await wishlistService.get(currentUser(req).id));
  },

  async add(req: Request<unknown, unknown, { productId: string }>, res: Response) {
    ok(res, await wishlistService.add(currentUser(req).id, req.body.productId));
  },

  async remove(req: Request<ProductParams>, res: Response) {
    ok(res, await wishlistService.remove(currentUser(req).id, req.params.productId));
  },

  async moveToCart(req: Request<ProductParams, unknown, { variantId: string }>, res: Response) {
    ok(
      res,
      await wishlistService.moveToCart(
        currentUser(req).id,
        req.params.productId,
        req.body.variantId,
      ),
    );
  },
};
