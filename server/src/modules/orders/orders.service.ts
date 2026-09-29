import type { PoolClient } from 'pg';
import { withTransaction } from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { paginationMeta, toOffset, type PaginationQuery } from '../../utils/pagination.js';
import { addressesService } from '../addresses/addresses.service.js';
import { buildCart, evaluateLine } from '../cart/cart.pricing.js';
import { cartRepository } from '../cart/cart.repository.js';
import {
  ordersRepository,
  type OrderItemRow,
  type OrderRow,
  type OrderStatus,
  type PaymentStatus,
  type ShippingAddressSnapshot,
} from './orders.repository.js';
import type { PlaceOrderInput } from './orders.schemas.js';

/** Orders can be cancelled by the customer until the warehouse starts processing them. */
const CUSTOMER_CANCELLABLE: OrderStatus[] = ['CONFIRMED'];

/**
 * Allowed status changes (admin). Delivered and cancelled are final; an order can be
 * cancelled until it has shipped.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Returns every line to stock and marks the order cancelled (refunded if it was paid). */
export async function cancelOrderInTransaction(order: OrderRow, client: PoolClient) {
  const items = await ordersRepository.findItems(order.id, client);
  for (const item of items) {
    if (item.variant_id)
      await ordersRepository.incrementStock(item.variant_id, item.quantity, client);
  }
  await ordersRepository.updateStatus(
    order.id,
    'CANCELLED',
    order.payment_status === 'PAID' ? 'REFUNDED' : order.payment_status,
    client,
  );
}

export interface OrderItemDto {
  id: string;
  productSlug: string | null;
  productName: string;
  colorway: string | null;
  sizeLabel: string;
  sku: string;
  imageUrl: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  placedAt: string;
  shippingAddress: ShippingAddressSnapshot;
  items: OrderItemDto[];
  itemCount: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  canCancel: boolean;
}

export interface OrderSummaryDto extends Omit<OrderDto, 'items' | 'shippingAddress' | 'canCancel'> {
  previewImages: string[];
}

const toItemDto = (row: OrderItemRow): OrderItemDto => ({
  id: row.id,
  productSlug: row.product_slug,
  productName: row.product_name,
  colorway: row.colorway,
  sizeLabel: row.size_label,
  sku: row.sku,
  imageUrl: row.image_url,
  unitPricePaise: row.unit_price_paise,
  quantity: row.quantity,
  lineTotalPaise: row.line_total_paise,
});

export function toOrderDto(order: OrderRow, items: OrderItemRow[]): OrderDto {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    placedAt: order.placed_at.toISOString(),
    shippingAddress: order.shipping_address,
    items: items.map(toItemDto),
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotalPaise: order.subtotal_paise,
    shippingPaise: order.shipping_paise,
    totalPaise: order.total_paise,
    canCancel: CUSTOMER_CANCELLABLE.includes(order.status),
  };
}

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === '23505';

async function loadOrder(userId: string, orderNumber: string) {
  const order = await ordersRepository.findForUser(userId, orderNumber);
  if (!order) throw AppError.notFound('Order not found');
  return toOrderDto(order, await ordersRepository.findItems(order.id));
}

