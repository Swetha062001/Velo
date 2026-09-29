import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GuestCartItem } from '../types/cart.ts';

export const MAX_QUANTITY_PER_ITEM = 10;

interface GuestCartState {
  items: GuestCartItem[];
  setItems: (items: GuestCartItem[]) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantIds: string[]) => void;
  clear: () => void;
}

const isValidItem = (item: unknown): item is GuestCartItem =>
  typeof item === 'object' &&
  item !== null &&
  typeof (item as GuestCartItem).variantId === 'string' &&
  Number.isInteger((item as GuestCartItem).quantity) &&
  (item as GuestCartItem).quantity >= 1 &&
  (item as GuestCartItem).quantity <= MAX_QUANTITY_PER_ITEM;

/**
 * Signed-out shoppers' bag, persisted in localStorage. It holds variant ids and quantities
 * only; every price is fetched from the server (/cart/quote). On sign-in it is merged into
 * the account cart and cleared.
 */
export const useGuestCart = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],
      setItems: (items) => set({ items }),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        })),
      remove: (variantIds) =>
        set((state) => ({ items: state.items.filter((i) => !variantIds.includes(i.variantId)) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'velo-guest-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      // localStorage is user-editable: keep only well-formed entries.
      merge: (persisted, current) => {
        const items = (persisted as { items?: unknown })?.items;
        return {
          ...current,
          items: Array.isArray(items) ? items.filter(isValidItem).slice(0, 20) : [],
        };
      },
    },
  ),
);
