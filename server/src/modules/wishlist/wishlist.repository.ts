import { query, type Queryable } from '../../db/index.js';
import {
  SUMMARY_COLUMNS,
  SUMMARY_JOINS,
  VISIBLE,
  type ProductSummaryRow,
  type VariantRow,
} from '../products/products.repository.js';

export interface WishlistRow extends ProductSummaryRow {
  added_at: Date;
  /** False once the product is archived/drafted or its category is hidden. */
  available: boolean;
}

export const wishlistRepository = {
  /** Newest first. Unavailable products stay listed (flagged) so the shopper sees what changed. */
  list(userId: string, db?: Queryable) {
    return query<WishlistRow>(
      `SELECT ${SUMMARY_COLUMNS}, w.created_at AS added_at, (${VISIBLE}) AS available
       FROM wishlist_items w
       JOIN products p ON p.id = w.product_id
       ${SUMMARY_JOINS}
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC, p.id`,
      [userId],
      db,
    );
  },

  /** Sizes for several products in one query (for "move to bag" size pickers). */
  findVariantsForProducts(productIds: string[], db?: Queryable) {
    if (productIds.length === 0) return Promise.resolve([]);
    return query<VariantRow & { product_id: string }>(
      `SELECT v.product_id, v.id, v.size_label, v.sku,
              COALESCE(v.price_override_paise, p.price_paise) AS price_paise,
              v.is_active, i.quantity, i.low_stock_threshold
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       JOIN inventory i ON i.variant_id = v.id
       WHERE v.product_id = ANY($1::uuid[])
       ORDER BY v.product_id, v.sort_order, v.size_label`,
      [productIds],
      db,
    );
  },

  async isVisibleProduct(productId: string, db?: Queryable) {
    const rows = await query<{ ok: boolean }>(
      `SELECT true AS ok FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 AND ${VISIBLE}`,
      [productId],
      db,
    );
    return rows.length > 0;
  },

  async count(userId: string, db?: Queryable) {
    const rows = await query<{ n: number }>(
      `SELECT count(*) AS n FROM wishlist_items WHERE user_id = $1`,
      [userId],
      db,
    );
    return rows[0]!.n;
  },

  async contains(userId: string, productId: string, db?: Queryable) {
    const rows = await query(
      `SELECT 1 FROM wishlist_items WHERE user_id = $1 AND product_id = $2`,
      [userId, productId],
      db,
    );
    return rows.length > 0;
  },

  /** Idempotent. */
  async add(userId: string, productId: string, db?: Queryable) {
    await query(
      `INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [userId, productId],
      db,
    );
  },

  /** Idempotent. */
  async remove(userId: string, productId: string, db?: Queryable) {
    await query(
      `DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2`,
      [userId, productId],
      db,
    );
  },

  async variantBelongsToProduct(variantId: string, productId: string, db?: Queryable) {
    const rows = await query(
      `SELECT 1 FROM product_variants WHERE id = $1 AND product_id = $2`,
      [variantId, productId],
      db,
    );
    return rows.length > 0;
  },
};
