import { create } from 'zustand';

interface UiState {
  cartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  assistantOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
}

/** Cross-component UI state (not server data — that lives in TanStack Query). */
export const useUi = create<UiState>()((set) => ({
  cartDrawerOpen: false,
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
  assistantOpen: false,
  openAssistant: () => set({ assistantOpen: true }),
  closeAssistant: () => set({ assistantOpen: false }),
}));
