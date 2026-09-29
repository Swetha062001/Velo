import { ArrowLeft, PackageSearch } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { AddressLines } from '../../components/account/AddressLines.tsx';
import { Alert } from '../../components/common/Alert.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { Button, ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { OrderLineItems } from '../../components/order/OrderLineItems.tsx';
import { OrderTotals } from '../../components/order/OrderTotals.tsx';
import { ORDER_STATUS, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from '../../config/orders.ts';
import { useCancelOrder, useOrder } from '../../hooks/useOrders.ts';
import { ApiError } from '../../lib/apiClient.ts';
import { paths } from '../../routes/paths.ts';
import type { Order } from '../../types/order.ts';
import { errorMessage } from '../../utils/forms.ts';
import { formatDate } from '../../utils/format.ts';

const PROGRESS = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

function StatusTimeline({ order }: { order: Order }) {
  if (order.status === 'CANCELLED') {
    return (
      <Alert tone="danger">
        This order was cancelled{order.paymentStatus === 'REFUNDED' ? ' and refunded' : ''}.
      </Alert>
    );
  }
  const current = PROGRESS.indexOf(order.status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {PROGRESS.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined}>
          <span className={`block h-1 rounded-full ${i <= current ? 'bg-accent' : 'bg-line'}`} />
          <span
            className={`mt-2 block text-xs ${i <= current ? 'font-semibold text-ink' : 'text-ink-subtle'}`}
          >
            {ORDER_STATUS[s].label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CancelOrder({ order }: { order: Order }) {
  const cancel = useCancelOrder();
  const [confirming, setConfirming] = useState(false);
  if (!order.canCancel) return null;

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-sans text-base font-semibold tracking-normal">Need to cancel?</h2>
      <p className="mt-1 text-sm text-ink-muted">
        You can cancel until we start processing your order.
        {order.paymentStatus === 'PAID' && ' Your payment will be refunded.'}
      </p>
      {confirming ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="danger"
            size="sm"
            loading={cancel.isPending}
            onClick={() => cancel.mutate(order.orderNumber)}
          >
            Yes, cancel order
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={cancel.isPending}
          >
            Keep order
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => setConfirming(true)}>
          Cancel order
        </Button>
      )}
      {cancel.isError && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {errorMessage(cancel.error)}
        </p>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderNumber = '' } = useParams();
  const { data: order, isPending, isError, error, refetch } = useOrder(orderNumber);

  if (isPending) return <Skeleton className="h-96 rounded-lg" />;
  if (isError) {
    return error instanceof ApiError && (error.status === 404 || error.status === 400) ? (
      <EmptyState
        icon={PackageSearch}
        title="Order not found"
        description="Check the order number, or find it in your order history."
        action={<ButtonLink to={paths.accountOrders}>View all orders</ButtonLink>}
      />
    ) : (
      <ErrorState message="We couldn't load this order." onRetry={() => refetch()} />
    );
  }

  const status = ORDER_STATUS[order.status];

  return (
    <>
      <DocumentTitle title={`Order ${order.orderNumber}`} />
      <Link
        to={paths.accountOrders}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" /> All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{order.orderNumber}</h1>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="mt-2 text-sm text-ink-muted">Placed on {formatDate(order.placedAt)}</p>

      <div className="mt-8">
        <StatusTimeline order={order} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section aria-label="Items" className="rounded-lg border border-line bg-surface p-6">
          <OrderLineItems
            lines={order.items.map((i) => ({
              id: i.id,
              name: i.productName,
              colorway: i.colorway,
              sizeLabel: i.sizeLabel,
              quantity: i.quantity,
              unitPricePaise: i.unitPricePaise,
              lineTotalPaise: i.lineTotalPaise,
              imageUrl: i.imageUrl,
              slug: i.productSlug,
            }))}
          />
          <div className="mt-4 border-t border-line pt-4">
            <OrderTotals order={order} />
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-2 font-sans text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              Shipping to
            </h2>
            <AddressLines address={order.shippingAddress} />
          </section>
          <section className="rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-2 font-sans text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              Payment
            </h2>
            <p className="text-sm">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
            <p className="text-sm text-ink-muted">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</p>
          </section>
          <CancelOrder order={order} />
        </div>
      </div>
    </>
  );
}
