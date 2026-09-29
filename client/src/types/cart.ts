import type { ProductImage, StockStatus } from './catalog.ts';

export type CartIssue = 'unavailable' | 'out_of_stock' | 'insufficient_stock';

export interface CartLine {
  /** Cart item id (signed in) or variant id (guest). */
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorway: string;
  sizeLabel: string;
  sku: string;
  image: ProductImage | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  maxQuantity: number;
  stockStatus: StockStatus;
  issue: CartIssue | null;
}

/** Always calculated by the server. */
export interface Cart {
  items: CartLine[];
  itemCount: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  freeShippingThresholdPaise: number;
  amountToFreeShippingPaise: number;
  hasIssues: boolean;
}

export interface GuestQuote extends Cart {
  unavailableVariantIds: string[];
}

/** What the browser stores for a guest: ids and quantities only — never prices. */
export interface GuestCartItem {
  variantId: string;
  quantity: number;
}

/** What the server had to change when moving the guest bag into the account (line counts). */
export interface MergeReport {
  reduced: number;
  unavailable: number;
  cartFull: number;
}