export const ordersService = {
  /**
   * Places an order from the user's cart in ONE transaction:
   *   lock cart → lock stock rows → re-price from the catalogue → validate → write order +
   *   price/address snapshots → decrement stock → clear cart.
   * Any failure rolls everything back. Replaying the same idempotency key returns the
   * original order instead of creating another.
   */
  async placeOrder(userId: string, input: PlaceOrderInput) {
    if (input.simulateDecline) {
      throw new AppError(
        402,
        'PAYMENT_DECLINED',
        'Payment was declined (simulated). No money was taken and your bag is unchanged.',
      );
    }

    const replay = await ordersRepository.findByIdempotencyKey(userId, input.idempotencyKey);
    if (replay) return { order: await loadOrder(userId, replay.order_number), created: false };

    const address = await addressesService.requireOwned(userId, input.addressId);
    const shippingAddress: ShippingAddressSnapshot = {
      fullName: address.full_name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
    };

    let orderNumber: string;
    let created = true;
    try {
      orderNumber = await withTransaction(async (client) => {
        // Upsert row-locks the cart: concurrent checkouts by the same user queue up here.
        const cartId = await cartRepository.getOrCreateCartId(userId, client);

        const duplicate = await ordersRepository.findByIdempotencyKey(
          userId,
          input.idempotencyKey,
          client,
        );
        if (duplicate) {
          created = false;
          return duplicate.order_number;
        }

        const initial = await cartRepository.findLines(cartId, client);
        if (initial.length === 0) throw new AppError(409, 'CART_EMPTY', 'Your bag is empty');

        await ordersRepository.lockInventory(
          initial.map((l) => l.variant_id),
          client,
        );

        // Re-read after locking so stock (and price) are current and can't change under us.
        const rows = await cartRepository.findLines(cartId, client);
        const cart = buildCart(rows.map((r) => evaluateLine(r, r.quantity, r.item_id)));

        if (cart.hasIssues) {
          throw new AppError(
            409,
            'CART_HAS_ISSUES',
            'Some items in your bag are no longer available as selected',
            {
              items: cart.items
                .filter((l) => l.issue)
                .map((l) => ({
                  variantId: l.variantId,
                  issue: l.issue,
                  maxQuantity: l.maxQuantity,
                })),
            },
          );
        }
        if (
          input.expectedTotalPaise !== undefined &&
          input.expectedTotalPaise !== cart.totalPaise
        ) {
          throw new AppError(
            409,
            'PRICE_CHANGED',
            'Prices in your bag have changed. Please review your order.',
            {
              totalPaise: cart.totalPaise,
            },
          );
        }

        const order = await ordersRepository.insertOrder(
          {
            userId,
            status: 'CONFIRMED',
            paymentStatus: input.paymentMethod === 'COD' ? 'PENDING' : 'PAID',
            paymentMethod: input.paymentMethod,
            shippingAddress,
            subtotalPaise: cart.subtotalPaise,
            shippingPaise: cart.shippingPaise,
            totalPaise: cart.totalPaise,
            idempotencyKey: input.idempotencyKey,
          },
          client,
        );

        for (const line of cart.items) {
          await ordersRepository.insertItem(
            order.id,
            {
              product_id: line.productId,
              variant_id: line.variantId,
              product_name: line.name,
              product_slug: line.slug,
              colorway: line.colorway,
              size_label: line.sizeLabel,
              sku: line.sku,
              image_url: line.image?.url ?? null,
              unit_price_paise: line.unitPricePaise,
              quantity: line.quantity,
              line_total_paise: line.lineTotalPaise,
            },
            client,
          );
          // Rows are locked and stock was checked, so this can only fail on a logic error.
          if (!(await ordersRepository.decrementStock(line.variantId, line.quantity, client))) {
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              `${line.name} ${line.sizeLabel} just sold out`,
            );
          }
        }

        await cartRepository.clear(cartId, client);
        return order.order_number;
      });
    } catch (err) {
      // Two identical requests racing: the loser hits the unique (user, key) index.
      if (isUniqueViolation(err)) {
        const existing = await ordersRepository.findByIdempotencyKey(userId, input.idempotencyKey);
        if (existing)
          return { order: await loadOrder(userId, existing.order_number), created: false };
      }
      throw err;
    }

    return { order: await loadOrder(userId, orderNumber), created };
  },

  async list(userId: string, pagination: PaginationQuery) {
    const rows = await ordersRepository.listForUser(userId, pagination.limit, toOffset(pagination));
    const total = rows[0]?.total_count ?? (await ordersRepository.countForUser(userId));

    const items: OrderSummaryDto[] = rows.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method,
      placedAt: o.placed_at.toISOString(),
      itemCount: o.item_count,
      subtotalPaise: o.subtotal_paise,
      shippingPaise: o.shipping_paise,
      totalPaise: o.total_paise,
      previewImages: o.preview_images,
    }));

    return { items, meta: paginationMeta(pagination, total) };
  },

  get: loadOrder,

  /** Customer cancellation: only while CONFIRMED. Restocks every line and refunds if paid. */
  async cancel(userId: string, orderNumber: string) {
    await withTransaction(async (client) => {
      const order = await ordersRepository.lockForUser(userId, orderNumber, client);
      if (!order) throw AppError.notFound('Order not found');
      if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
        throw new AppError(409, 'NOT_CANCELLABLE', 'This order can no longer be cancelled');
      }

      await cancelOrderInTransaction(order, client);
    });
    return loadOrder(userId, orderNumber);
  },
};
