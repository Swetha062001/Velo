import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/apiClient.ts';
import { CART_KEY } from '../lib/cartSync.ts';
import { cartService } from '../services/cart.service.ts';
import { MAX_QUANTITY_PER_ITEM, useGuestCart } from '../store/guestCart.ts';
import type { Cart, CartLine, GuestCartItem } from '../types/cart.ts';
import { useCurrentUser } from './useAuth.ts';

const guestKey = (items: GuestCartItem[]) => ['cart', 'guest', items] as const;

export const EMPTY_CART: Cart = {
  items: [],
  itemCount: 0,
  subtotalPaise: 0,
  shippingPaise: 0,
  totalPaise: 0,
  freeShippingThresholdPaise: 299900,
  amountToFreeShippingPaise: 0,
  hasIssues: false,
};

/** Prices a guest bag on the server and drops variants that no longer exist. */
async function quoteGuestCart(items: GuestCartItem[], signal?: AbortSignal): Promise<Cart> {
  try {
    const quote = await cartService.quote(items, signal);
    if (quote.unavailableVariantIds.length) {
      useGuestCart.getState().remove(quote.unavailableVariantIds);
    }
    return quote;
  } catch (err) {
    // A malformed stored bag can't be priced — start fresh rather than erroring forever.
    if (err instanceof ApiError && err.status === 400) {
      useGuestCart.getState().clear();
      return EMPTY_CART;
    }
    throw err;
  }
}

/**
 * The shopper's bag — account cart when signed in, browser-stored guest bag otherwise.
 * Either way, prices and totals come from the server.
 */
export function useCart() {
  const auth = useCurrentUser();
  const signedIn = Boolean(auth.data);
  const guestItems = useGuestCart((s) => s.items);

  const server = useQuery({
    queryKey: CART_KEY,
    queryFn: ({ signal }) => cartService.get(signal),
    enabled: signedIn,
  });

  const guest = useQuery({
    queryKey: guestKey(guestItems),
    queryFn: ({ signal }) => quoteGuestCart(guestItems, signal),
    enabled: !auth.isPending && !signedIn && guestItems.length > 0,
    placeholderData: keepPreviousData,
  });

  if (auth.isPending) {
    return { cart: undefined, isPending: true, isError: false, signedIn, refetch: server.refetch };
  }
  if (signedIn) {
    return {
      cart: server.data,
      isPending: server.isPending,
      isError: server.isError,
      signedIn,
      refetch: server.refetch,
    };
  }
  if (guestItems.length === 0) {
    return { cart: EMPTY_CART, isPending: false, isError: false, signedIn, refetch: guest.refetch };
  }
  return {
    cart: guest.data,
    isPending: guest.isPending,
    isError: guest.isError,
    signedIn,
    refetch: guest.refetch,
  };
}

/** Error in the same shape the API uses, for guest-side checks. */
const cartError = (code: string, message: string) => new ApiError(409, code, message);

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: async (item: GuestCartItem): Promise<Cart> => {
      if (user) return cartService.addItem(item);

      // Guest: validate the prospective bag with the server before saving it locally.
      const { items, setItems } = useGuestCart.getState();
      const existing = items.find((i) => i.variantId === item.variantId);
      const quantity = (existing?.quantity ?? 0) + item.quantity;
      if (quantity > MAX_QUANTITY_PER_ITEM) {
        throw cartError(
          'QUANTITY_LIMIT',
          `You can have at most ${MAX_QUANTITY_PER_ITEM} of one item in your bag`,
        );
      }

      const next = existing
        ? items.map((i) => (i.variantId === item.variantId ? { ...i, quantity } : i))
        : [...items, { variantId: item.variantId, quantity }];
      const quote = await cartService.quote(next);
      const line = quote.items.find((l) => l.variantId === item.variantId);

      if (!line || line.issue === 'unavailable') {
        throw cartError('UNAVAILABLE', 'This product is no longer available');
      }
      if (line.issue === 'out_of_stock') {
        throw cartError('OUT_OF_STOCK', `${line.sizeLabel} is sold out`);
      }
      if (line.issue === 'insufficient_stock') {
        throw cartError('INSUFFICIENT_STOCK', `Only ${line.maxQuantity} left in ${line.sizeLabel}`);
      }

      setItems(next);
      queryClient.setQueryData(guestKey(next), quote);
      return quote;
    },
    onSuccess: (cart) => {
      if (user) queryClient.setQueryData(CART_KEY, cart);
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ line, quantity }: { line: CartLine; quantity: number }) => {
      if (user) return cartService.updateItem(line.id, quantity);
      useGuestCart.getState().setQuantity(line.variantId, quantity); // re-quoted by useCart
      return null;
    },
    onSuccess: (cart) => {
      if (cart) queryClient.setQueryData(CART_KEY, cart);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: async (line: CartLine) => {
      if (user) return cartService.removeItem(line.id);
      useGuestCart.getState().remove([line.variantId]);
      return null;
    },
    onSuccess: (cart) => {
      if (cart) queryClient.setQueryData(CART_KEY, cart);
    },
  });
}
