import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { wishlistController } from './wishlist.controller.js';
import { addToWishlistSchema, moveToCartSchema, productIdParamSchema } from './wishlist.schemas.js';

/** A wishlist always belongs to the signed-in user. */
export const wishlistRouter = Router();

wishlistRouter.use(authenticate);

wishlistRouter.get('/', wishlistController.get);
wishlistRouter.post('/', validate({ body: addToWishlistSchema }), wishlistController.add);
wishlistRouter.delete(
  '/:productId',
  validate({ params: productIdParamSchema }),
  wishlistController.remove,
);
wishlistRouter.post(
  '/:productId/move-to-cart',
  validate({ params: productIdParamSchema, body: moveToCartSchema }),
  wishlistController.moveToCart,
);
