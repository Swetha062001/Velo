import { api } from '../lib/apiClient.ts';
import type { Cart, GuestCartItem, GuestQuote, MergeReport } from '../types/cart.ts';

export const cartService = {
  get: (signal?: AbortSignal) => api.get<Cart>('/cart', { signal }),
  addItem: (item: GuestCartItem) => api.post<Cart>('/cart/items', item),
  updateItem: (itemId: string, quantity: number) =>
    api.patch<Cart>(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete<Cart>(`/cart/items/${itemId}`),
  clear: () => api.delete<Cart>('/cart'),
  quote: (items: GuestCartItem[], signal?: AbortSignal) =>
    api.post<GuestQuote>('/cart/quote', { items }, { signal }),
  merge: (items: GuestCartItem[]) =>
    api.postWithMeta<Cart, { merge: MergeReport }>('/cart/merge', { items }),
};
