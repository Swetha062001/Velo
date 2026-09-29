import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { slugParamSchema } from '../../schemas/common.js';
import { productsController } from './products.controller.js';
import { listProductsQuerySchema } from './products.schemas.js';

export const productsRouter = Router();

productsRouter.get('/', validate({ query: listProductsQuerySchema }), productsController.list);
// Registered before '/:slug' so "facets" isn't treated as a product slug.
productsRouter.get('/facets', productsController.facets);
productsRouter.get('/:slug', validate({ params: slugParamSchema }), productsController.getBySlug);
