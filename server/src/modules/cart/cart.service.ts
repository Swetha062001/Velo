import type { PoolClient } from 'pg';
import { MAX_CART_LINES, MAX_QUANTITY_PER_ITEM } from '../../config/commerce.js';
import { withTransaction, type Queryable } from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { buildCart, evaluateLine, type Cart } from './cart.pricing.js';
import { cartRepository, type VariantSnapshotRow } from './cart.repository.js';
import type { CartLineInput } from './cart.schemas.js';

/** Combines duplicate variants from a guest cart (quantities summed, capped). */
function dedupe(items: CartLineInput[]) {
  const byVariant = new Map<string, number>();
  for (const { variantId, quantity } of items) {
    byVariant.set(
      variantId,
      Math.min((byVariant.get(variantId) ?? 0) + quantity, MAX_QUANTITY_PER_ITEM),
    );
  }
  return [...byVariant].map(([variantId, quantity]) => ({ variantId, quantity }));
}

async function loadCart(cartId: string, db?: Queryable): Promise<Cart> {
  const rows = await cartRepository.findLines(cartId, db);
  return buildCart(rows.map((row) => evaluateLine(row, row.quantity, row.item_id)));
}

async function requireVariant(variantId: string, db: Queryable) {
  const [snapshot] = await cartRepository.findVariantSnapshots([variantId], db);
  if (!snapshot) throw AppError.notFound('Product not found');
  return snapshot;
}

/** Throws a clear 409 when a quantity can't be satisfied from current stock. */
function assertCanHold(snapshot: VariantSnapshotRow, quantity: number) {
  if (!snapshot.purchasable) {
    throw new AppError(409, 'UNAVAILABLE', 'This product is no longer available');
  }
  if (snapshot.stock <= 0) {
    throw new AppError(409, 'OUT_OF_STOCK', `${snapshot.size_label} is sold out`);
  }
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    throw new AppError(
      409,
      'QUANTITY_LIMIT',
      `You can have at most ${MAX_QUANTITY_PER_ITEM} of one item in your bag`,
    );
  }
  if (quantity > snapshot.stock) {
    throw new AppError(
      409,
      'INSUFFICIENT_STOCK',
      `Only ${snapshot.stock} left in ${snapshot.size_label}`,
      {
        available: snapshot.stock,
      },
    );
  }
}

/**
 * Runs a cart mutation in a transaction. getOrCreateCartId's upsert row-locks the cart,
 * so concurrent requests for the same user are applied one at a time.
 */
/** What a guest-cart merge had to change (counts of lines). */
export interface MergeReport {
  reduced: number;
  unavailable: number;
  cartFull: number;
}

function mutateCart<T>(userId: string, fn: (cartId: string, client: PoolClient) => Promise<T>) {
  return withTransaction(async (client) => {
    const cartId = await cartRepository.getOrCreateCartId(userId, client);
    await fn(cartId, client);
    return loadCart(cartId, client);
  });
}

export const cartService = {
  async getCart(userId: string) {
    return loadCart(await cartRepository.getOrCreateCartId(userId));
  },

  /** Adds to any existing quantity of the same size. */
  addItem(userId: string, input: CartLineInput) {
    return mutateCart(userId, async (cartId, client) => {
      const snapshot = await requireVariant(input.variantId, client);
      const existing = await cartRepository.findItemByVariant(cartId, input.variantId, client);

      if (!existing && (await cartRepository.countLines(cartId, client)) >= MAX_CART_LINES) {
        throw new AppError(
          409,
          'CART_FULL',
          `Your bag can hold up to ${MAX_CART_LINES} different items`,
        );
      }

      const quantity = (existing?.quantity ?? 0) + input.quantity;
      assertCanHold(snapshot, quantity);
      await cartRepository.setQuantity(cartId, input.variantId, quantity, client);
    });
  },

  /** Sets an absolute quantity on one of the user's own cart items. */
  updateItem(userId: string, itemId: string, quantity: number) {
    return mutateCart(userId, async (cartId, client) => {
      const item = await cartRepository.findItem(cartId, itemId, client);
      if (!item) throw AppError.notFound('Item not found in your bag');

      assertCanHold(await requireVariant(item.variant_id, client), quantity);
      await cartRepository.setQuantity(cartId, item.variant_id, quantity, client);
    });
  },

  removeItem(userId: string, itemId: string) {
    return mutateCart(userId, async (cartId, client) => {
      if (!(await cartRepository.removeItem(cartId, itemId, client))) {
        throw AppError.notFound('Item not found in your bag');
      }
    });
  },

  clear(userId: string) {
    return mutateCart(userId, (cartId, client) => cartRepository.clear(cartId, client));
  },

  /**
   * Prices a guest cart held in the browser. Nothing is stored; unknown variant ids are
   * reported so the client can drop them.
   */
  async quote(items: CartLineInput[]): Promise<Cart & { unavailableVariantIds: string[] }> {
    const lines = dedupe(items);
    const snapshots = await cartRepository.findVariantSnapshots(lines.map((l) => l.variantId));
    const byId = new Map(snapshots.map((s) => [s.variant_id, s]));

    const priced = lines.flatMap(({ variantId, quantity }) => {
      const snapshot = byId.get(variantId);
      return snapshot ? [evaluateLine(snapshot, quantity, variantId)] : [];
    });

    return {
      ...buildCart(priced),
      unavailableVariantIds: lines.map((l) => l.variantId).filter((id) => !byId.has(id)),
    };
  },

  /**
   * Moves a guest cart into the user's cart after sign-in. Quantities combine with what's
   * already there, clamped to stock and the per-item cap; unavailable items are skipped.
   * Returns the cart plus a report of anything that couldn't be moved as-is.
   */
  async merge(userId: string, items: CartLineInput[]) {
    const report: MergeReport = { reduced: 0, unavailable: 0, cartFull: 0 };
    const cart = await mutateCart(userId, async (cartId, client) => {
      const lines = dedupe(items);
      const snapshots = await cartRepository.findVariantSnapshots(
        lines.map((l) => l.variantId),
        client,
      );
      const byId = new Map(snapshots.map((s) => [s.variant_id, s]));
      let lineCount = await cartRepository.countLines(cartId, client);

      for (const { variantId, quantity } of lines) {
        const snapshot = byId.get(variantId);
        if (!snapshot?.purchasable || snapshot.stock <= 0) {
          report.unavailable++;
          continue;
        }

        const existing = await cartRepository.findItemByVariant(cartId, variantId, client);
        if (!existing && lineCount >= MAX_CART_LINES) {
          report.cartFull++;
          continue;
        }

        const wanted = (existing?.quantity ?? 0) + quantity;
        const merged = Math.min(wanted, MAX_QUANTITY_PER_ITEM, snapshot.stock);
        if (merged < wanted) report.reduced++;
        await cartRepository.setQuantity(cartId, variantId, merged, client);
        if (!existing) lineCount++;
      }
    });
    return { cart, report };
  },
};
