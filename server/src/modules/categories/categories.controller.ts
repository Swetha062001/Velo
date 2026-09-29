import type { Request, Response } from 'express';
import { ok } from '../../utils/respond.js';
import { categoriesService } from './categories.service.js';

export const categoriesController = {
  async list(_req: Request, res: Response) {
    ok(res, await categoriesService.list());
  },

  async getBySlug(req: Request<{ slug: string }>, res: Response) {
    ok(res, await categoriesService.getBySlug(req.params.slug));
  },
};
