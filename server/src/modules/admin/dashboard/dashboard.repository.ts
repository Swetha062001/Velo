import { query } from '../../../db/index.js';

/** Business day boundaries for an Indian store. */
const TZ = 'Asia/Kolkata';

export const dashboardRepository = {
  async totals() {
    const rows = await query<{
      revenue_paise: number;
      order_count: number;
      customer_count: number;
      active_products: number;
      draft_products: number;
      archived_products: number;
    }>(`
      SELECT
        (SELECT COALESCE(sum(total_paise), 0) FROM orders WHERE status <> 'CANCELLED') AS revenue_paise,
        (SELECT count(*) FROM orders) AS order_count,
        (SELECT count(*) FROM users WHERE role = 'USER') AS customer_count,
        (SELECT count(*) FROM products WHERE status = 'ACTIVE') AS active_products,
        (SELECT count(*) FROM products WHERE status = 'DRAFT') AS draft_products,
        (SELECT count(*) FROM products WHERE status = 'ARCHIVED') AS archived_products`);
    return rows[0]!;
  },

  ordersByStatus() {
    return query<{ status: string; count: number }>(
      `SELECT status, count(*) AS count FROM orders GROUP BY status`,
    );
  },

  /** Revenue per day (excluding cancelled orders) for the last `days` days, zero-filled. */
  revenueByDay(days: number) {
    return query<{ day: string; revenue_paise: number; orders: number }>(
      `WITH days AS (
         SELECT generate_series(
           (now() AT TIME ZONE $2)::date - ($1::int - 1),
           (now() AT TIME ZONE $2)::date,
           interval '1 day'
         )::date AS day
       )
       SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              COALESCE(sum(o.total_paise), 0) AS revenue_paise,
              count(o.id) AS orders
       FROM days d
       LEFT JOIN orders o
         ON (o.placed_at AT TIME ZONE $2)::date = d.day AND o.status <> 'CANCELLED'
       GROUP BY d.day
       ORDER BY d.day`,
      [days, TZ],
    );
  },

  /** Active sizes of live products at or below their low-stock threshold. */
  lowStock(limit: number) {
    return query<{
      variant_id: string;
      product_id: string;
      product_name: string;
      colorway: string;
      size_label: string;
      sku: string;
      quantity: number;
      low_stock_threshold: number;
      total: number;
    }>(
      `SELECT v.id AS variant_id, p.id AS product_id, p.name AS product_name, p.colorway,
              v.size_label, v.sku, i.quantity, i.low_stock_threshold,
              count(*) OVER () AS total
       FROM inventory i
       JOIN product_variants v ON v.id = i.variant_id
       JOIN products p ON p.id = v.product_id
       WHERE p.status = 'ACTIVE' AND v.is_active AND i.quantity <= i.low_stock_threshold
       ORDER BY i.quantity ASC, p.name, v.sort_order
       LIMIT $1`,
      [limit],
    );
  },

  recentOrders(limit: number) {
    return query<{
      order_number: string;
      status: string;
      total_paise: number;
      placed_at: Date;
      customer_name: string;
    }>(
      `SELECT o.order_number, o.status, o.total_paise, o.placed_at, u.name AS customer_name
       FROM orders o JOIN users u ON u.id = o.user_id
       ORDER BY o.placed_at DESC LIMIT $1`,
      [limit],
    );
  },
};
