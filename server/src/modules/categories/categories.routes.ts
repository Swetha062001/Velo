import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { slugParamSchema } from '../../schemas/common.js';
import { categoriesController } from './categories.controller.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', categoriesController.list);
categoriesRouter.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  categoriesController.getBySlug,
);
