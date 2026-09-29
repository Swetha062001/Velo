import { ChevronRight, Receipt } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Badge } from '../../components/common/Badge.tsx';
import { ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Pagination } from '../../components/product/Pagination.tsx';
import { ProductImage } from '../../components/product/ProductImage.tsx';
import { ORDER_STATUS } from '../../config/orders.ts';
import { useOrders } from '../../hooks/useOrders.ts';
import { paths } from '../../routes/paths.ts';
import { cn } from '../../utils/cn.ts';
import { formatDate } from '../../utils/format.ts';
import { formatPrice } from '../../utils/money.ts';

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isPending, isError, isPlaceholderData, refetch } = useOrders(page);

  return (
    <>
      <DocumentTitle title="Orders" />
      <div className="pb-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Orders</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {data ? `${data.meta.total} ${data.meta.total === 1 ? 'order' : 'orders'}` : ' '}
        </p>
      </div>

      {isPending ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load your orders." onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong">
          <EmptyState
            icon={Receipt}
            title="No orders yet"
            description="When you place an order, it will appear here."
            action={<ButtonLink to={paths.products}>Start shopping</ButtonLink>}
          />
        </div>
      ) : (
        <>
          <ul className={cn('space-y-4 transition-opacity', isPlaceholderData && 'opacity-50')}>
            {data.items.map((order) => {
              const status = ORDER_STATUS[order.status];
              return (
                <li key={order.id}>
                  <Link
                    to={paths.accountOrder(order.orderNumber)}
                    className="group flex items-center gap-4 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-ink sm:gap-6 sm:p-5"
                  >
                    <div className="flex -space-x-3">
                      {order.previewImages.map((url, i) => (
                        <ProductImage
                          key={url + i}
                          src={url}
                          alt=""
                          width={120}
                          className="size-14 rounded-md border-2 border-surface bg-surface-muted object-cover sm:size-16"
                        />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{order.orderNumber}</p>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {formatDate(order.placedAt)} · {order.itemCount}{' '}
                        {order.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatPrice(order.totalPaise)}
                    </p>
                    <ChevronRight
                      aria-hidden
                      className="hidden size-5 text-ink-subtle transition-transform group-hover:translate-x-0.5 sm:block"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-10">
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onChange={(p) => setParams(p > 1 ? { page: String(p) } : {})}
            />
          </div>
        </>
      )}
    </>
  );
}
