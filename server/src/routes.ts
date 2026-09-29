import { Router } from 'express';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { wishlistRouter } from './modules/wishlist/wishlist.routes.js';

/** Mounts every feature module under /api/v1. Add new modules here. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/admin', adminRouter);
