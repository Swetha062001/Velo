import { z } from 'zod';
import { query, withTransaction } from '../../../db/index.js';
import { AppError } from '../../../utils/AppError.js';
import { paginationMeta, paginationQuerySchema, toOffset } from '../../../utils/pagination.js';
import {
  ordersRepository,
  type OrderRow,
  type OrderStatus,
} from '../../orders/orders.repository.js';
import {
  cancelOrderInTransaction,
  ORDER_TRANSITIONS,
  toOrderDto,
} from '../../orders/orders.service.js';

const STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

/* ── Schemas ─────────────────────────────────────────────────────────────── */

export const listAdminOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.preprocess((v) => (v === '' ? undefined : v), z.enum(STATUSES).optional()),
  /** Order number or customer email/name. */
  q: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(100).optional()),
});

export const updateOrderStatusSchema = z.object({ status: z.enum(STATUSES) });

export const adminOrderNumberParam = z.object({
  orderNumber: z.string().regex(/^VELO-\d{4}-\d{6,}$/, 'Invalid order number'),
});

export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersQuerySchema>;

/* ── Queries ─────────────────────────────────────────────────────────────── */

const ORDER_COLUMNS = `o.id, o.order_number, o.user_id, o.status, o.payment_status, o.payment_method,
  o.shipping_address, o.subtotal_paise, o.shipping_paise, o.total_paise, o.placed_at`;

interface AdminOrderRow extends OrderRow {
  customer_name: string;
  customer_email: string;
  item_count: number;
  total_count: number;
}

async function findByNumber(orderNumber: string, lock = false, db?: Parameters<typeof query>[2]) {
  const rows = await query<OrderRow & { customer_name: string; customer_email: string }>(
    `SELECT ${ORDER_COLUMNS}, u.name AS customer_name, u.email AS customer_email
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.order_number = $1 ${lock ? 'FOR UPDATE OF o' : ''}`,
    [orderNumber],
    db,
  );
  return rows[0] ?? null;
}

async function loadDetail(orderNumber: string) {
  const order = await findByNumber(orderNumber);
  if (!order) throw AppError.notFound('Order not found');
  const items = await ordersRepository.findItems(order.id);
  return {
    ...toOrderDto(order, items),
    customer: { id: order.user_id, name: order.customer_name, email: order.customer_email },
    allowedTransitions: ORDER_TRANSITIONS[order.status],
  };
}

/* ── Service ─────────────────────────────────────────────────────────────── */

export const adminOrdersService = {
  async list(q: ListAdminOrdersQuery) {
    const params: unknown[] = [];
    const where: string[] = [];
    if (q.status) {
      params.push(q.status);
      where.push(`o.status = $${params.length}`);
    }
    if (q.q) {
      params.push(`%${q.q}%`);
      where.push(
        `(o.order_number ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.name ILIKE $${params.length})`,
      );
    }
    params.push(q.limit, toOffset(q));

    const rows = await query<AdminOrderRow>(
      `SELECT ${ORDER_COLUMNS}, u.name AS customer_name, u.email AS customer_email,
              (SELECT COALESCE(sum(quantity), 0) FROM order_items WHERE order_id = o.id) AS item_count,
              count(*) OVER () AS total_count
       FROM orders o JOIN users u ON u.id = o.user_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY o.placed_at DESC, o.id
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        paymentStatus: o.payment_status,
        paymentMethod: o.payment_method,
        placedAt: o.placed_at.toISOString(),
        totalPaise: o.total_paise,
        itemCount: o.item_count,
        customer: { id: o.user_id, name: o.customer_name, email: o.customer_email },
      })),
      meta: paginationMeta(q, rows[0]?.total_count ?? 0),
    };
  },

  get: loadDetail,

  /**
   * Moves an order along its lifecycle. Only transitions in ORDER_TRANSITIONS are allowed;
   * cancelling restocks and refunds; delivering a cash-on-delivery order marks it paid.
   */
  async updateStatus(orderNumber: string, next: OrderStatus) {
    await withTransaction(async (client) => {
      const order = await findByNumber(orderNumber, true, client);
      if (!order) throw AppError.notFound('Order not found');

      if (!ORDER_TRANSITIONS[order.status].includes(next)) {
        throw new AppError(
          409,
          'INVALID_TRANSITION',
          `An order that is ${order.status.toLowerCase()} can't be marked ${next.toLowerCase()}`,
          { allowed: ORDER_TRANSITIONS[order.status] },
        );
      }

      if (next === 'CANCELLED') {
        await cancelOrderInTransaction(order, client);
      } else {
        const payment =
          next === 'DELIVERED' && order.payment_method === 'COD' ? 'PAID' : order.payment_status;
        await ordersRepository.updateStatus(order.id, next, payment, client);
      }
    });
    return loadDetail(orderNumber);
  },
};
