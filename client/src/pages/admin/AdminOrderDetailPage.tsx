import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { AddressLines } from '../../components/account/AddressLines.tsx';
import { AdminPage, Panel } from '../../components/admin/AdminUI.tsx';
import { Alert } from '../../components/common/Alert.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { Button } from '../../components/common/Button.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { OrderLineItems } from '../../components/order/OrderLineItems.tsx';
import { OrderTotals } from '../../components/order/OrderTotals.tsx';
import { ORDER_STATUS, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from '../../config/orders.ts';
import { useAdminMutation, useAdminOrder } from '../../hooks/useAdmin.ts';
import { paths } from '../../routes/paths.ts';
import { adminService } from '../../services/admin.service.ts';
import type { OrderStatus } from '../../types/order.ts';
import { errorMessage } from '../../utils/forms.ts';
import { formatDate } from '../../utils/format.ts';

const ACTION_LABEL: Record<OrderStatus, string> = {
  CONFIRMED: 'Confirm',
  PROCESSING: 'Start processing',
  SHIPPED: 'Mark shipped',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
};

export default function AdminOrderDetailPage() {
  const { orderNumber = '' } = useParams();
  const { data: order, isPending, isError, refetch } = useAdminOrder(orderNumber);
  const update = useAdminMutation((status: OrderStatus) =>
    adminService.updateOrderStatus(orderNumber, status),
  );
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <AdminPage
      title={orderNumber}
      actions={
        <Link
          to={paths.adminOrders}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" /> All orders
        </Link>
      }
    >
      {isPending ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : isError ? (
        <ErrorState message="We couldn't load this order." onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <Panel
              title="Status"
              actions={
                <Badge tone={ORDER_STATUS[order.status].tone}>
                  {ORDER_STATUS[order.status].label}
                </Badge>
              }
            >
              <p className="text-sm text-ink-muted">Placed {formatDate(order.placedAt)}</p>
              {order.allowedTransitions.length === 0 ? (
                <p className="mt-3 text-sm">
                  This order is {order.status === 'CANCELLED' ? 'cancelled' : 'complete'} — no
                  further changes.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {order.allowedTransitions
                    .filter((s) => s !== 'CANCELLED')
                    .map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        loading={update.isPending && update.variables === s}
                        onClick={() => update.mutate(s)}
                      >
                        {ACTION_LABEL[s]}
                      </Button>
                    ))}
                  {order.allowedTransitions.includes('CANCELLED') &&
                    (confirmCancel ? (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={update.isPending && update.variables === 'CANCELLED'}
                          onClick={() =>
                            update.mutate('CANCELLED', { onSettled: () => setConfirmCancel(false) })
                          }
                        >
                          Yes, cancel and restock
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>
                          Keep order
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmCancel(true)}>
                        Cancel order
                      </Button>
                    ))}
                </div>
              )}
              {update.isError && (
                <Alert tone="danger" className="mt-4">
                  {errorMessage(update.error)}
                </Alert>
              )}
            </Panel>

            <Panel title={`Items (${order.itemCount})`}>
              <OrderLineItems
                lines={order.items.map((i) => ({
                  id: i.id,
                  name: i.productName,
                  colorway: i.colorway,
                  sizeLabel: `${i.sizeLabel} · ${i.sku}`,
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
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Customer">
              <p className="text-sm font-semibold">{order.customer.name}</p>
              <a
                href={`mailto:${order.customer.email}`}
                className="text-sm text-ink-muted hover:underline"
              >
                {order.customer.email}
              </a>
            </Panel>
            <Panel title="Ship to">
              <AddressLines address={order.shippingAddress} />
            </Panel>
            <Panel title="Payment">
              <p className="text-sm">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
              <p className="text-sm text-ink-muted">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</p>
            </Panel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
