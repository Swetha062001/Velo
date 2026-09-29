import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { cartController } from './cart.controller.js';
import {
  addItemSchema,
  guestCartSchema,
  itemIdParamSchema,
  updateItemSchema,
} from './cart.schemas.js';

export const cartRouter = Router();

// Public: prices a guest cart (variant ids + quantities) without storing anything.
cartRouter.post('/quote', validate({ body: guestCartSchema }), cartController.quote);

// Everything below belongs to the signed-in user's own cart.
cartRouter.use(authenticate);

cartRouter.get('/', cartController.get);
cartRouter.delete('/', cartController.clear);
cartRouter.post('/items', validate({ body: addItemSchema }), cartController.addItem);
cartRouter.patch(
  '/items/:itemId',
  validate({ params: itemIdParamSchema, body: updateItemSchema }),
  cartController.updateItem,
);
cartRouter.delete(
  '/items/:itemId',
  validate({ params: itemIdParamSchema }),
  cartController.removeItem,
);
cartRouter.post('/merge', validate({ body: guestCartSchema }), cartController.merge);
