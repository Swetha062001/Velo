import { CircleCheck } from 'lucide-react';
import { useParams } from 'react-router';
import { AddressLines } from '../../components/account/AddressLines.tsx';
import { ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { FullPageSpinner } from '../../components/common/Spinner.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { OrderLineItems } from '../../components/order/OrderLineItems.tsx';
import { OrderTotals } from '../../components/order/OrderTotals.tsx';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from '../../config/orders.ts';
import { useOrder } from '../../hooks/useOrders.ts';
import { paths } from '../../routes/paths.ts';
import { formatDate } from '../../utils/format.ts';

export default function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams();
  const { data: order, isPending, isError, refetch } = useOrder(orderNumber);

  if (isPending) return <FullPageSpinner />;
  if (isError) {
    return (
      <Container className="py-16">
        <ErrorState message="We couldn't load your order." onRetry={() => refetch()} />
      </Container>
    );
  }

  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <DocumentTitle title="Order confirmed" />

        <div className="text-center">
          <CircleCheck aria-hidden className="mx-auto size-12 text-success" strokeWidth={1.5} />
          <h1 className="mt-5 text-4xl font-extrabold sm:text-5xl">Thank you!</h1>
          <p className="mt-3 text-ink-muted">
            Your order <span className="font-semibold text-ink">{order.orderNumber}</span> is
            confirmed.
          </p>
          <p className="mt-1 text-sm text-ink-subtle">Placed on {formatDate(order.placedAt)}</p>
        </div>

        <div className="mt-12 grid gap-6 rounded-lg border border-line bg-surface p-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 font-sans text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              Shipping to
            </h2>
            <AddressLines address={order.shippingAddress} />
          </div>
          <div>
            <h2 className="mb-2 font-sans text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              Payment
            </h2>
            <p className="text-sm">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
            <p className="text-sm text-ink-muted">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-surface p-6">
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
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink to={paths.accountOrder(order.orderNumber)} variant="secondary">
            View order
          </ButtonLink>
          <ButtonLink to={paths.products}>Continue shopping</ButtonLink>
        </div>
      </div>
    </Container>
  );
}
