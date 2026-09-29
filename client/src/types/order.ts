export interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export type OrderStatus = 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'MOCK_CARD' | 'MOCK_UPI' | 'COD';

export type ShippingAddress = Omit<Address, 'id' | 'isDefault'>;

export interface OrderItem {
  id: string;
  productSlug: string | null;
  productName: string;
  colorway: string | null;
  sizeLabel: string;
  sku: string;
  imageUrl: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  placedAt: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  itemCount: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  canCancel: boolean;
}

export interface OrderSummary extends Omit<Order, 'items' | 'shippingAddress' | 'canCancel'> {
  previewImages: string[];
}

export interface OrderListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
