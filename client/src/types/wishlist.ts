import type { Cart } from './cart.ts';
import type { ProductSummary, ProductVariant } from './catalog.ts';

export interface WishlistItem {
  productId: string;
  addedAt: string;
  available: boolean;
  product: ProductSummary;
  variants: ProductVariant[];
}

export interface Wishlist {
  items: WishlistItem[];
  count: number;
}

export interface MoveToCartResult {
  cart: Cart;
  wishlist: Wishlist;
}
