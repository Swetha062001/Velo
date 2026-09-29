import { query, type Queryable } from '../../db/index.js';
import type { ProductImage } from '../products/products.types.js';

/** Everything needed to price and validate one variant, straight from the catalogue. */
export interface VariantSnapshotRow {
  variant_id: string;
  product_id: string;
  slug: string;
  name: string;
  colorway: string;
  size_label: string;
  sku: string;
  unit_price_paise: number;
  stock: number;
  low_stock_threshold: number;
  /** Product ACTIVE, category active and variant active. */
  purchasable: boolean;
  image: ProductImage | null;
}

export interface CartLineRow extends VariantSnapshotRow {
  item_id: string;
  quantity: number;
}

const SNAPSHOT_COLUMNS = `
  v.id AS variant_id, p.id AS product_id, p.slug, p.name, p.colorway,
  v.size_label, v.sku,
  COALESCE(v.price_override_paise, p.price_paise) AS unit_price_paise,
  i.quantity AS stock, i.low_stock_threshold,
  (p.status = 'ACTIVE' AND c.is_active AND v.is_active) AS purchasable,
  (SELECT jsonb_build_object('url', url, 'alt', alt_text) FROM product_images
   WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image`;

const SNAPSHOT_JOINS = `
  JOIN products p ON p.id = v.product_id
  JOIN categories c ON c.id = p.category_id
  JOIN inventory i ON i.variant_id = v.id`;

export const cartRepository = {
  /** Returns the user's cart id, creating the cart on first use. */
  async getOrCreateCartId(userId: string, db?: Queryable) {
    const rows = await query<{ id: string }>(
      `INSERT INTO carts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [userId],
      db,
    );
    return rows[0]!.id;
  },

  findLines(cartId: string, db?: Queryable) {
    return query<CartLineRow>(
      `SELECT ci.id AS item_id, ci.quantity, ${SNAPSHOT_COLUMNS}
       FROM cart_items ci
       JOIN product_variants v ON v.id = ci.variant_id
       ${SNAPSHOT_JOINS}
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at, ci.id`,
      [cartId],
      db,
    );
  },

  findVariantSnapshots(variantIds: string[], db?: Queryable) {
    if (variantIds.length === 0) return Promise.resolve([]);
    return query<VariantSnapshotRow>(
      `SELECT ${SNAPSHOT_COLUMNS}
       FROM product_variants v ${SNAPSHOT_JOINS}
       WHERE v.id = ANY($1::uuid[])`,
      [variantIds],
      db,
    );
  },

  async findItem(cartId: string, itemId: string, db?: Queryable) {
    const rows = await query<{ id: string; variant_id: string; quantity: number }>(
      `SELECT id, variant_id, quantity FROM cart_items WHERE id = $1 AND cart_id = $2`,
      [itemId, cartId],
      db,
    );
    return rows[0] ?? null;
  },

  async findItemByVariant(cartId: string, variantId: string, db?: Queryable) {
    const rows = await query<{ id: string; quantity: number }>(
      `SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2`,
      [cartId, variantId],
      db,
    );
    return rows[0] ?? null;
  },

  async countLines(cartId: string, db?: Queryable) {
    const rows = await query<{ n: number }>(
      `SELECT count(*) AS n FROM cart_items WHERE cart_id = $1`,
      [cartId],
      db,
    );
    return rows[0]!.n;
  },

  /** Sets the absolute quantity for a variant (insert or update). */
  async setQuantity(cartId: string, variantId: string, quantity: number, db?: Queryable) {
    await query(
      `INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [cartId, variantId, quantity],
      db,
    );
  },

  async removeItem(cartId: string, itemId: string, db?: Queryable) {
    const rows = await query<{ id: string }>(
      `DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING id`,
      [itemId, cartId],
      db,
    );
    return rows.length > 0;
  },

  async clear(cartId: string, db?: Queryable) {
    await query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId], db);
  },
};
