import type { Order } from '../../types/order.ts';
import { formatPrice } from '../../utils/money.ts';

/** Historical totals exactly as charged (from the order snapshot). */
export function OrderTotals({
  order,
}: {
  order: Pick<Order, 'subtotalPaise' | 'shippingPaise' | 'totalPaise'>;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-muted">Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(order.subtotalPaise)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-muted">Shipping</dt>
        <dd className="tabular-nums">
          {order.shippingPaise === 0 ? 'Free' : formatPrice(order.shippingPaise)}
        </dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPrice(order.totalPaise)}</dd>
      </div>
    </dl>
  );
}
