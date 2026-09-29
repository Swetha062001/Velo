import { api } from '../lib/apiClient.ts';
import type { MoveToCartResult, Wishlist } from '../types/wishlist.ts';

export const wishlistService = {
  get: (signal?: AbortSignal) => api.get<Wishlist>('/wishlist', { signal }),
  add: (productId: string) => api.post<Wishlist>('/wishlist', { productId }),
  remove: (productId: string) => api.delete<Wishlist>(`/wishlist/${productId}`),
  moveToCart: (productId: string, variantId: string) =>
    api.post<MoveToCartResult>(`/wishlist/${productId}/move-to-cart`, { variantId }),
};
