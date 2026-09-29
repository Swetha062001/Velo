import { AppError } from '../../utils/AppError.js';
import { cartService } from '../cart/cart.service.js';
import { toSummary, toVariant } from '../products/products.service.js';
import type { ProductSummary, ProductVariant } from '../products/products.types.js';
import { wishlistRepository } from './wishlist.repository.js';

export const MAX_WISHLIST_ITEMS = 100;

export interface WishlistItem {
  productId: string;
  addedAt: string;
  available: boolean;
  product: ProductSummary;
  /** Sizes with public stock status, for choosing a size when moving to the bag. */
  variants: ProductVariant[];
}

export interface Wishlist {
  items: WishlistItem[];
  count: number;
}

async function loadWishlist(userId: string): Promise<Wishlist> {
  const rows = await wishlistRepository.list(userId);
  const variants = await wishlistRepository.findVariantsForProducts(rows.map((r) => r.id));

  const byProduct = new Map<string, ProductVariant[]>();
  for (const v of variants) {
    const list = byProduct.get(v.product_id) ?? [];
    list.push(toVariant(v));
    byProduct.set(v.product_id, list);
  }

  const items = rows.map((row) => ({
    productId: row.id,
    addedAt: row.added_at.toISOString(),
    available: row.available,
    product: toSummary(row),
    variants: row.available ? (byProduct.get(row.id) ?? []) : [],
  }));

  return { items, count: items.length };
}

export const wishlistService = {
  get: loadWishlist,

  async add(userId: string, productId: string) {
    if (!(await wishlistRepository.isVisibleProduct(productId))) {
      throw AppError.notFound('Product not found');
    }
    const alreadySaved = await wishlistRepository.contains(userId, productId);
    if (!alreadySaved && (await wishlistRepository.count(userId)) >= MAX_WISHLIST_ITEMS) {
      throw new AppError(
        409,
        'WISHLIST_FULL',
        `Your wishlist can hold up to ${MAX_WISHLIST_ITEMS} items`,
      );
    }
    await wishlistRepository.add(userId, productId);
    return loadWishlist(userId);
  },

  async remove(userId: string, productId: string) {
    await wishlistRepository.remove(userId, productId);
    return loadWishlist(userId);
  },

  /**
   * Adds the chosen size to the bag (same stock and price rules as any add), then removes
   * the product from the wishlist. If the add fails, the wishlist is left untouched.
   */
  async moveToCart(userId: string, productId: string, variantId: string) {
    if (!(await wishlistRepository.contains(userId, productId))) {
      throw AppError.notFound('This product is not in your wishlist');
    }
    if (!(await wishlistRepository.variantBelongsToProduct(variantId, productId))) {
      throw AppError.badRequest('That size does not belong to this product', [
        { path: 'body.variantId', message: 'Choose a size for this product' },
      ]);
    }

    const cart = await cartService.addItem(userId, { variantId, quantity: 1 });
    await wishlistRepository.remove(userId, productId);
    return { cart, wishlist: await loadWishlist(userId) };
  },
};
