import type { QueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cart.service.ts';
import { useGuestCart } from '../store/guestCart.ts';

export const CART_KEY = ['cart'] as const;

/**
 * After sign-in / registration: move the guest bag into the account cart.
 * Failures never block signing in — the guest bag is simply kept for a later attempt.
 */
export async function mergeGuestCartIntoAccount(queryClient: QueryClient) {
  const { items, clear } = useGuestCart.getState();
  if (items.length === 0) return;

  try {
    const cart = await cartService.merge(items);
    clear();
    queryClient.setQueryData(CART_KEY, cart);
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Could not merge guest cart', err);
  }
}
