import type { Gender } from './catalog.ts';
import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from './order.ts';
import type { Role } from './user.ts';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

export interface AdminStats {
  revenuePaise: number;
  orderCount: number;
  customerCount: number;
  products: { active: number; draft: number; archived: number };
  ordersByStatus: Record<OrderStatus, number>;
  revenueByDay: Array<{ day: string; revenuePaise: number; orders: number }>;
  lowStock: {
    total: number;
    items: Array<{
      variantId: string;
      productId: string;
      productName: string;
      colorway: string;
      sizeLabel: string;
      sku: string;
      quantity: number;
      lowStockThreshold: number;
    }>;
  };
  recentOrders: Array<{
    orderNumber: string;
    status: OrderStatus;
    totalPaise: number;
    placedAt: string;
    customerName: string;
  }>;
}

export interface AdminProductBase {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  material: string | null;
  gender: Gender;
  color: string;
  colorway: string;
  tags: string[];
  pricePaise: number;
  compareAtPricePaise: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductListItem extends AdminProductBase {
  imageUrl: string | null;
  variantCount: number;
  totalStock: number;
  lowStockCount: number;
}

export interface AdminVariant {
  id: string;
  sizeLabel: string;
  sku: string;
  priceOverridePaise: number | null;
  isActive: boolean;
  sortOrder: number;
  quantity: number;
  lowStockThreshold: number;
}

export interface AdminImage {
  id?: string;
  url: string;
  altText: string;
}

export interface AdminProduct extends AdminProductBase {
  images: AdminImage[];
  variants: AdminVariant[];
  canDelete: boolean;
}

export interface ProductInput {
  categoryId: string;
  name: string;
  slug?: string;
  colorway: string;
  color: string;
  gender: Gender;
  description: string;
  material: string | null;
  tags: string[];
  pricePaise: number;
  compareAtPricePaise: number | null;
  status: ProductStatus;
  isFeatured: boolean;
}

export interface VariantInput {
  sizeLabel: string;
  sku: string;
  priceOverridePaise?: number | null;
  quantity: number;
  lowStockThreshold: number;
  isActive?: boolean;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface InventoryRow {
  variantId: string;
  productId: string;
  productName: string;
  colorway: string;
  productStatus: ProductStatus;
  sizeLabel: string;
  sku: string;
  isActive: boolean;
  quantity: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  placedAt: string;
  totalPaise: number;
  itemCount: number;
  customer: Customer;
}

export interface AdminOrder extends Order {
  customer: Customer;
  allowedTransitions: OrderStatus[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  orderCount: number;
  totalSpentPaise: number;
}
