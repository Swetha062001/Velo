import { Lock, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Cart } from '../../types/cart.ts';
import { formatPrice } from '../../utils/money.ts';

export function FreeShippingProgress({ cart }: { cart: Cart }) {
  if (cart.subtotalPaise === 0) return null;
  const reached = cart.amountToFreeShippingPaise === 0;
  const progress = Math.min(100, (cart.subtotalPaise / cart.freeShippingThresholdPaise) * 100);

  return (
    <div className="rounded-md bg-surface-muted px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-medium">
        <Truck aria-hidden className="size-4 text-accent" strokeWidth={1.75} />
        {reached ? (
          'You’ve unlocked free shipping.'
        ) : (
          <>Add {formatPrice(cart.amountToFreeShippingPaise)} more for free shipping.</>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="mt-2 h-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-velo"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? 'flex justify-between border-t border-line pt-4 text-base font-semibold'
          : 'flex justify-between text-sm'
      }
    >
      <dt className={strong ? undefined : 'text-ink-muted'}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Totals exactly as calculated by the server. */
export function OrderSummary({ cart, children }: { cart: Cart; children?: ReactNode }) {
  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-lg border border-line bg-surface p-6"
    >
      <h2 id="summary-heading" className="font-sans text-base font-semibold tracking-normal">
        Order summary
      </h2>
      <dl className="mt-5 space-y-3">
        <Row label="Subtotal" value={formatPrice(cart.subtotalPaise)} />
        <Row
          label="Shipping"
          value={
            cart.subtotalPaise === 0
              ? '—'
              : cart.shippingPaise === 0
                ? 'Free'
                : formatPrice(cart.shippingPaise)
          }
        />
        <Row label="Total" value={formatPrice(cart.totalPaise)} strong />
      </dl>
      <p className="mt-1 text-xs text-ink-subtle">Inclusive of all taxes</p>

      <div className="mt-5">
        <FreeShippingProgress cart={cart} />
      </div>

      {children && <div className="mt-6 space-y-3">{children}</div>}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-subtle">
        <Lock aria-hidden className="size-3" />
        Secure checkout · Prices confirmed at checkout
      </p>
    </section>
  );
}
