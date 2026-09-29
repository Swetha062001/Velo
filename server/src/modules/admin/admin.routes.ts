import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { adminController as c } from './admin.controller.js';
import { createCategorySchema, updateCategorySchema } from './categories/categories.admin.js';
import { listInventoryQuerySchema, updateInventorySchema } from './inventory/inventory.admin.js';
import {
  adminOrderNumberParam,
  listAdminOrdersQuerySchema,
  updateOrderStatusSchema,
} from './orders/orders.admin.js';
import {
  createProductSchema,
  idParam,
  listAdminProductsQuerySchema,
  replaceImagesSchema,
  updateProductSchema,
  updateVariantSchema,
  variantIdParam,
  variantInputSchema,
} from './products/products.admin.schemas.js';
import { listAdminUsersQuerySchema, updateRoleSchema } from './users/users.admin.js';

/**
 * Every /admin endpoint sits behind this guard: 401 when signed out, 403 for non-admins.
 * This server-side check — not the admin UI — is the security boundary.
 */
export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('ADMIN'));

adminRouter.get('/stats', c.stats);

// Products, images, sizes
adminRouter.get('/products', validate({ query: listAdminProductsQuerySchema }), c.listProducts);
adminRouter.post('/products', validate({ body: createProductSchema }), c.createProduct);
adminRouter.get('/products/:id', validate({ params: idParam }), c.getProduct);
adminRouter.patch(
  '/products/:id',
  validate({ params: idParam, body: updateProductSchema }),
  c.updateProduct,
);
adminRouter.delete('/products/:id', validate({ params: idParam }), c.deleteProduct);
adminRouter.put(
  '/products/:id/images',
  validate({ params: idParam, body: replaceImagesSchema }),
  c.replaceImages,
);
adminRouter.post(
  '/products/:id/variants',
  validate({ params: idParam, body: variantInputSchema }),
  c.addVariant,
);
adminRouter.patch(
  '/variants/:variantId',
  validate({ params: variantIdParam, body: updateVariantSchema }),
  c.updateVariant,
);
adminRouter.delete('/variants/:variantId', validate({ params: variantIdParam }), c.deleteVariant);

// Categories
adminRouter.get('/categories', c.listCategories);
adminRouter.post('/categories', validate({ body: createCategorySchema }), c.createCategory);
adminRouter.patch(
  '/categories/:id',
  validate({ params: idParam, body: updateCategorySchema }),
  c.updateCategory,
);
adminRouter.delete('/categories/:id', validate({ params: idParam }), c.deleteCategory);

// Inventory
adminRouter.get('/inventory', validate({ query: listInventoryQuerySchema }), c.listInventory);
adminRouter.patch(
  '/inventory/:variantId',
  validate({ params: variantIdParam, body: updateInventorySchema }),
  c.updateInventory,
);

// Orders
adminRouter.get('/orders', validate({ query: listAdminOrdersQuerySchema }), c.listOrders);
adminRouter.get('/orders/:orderNumber', validate({ params: adminOrderNumberParam }), c.getOrder);
adminRouter.patch(
  '/orders/:orderNumber/status',
  validate({ params: adminOrderNumberParam, body: updateOrderStatusSchema }),
  c.updateOrderStatus,
);

// Users
adminRouter.get('/users', validate({ query: listAdminUsersQuerySchema }), c.listUsers);
adminRouter.patch(
  '/users/:id/role',
  validate({ params: idParam, body: updateRoleSchema }),
  c.updateUserRole,
);
