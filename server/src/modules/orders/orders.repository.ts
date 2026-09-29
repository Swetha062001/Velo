import { query, type Queryable } from '../../db/index.js';

export type OrderStatus = 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface ShippingAddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  shipping_address: ShippingAddressSnapshot;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  placed_at: Date;
}

export interface OrderItemRow {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  product_slug: string | null;
  colorway: string | null;
  size_label: string;
  sku: string;
  image_url: string | null;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
}

export interface OrderListRow extends OrderRow {
  item_count: number;
  preview_images: string[];
  total_count: number;
}

const ORDER_COLUMNS = `o.id, o.order_number, o.user_id, o.status, o.payment_status, o.payment_method,
  o.shipping_address, o.subtotal_paise, o.shipping_paise, o.total_paise, o.placed_at`;

export const ordersRepository = {
  async findByIdempotencyKey(userId: string, key: string, db?: Queryable) {
    const rows = await query<{ order_number: string }>(
      `SELECT order_number FROM orders WHERE user_id = $1 AND idempotency_key = $2`,
      [userId, key],
      db,
    );
    return rows[0] ?? null;
  },

  /**
   * Row-locks stock for the given variants until the transaction ends. Locking in a fixed
   * (id) order means two checkouts touching the same variants can't deadlock.
   */
  async lockInventory(variantIds: string[], db: Queryable) {
    await query(
      `SELECT variant_id FROM inventory WHERE variant_id = ANY($1::uuid[])
       ORDER BY variant_id FOR UPDATE`,
      [variantIds],
      db,
    );
  },

  async insertOrder(
    order: {
      userId: string;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      paymentMethod: string;
      shippingAddress: ShippingAddressSnapshot;
      subtotalPaise: number;
      shippingPaise: number;
      totalPaise: number;
      idempotencyKey: string;
    },
    db: Queryable,
  ) {
    const rows = await query<{ id: string; order_number: string }>(
      `INSERT INTO orders
         (user_id, status, payment_status, payment_method, shipping_address,
          subtotal_paise, shipping_paise, total_paise, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, order_number`,
      [
        order.userId,
        order.status,
        order.paymentStatus,
        order.paymentMethod,
        JSON.stringify(order.shippingAddress),
        order.subtotalPaise,
        order.shippingPaise,
        order.totalPaise,
        order.idempotencyKey,
      ],
      db,
    );
    return rows[0]!;
  },

  async insertItem(orderId: string, item: Omit<OrderItemRow, 'id'>, db: Queryable) {
    await query(
      `INSERT INTO order_items
         (order_id, product_id, variant_id, product_name, product_slug, colorway, size_label,
          sku, image_url, unit_price_paise, quantity, line_total_paise)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        orderId,
        item.product_id,
        item.variant_id,
        item.product_name,
        item.product_slug,
        item.colorway,
        item.size_label,
        item.sku,
        item.image_url,
        item.unit_price_paise,
        item.quantity,
        item.line_total_paise,
      ],
      db,
    );
  },

  /** Conditional decrement — never goes below zero. Returns false if stock was insufficient. */
  async decrementStock(variantId: string, quantity: number, db: Queryable) {
    const result = await db.query(
      `UPDATE inventory SET quantity = quantity - $2 WHERE variant_id = $1 AND quantity >= $2`,
      [variantId, quantity],
    );
    return result.rowCount === 1;
  },

  async incrementStock(variantId: string, quantity: number, db: Queryable) {
    await db.query(`UPDATE inventory SET quantity = quantity + $2 WHERE variant_id = $1`, [
      variantId,
      quantity,
    ]);
  },

  async findForUser(userId: string, orderNumber: string, db?: Queryable) {
    const rows = await query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.order_number = $1 AND o.user_id = $2`,
      [orderNumber, userId],
      db,
    );
    return rows[0] ?? null;
  },

  async lockForUser(userId: string, orderNumber: string, db: Queryable) {
    const rows = await query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.order_number = $1 AND o.user_id = $2 FOR UPDATE`,
      [orderNumber, userId],
      db,
    );
    return rows[0] ?? null;
  },

  findItems(orderId: string, db?: Queryable) {
    return query<OrderItemRow>(
      `SELECT id, product_id, variant_id, product_name, product_slug, colorway, size_label, sku,
              image_url, unit_price_paise, quantity, line_total_paise
       FROM order_items WHERE order_id = $1 ORDER BY created_at, id`,
      [orderId],
      db,
    );
  },

  listForUser(userId: string, limit: number, offset: number) {
    return query<OrderListRow>(
      `SELECT ${ORDER_COLUMNS},
              (SELECT COALESCE(sum(quantity), 0) FROM order_items WHERE order_id = o.id) AS item_count,
              (SELECT COALESCE(jsonb_agg(t.image_url), '[]'::jsonb) FROM (
                 SELECT image_url FROM order_items WHERE order_id = o.id AND image_url IS NOT NULL
                 ORDER BY created_at, id LIMIT 3) t) AS preview_images,
              count(*) OVER () AS total_count
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.placed_at DESC, o.id
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
  },

  async countForUser(userId: string) {
    const rows = await query<{ n: number }>(`SELECT count(*) AS n FROM orders WHERE user_id = $1`, [
      userId,
    ]);
    return rows[0]!.n;
  },

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    paymentStatus: PaymentStatus,
    db: Queryable,
  ) {
    await db.query(`UPDATE orders SET status = $2, payment_status = $3 WHERE id = $1`, [
      orderId,
      status,
      paymentStatus,
    ]);
  },
};
