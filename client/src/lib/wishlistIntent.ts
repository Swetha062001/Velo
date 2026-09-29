import type { QueryClient } from '@tanstack/react-query';
import { wishlistService } from '../services/wishlist.service.ts';

export const WISHLIST_KEY = ['wishlist'] as const;

const STORAGE_KEY = 'velo-pending-wishlist';

/**
 * A guest who taps a heart is sent to sign in; we remember which product so it can be
 * saved automatically afterwards (sessionStorage: this tab only, cleared on close).
 */
export function rememberWishlistIntent(productId: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, productId);
  } catch {
    // Storage unavailable (private mode) — the shopper can simply tap again.
  }
}

/** Reads and clears the remembered product id (null if none or storage is unavailable). */
function takeWishlistIntent(): string | null {
  try {
    const productId = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return productId;
  } catch {
    return null;
  }
}

export async function applyWishlistIntent(queryClient: QueryClient) {
  const productId = takeWishlistIntent();
  if (!productId) return;

  try {
    queryClient.setQueryData(WISHLIST_KEY, await wishlistService.add(productId));
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Could not save pending wishlist item', err);
  }
}
