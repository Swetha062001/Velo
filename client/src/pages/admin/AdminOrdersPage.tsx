import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router';
import {
  AdminPage,
  AdminSearch,
  FilterTabs,
  Table,
  Td,
  Th,
} from '../../components/admin/AdminUI.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Pagination } from '../../components/product/Pagination.tsx';
import { ORDER_STATUS, PAYMENT_METHOD_LABEL } from '../../config/orders.ts';
import { useAdminOrders, useListParams } from '../../hooks/useAdmin.ts';
import { paths } from '../../routes/paths.ts';
import type { OrderStatus } from '../../types/order.ts';
import { cn } from '../../utils/cn.ts';
import { formatDate } from '../../utils/format.ts';
import { formatPrice } from '../../utils/money.ts';

const STATUS_OPTIONS = [
  { value: undefined, label: 'All' },
  ...(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => ({
    value: s,
    label: ORDER_STATUS[s].label,
  })),
];

export default function AdminOrdersPage() {
  const { values, page, set } = useListParams(['q', 'status']);
  const { data, isPending, isError, isPlaceholderData, refetch } = useAdminOrders({
    q: values.q,
    status: values.status,
    page,
    limit: 20,
  });

  return (
    <AdminPage title="Orders" description={data ? `${data.meta.total} orders` : undefined}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<OrderStatus>
          label="Filter by status"
          options={STATUS_OPTIONS}
          value={values.status as OrderStatus | undefined}
          onChange={(v) => set('status', v)}
        />
        <AdminSearch
          key={values.q ?? ''}
          value={values.q}
          onSearch={(q) => set('q', q)}
          placeholder="Order number, name or email"
        />
      </div>

      {isPending ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : isError ? (
        <ErrorState message="We couldn't load orders." onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders found"
          description="Try another status or search."
        />
      ) : (
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-50')}>
          <Table label="Orders">
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="hover:bg-surface-muted/50">
                  <Td>
                    <Link
                      to={paths.adminOrder(o.orderNumber)}
                      className="font-semibold hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <span className="block text-xs text-ink-muted">
                      {formatDate(o.placedAt)} · {o.itemCount}{' '}
                      {o.itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </Td>
                  <Td>
                    {o.customer.name}
                    <span className="block text-xs text-ink-muted">{o.customer.email}</span>
                  </Td>
                  <Td>
                    <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                  </Td>
                  <Td className="text-xs text-ink-muted">
                    {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                    <span className="block capitalize">{o.paymentStatus.toLowerCase()}</span>
                  </Td>
                  <Td className="text-right font-semibold tabular-nums">
                    {formatPrice(o.totalPaise)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-6">
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onChange={(p) => set('page', String(p))}
            />
          </div>
        </div>
      )}
    </AdminPage>
  );
}
