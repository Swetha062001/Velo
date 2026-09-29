import type { QueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cart.service.ts';
import { useGuestCart } from '../store/guestCart.ts';
import { useUi } from '../store/ui.ts';
import type { MergeReport } from '../types/cart.ts';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Plain-English summary of what the merge changed, or null if everything moved as-is. */
export function describeMerge({ reduced, unavailable, cartFull }: MergeReport) {
  const parts = [
    reduced &&
      `${plural(reduced, 'quantity was', 'quantities were')} lowered to what's in stock (max 10 per item)`,
    unavailable && `${plural(unavailable, 'item is', 'items are')} no longer available`,
    cartFull &&
      `${plural(cartFull, "item didn't", "items didn't")} fit — a bag holds up to 20 items`,
  ].filter(Boolean);
  return parts.length ? `We added your saved bag, but ${parts.join('; ')}.` : null;
}

export const CART_KEY = ['cart'] as const;

/**
 * After sign-in / registration: move the guest bag into the account cart.
 * Failures never block signing in — the guest bag is simply kept for a later attempt.
 */
export async function mergeGuestCartIntoAccount(queryClient: QueryClient) {
  const { items, clear } = useGuestCart.getState();
  if (items.length === 0) return;

  try {
    const { data: cart, meta } = await cartService.merge(items);
    clear();
    queryClient.setQueryData(CART_KEY, cart);
    if (meta?.merge) useUi.getState().setCartNotice(describeMerge(meta.merge));
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Could not merge guest cart', err);
  }
}
