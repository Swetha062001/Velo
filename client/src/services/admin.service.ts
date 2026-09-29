import { api } from '../lib/apiClient.ts';
import type {
  AdminCategory,
  AdminImage,
  AdminOrder,
  AdminOrderListItem,
  AdminProduct,
  AdminProductListItem,
  AdminStats,
  AdminUser,
  InventoryRow,
  PageMeta,
  Paged,
  ProductInput,
  VariantInput,
} from '../types/admin.ts';
import type { OrderStatus } from '../types/order.ts';
import type { Role } from '../types/user.ts';

type Query = Record<string, string | number | undefined>;

async function paged<T>(path: string, query: Query, signal?: AbortSignal): Promise<Paged<T>> {
  const { data, meta } = await api.getWithMeta<T[], PageMeta>(path, { query, signal });
  return { items: data, meta };
}

export const adminService = {
  stats: (signal?: AbortSignal) => api.get<AdminStats>('/admin/stats', { signal }),

  /** Uploads one image; returns its public URL to save on a product or category. */
  uploadImage(file: File, folder: 'products' | 'categories' = 'products') {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ url: string; key: string; contentType: string; size: number }>(
      '/admin/uploads/images',
      form,
      { query: { folder } },
    );
  },

  // Products
  listProducts: (q: Query, signal?: AbortSignal) =>
    paged<AdminProductListItem>('/admin/products', q, signal),
  getProduct: (id: string, signal?: AbortSignal) =>
    api.get<AdminProduct>(`/admin/products/${id}`, { signal }),
  createProduct: (input: ProductInput & { images: AdminImage[]; variants: VariantInput[] }) =>
    api.post<AdminProduct>('/admin/products', input),
  updateProduct: (id: string, input: Partial<ProductInput>) =>
    api.patch<AdminProduct>(`/admin/products/${id}`, input),
  deleteProduct: (id: string) => api.delete<void>(`/admin/products/${id}`),
  replaceImages: (id: string, images: AdminImage[]) =>
    api.put<AdminProduct>(`/admin/products/${id}/images`, {
      images: images.map(({ url, altText }) => ({ url, altText })),
    }),
  addVariant: (productId: string, input: VariantInput) =>
    api.post<AdminProduct>(`/admin/products/${productId}/variants`, input),
  updateVariant: (
    variantId: string,
    input: Partial<Pick<VariantInput, 'sizeLabel' | 'sku' | 'priceOverridePaise' | 'isActive'>>,
  ) => api.patch<AdminProduct>(`/admin/variants/${variantId}`, input),
  deleteVariant: (variantId: string) => api.delete<AdminProduct>(`/admin/variants/${variantId}`),

  // Categories
  listCategories: (signal?: AbortSignal) =>
    api.get<AdminCategory[]>('/admin/categories', { signal }),
  createCategory: (input: Partial<AdminCategory>) =>
    api.post<AdminCategory>('/admin/categories', input),
  updateCategory: (id: string, input: Partial<AdminCategory>) =>
    api.patch<AdminCategory>(`/admin/categories/${id}`, input),
  deleteCategory: (id: string) => api.delete<void>(`/admin/categories/${id}`),

  // Inventory
  listInventory: (q: Query, signal?: AbortSignal) =>
    paged<InventoryRow>('/admin/inventory', q, signal),
  updateInventory: (variantId: string, input: { quantity?: number; lowStockThreshold?: number }) =>
    api.patch<InventoryRow>(`/admin/inventory/${variantId}`, input),

  // Orders
  listOrders: (q: Query, signal?: AbortSignal) =>
    paged<AdminOrderListItem>('/admin/orders', q, signal),
  getOrder: (orderNumber: string, signal?: AbortSignal) =>
    api.get<AdminOrder>(`/admin/orders/${orderNumber}`, { signal }),
  updateOrderStatus: (orderNumber: string, status: OrderStatus) =>
    api.patch<AdminOrder>(`/admin/orders/${orderNumber}/status`, { status }),

  // Users
  listUsers: (q: Query, signal?: AbortSignal) => paged<AdminUser>('/admin/users', q, signal),
  updateRole: (id: string, role: Role) => api.patch<AdminUser>(`/admin/users/${id}/role`, { role }),
};
