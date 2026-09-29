import type { Request, Response } from 'express';
import { validatedQuery } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import type { ListProductsQuery } from './products.schemas.js';
import { productsService } from './products.service.js';

export const productsController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await productsService.list(validatedQuery<ListProductsQuery>(req));
    ok(res, items, meta);
  },

  async facets(_req: Request, res: Response) {
    ok(res, await productsService.facets());
  },

  async getBySlug(req: Request<{ slug: string }>, res: Response) {
    ok(res, await productsService.getBySlug(req.params.slug));
  },
};
