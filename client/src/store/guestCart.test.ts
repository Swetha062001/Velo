import { describe, expect, it, vi } from 'vitest';

/** Loads a fresh store instance that rehydrates from whatever is in localStorage. */
async function loadWith(stored: unknown) {
  localStorage.setItem('velo-guest-cart', JSON.stringify({ state: stored, version: 1 }));
  vi.resetModules();
  const { useGuestCart } = await import('./guestCart.ts');
  return useGuestCart.getState().items;
}

describe('guest cart (localStorage is user-editable)', () => {
  it('keeps well-formed items', async () => {
    const items = [{ variantId: 'a', quantity: 2 }];
    expect(await loadWith({ items })).toEqual(items);
  });

  it('drops tampered entries and caps the number of lines', async () => {
    const items = await loadWith({
      items: [
        { variantId: 'ok', quantity: 1 },
        { variantId: 'zero', quantity: 0 },
        { variantId: 'huge', quantity: 999 },
        { variantId: 'frac', quantity: 1.5 },
        { variantId: 42, quantity: 1 },
        { variantId: 'price', quantity: 1, pricePaise: 1 },
        null,
        ...Array.from({ length: 30 }, (_, i) => ({ variantId: `v${i}`, quantity: 1 })),
      ],
    });
    expect(items[0]).toEqual({ variantId: 'ok', quantity: 1 });
    expect(items.map((i) => i.variantId)).not.toContain('huge');
    expect(items.map((i) => i.variantId)).not.toContain('zero');
    expect(items).toHaveLength(20);
  });

  it('survives garbage in storage', async () => {
    expect(await loadWith('not an object')).toEqual([]);
  });
});
