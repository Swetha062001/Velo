import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { validatedQuery } from '../../middleware/validate.js';
import { created, noContent, ok } from '../../utils/respond.js';
import type { OrderStatus } from '../orders/orders.repository.js';
import {
  adminCategoriesService,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './categories/categories.admin.js';
import { dashboardService } from './dashboard/dashboard.service.js';
import {
  adminInventoryService,
  type ListInventoryQuery,
  type UpdateInventoryInput,
} from './inventory/inventory.admin.js';
import { adminOrdersService, type ListAdminOrdersQuery } from './orders/orders.admin.js';
import type {
  CreateProductInput,
  ImageInput,
  ListAdminProductsQuery,
  UpdateProductInput,
  UpdateVariantInput,
  VariantInput,
} from './products/products.admin.schemas.js';
import { adminProductsService } from './products/products.admin.service.js';
import { adminUsersService, type ListAdminUsersQuery } from './users/users.admin.js';

type Id = { id: string };
type VariantId = { variantId: string };
type OrderNumber = { orderNumber: string };

/** Thin HTTP layer for /admin — every handler delegates to a service. */
export const adminController = {
  // Dashboard
  async stats(_req: Request, res: Response) {
    ok(res, await dashboardService.getStats());
  },

  // Products
  async listProducts(req: Request, res: Response) {
    const { items, meta } = await adminProductsService.list(
      validatedQuery<ListAdminProductsQuery>(req),
    );
    ok(res, items, meta);
  },
  async getProduct(req: Request<Id>, res: Response) {
    ok(res, await adminProductsService.get(req.params.id));
  },
  async createProduct(req: Request<unknown, unknown, CreateProductInput>, res: Response) {
    created(res, await adminProductsService.create(req.body));
  },
  async updateProduct(req: Request<Id, unknown, UpdateProductInput>, res: Response) {
    ok(res, await adminProductsService.update(req.params.id, req.body));
  },
  async deleteProduct(req: Request<Id>, res: Response) {
    await adminProductsService.remove(req.params.id);
    noContent(res);
  },
  async replaceImages(req: Request<Id, unknown, { images: ImageInput[] }>, res: Response) {
    ok(res, await adminProductsService.replaceImages(req.params.id, req.body.images));
  },
  async addVariant(req: Request<Id, unknown, VariantInput>, res: Response) {
    created(res, await adminProductsService.addVariant(req.params.id, req.body));
  },
  async updateVariant(req: Request<VariantId, unknown, UpdateVariantInput>, res: Response) {
    ok(res, await adminProductsService.updateVariant(req.params.variantId, req.body));
  },
  async deleteVariant(req: Request<VariantId>, res: Response) {
    ok(res, await adminProductsService.removeVariant(req.params.variantId));
  },

  // Categories
  async listCategories(_req: Request, res: Response) {
    ok(res, await adminCategoriesService.list());
  },
  async createCategory(req: Request<unknown, unknown, CreateCategoryInput>, res: Response) {
    created(res, await adminCategoriesService.create(req.body));
  },
  async updateCategory(req: Request<Id, unknown, UpdateCategoryInput>, res: Response) {
    ok(res, await adminCategoriesService.update(req.params.id, req.body));
  },
  async deleteCategory(req: Request<Id>, res: Response) {
    await adminCategoriesService.remove(req.params.id);
    noContent(res);
  },

  // Inventory
  async listInventory(req: Request, res: Response) {
    const { items, meta } = await adminInventoryService.list(
      validatedQuery<ListInventoryQuery>(req),
    );
    ok(res, items, meta);
  },
  async updateInventory(req: Request<VariantId, unknown, UpdateInventoryInput>, res: Response) {
    ok(res, await adminInventoryService.update(req.params.variantId, req.body));
  },

  // Orders
  async listOrders(req: Request, res: Response) {
    const { items, meta } = await adminOrdersService.list(
      validatedQuery<ListAdminOrdersQuery>(req),
    );
    ok(res, items, meta);
  },
  async getOrder(req: Request<OrderNumber>, res: Response) {
    ok(res, await adminOrdersService.get(req.params.orderNumber));
  },
  async updateOrderStatus(
    req: Request<OrderNumber, unknown, { status: OrderStatus }>,
    res: Response,
  ) {
    ok(res, await adminOrdersService.updateStatus(req.params.orderNumber, req.body.status));
  },

  // Users
  async listUsers(req: Request, res: Response) {
    const { items, meta } = await adminUsersService.list(validatedQuery<ListAdminUsersQuery>(req));
    ok(res, items, meta);
  },
  async updateUserRole(req: Request<Id, unknown, { role: 'USER' | 'ADMIN' }>, res: Response) {
    ok(res, await adminUsersService.updateRole(currentUser(req).id, req.params.id, req.body.role));
  },
};
