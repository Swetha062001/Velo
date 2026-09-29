import { Router } from 'express';
import { addressesRouter } from './modules/addresses/addresses.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { wishlistRouter } from './modules/wishlist/wishlist.routes.js';

/** Mounts every feature module under /api/v1. Add new modules here. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
// More specific path first, so /users/me/addresses isn't handled by the users router.
apiRouter.use('/users/me/addresses', addressesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/admin', adminRouter);
