import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { CART_KEY } from '../lib/cartSync.ts';
import { WISHLIST_KEY } from '../lib/wishlistIntent.ts';
import { wishlistService } from '../services/wishlist.service.ts';
import type { ProductSummary } from '../types/catalog.ts';
import type { Wishlist } from '../types/wishlist.ts';
import { useCurrentUser } from './useAuth.ts';

/** The signed-in user's wishlist (disabled for guests). */
export function useWishlist() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: WISHLIST_KEY,
    queryFn: ({ signal }) => wishlistService.get(signal),
    enabled: Boolean(user),
  });
}

/** Product ids on the wishlist, for heart buttons across grids. */
export function useWishlistIds() {
  const { data } = useWishlist();
  return useMemo(() => new Set(data?.items.map((i) => i.productId) ?? []), [data]);
}

/** Save / unsave with an optimistic heart; rolls back if the request fails. */
export function useToggleWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ product, saved }: { product: ProductSummary; saved: boolean }) =>
      saved ? wishlistService.remove(product.id) : wishlistService.add(product.id),

    onMutate: async ({ product, saved }) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_KEY });
      const previous = queryClient.getQueryData<Wishlist>(WISHLIST_KEY);
      if (previous) {
        const items = saved
          ? previous.items.filter((i) => i.productId !== product.id)
          : [
              {
                productId: product.id,
                addedAt: new Date().toISOString(),
                available: true,
                product,
                variants: [],
              },
              ...previous.items,
            ];
        queryClient.setQueryData<Wishlist>(WISHLIST_KEY, { items, count: items.length });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(WISHLIST_KEY, context.previous);
    },
    onSuccess: (wishlist) => queryClient.setQueryData(WISHLIST_KEY, wishlist),
  });
}

export function useMoveToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId: string }) =>
      wishlistService.moveToCart(productId, variantId),
    onSuccess: ({ cart, wishlist }) => {
      queryClient.setQueryData(CART_KEY, cart);
      queryClient.setQueryData(WISHLIST_KEY, wishlist);
    },
  });
}
