import { Boxes, IndianRupee, Package, ShoppingCart, TriangleAlert, Users } from 'lucide-react';
import { Link } from 'react-router';
import { AdminPage, Panel, Table, Td, Th } from '../../components/admin/AdminUI.tsx';
import { RevenueChart } from '../../components/admin/RevenueChart.tsx';
import { StatTile } from '../../components/admin/StatTile.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { ORDER_STATUS } from '../../config/orders.ts';
import { useAdminStats } from '../../hooks/useAdmin.ts';
import { paths } from '../../routes/paths.ts';
import type { OrderStatus } from '../../types/order.ts';
import { formatDate } from '../../utils/format.ts';
import { formatPrice } from '../../utils/money.ts';

const number = new Intl.NumberFormat('en-IN');

export default function AdminDashboardPage() {
  const { data: stats, isPending, isError, refetch } = useAdminStats();

  return (
    <AdminPage title="Dashboard" description="Store performance at a glance.">
      {isPending ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-lg" />
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load the dashboard." onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Revenue"
              icon={IndianRupee}
              value={formatPrice(stats.revenuePaise)}
              detail="All time, excluding cancelled orders"
            />
            <StatTile
              label="Orders"
              icon={ShoppingCart}
              value={number.format(stats.orderCount)}
              detail={`${stats.ordersByStatus.CONFIRMED} awaiting processing`}
            />
            <StatTile
              label="Customers"
              icon={Users}
              value={number.format(stats.customerCount)}
              detail="Registered accounts"
            />
            <StatTile
              label="Products"
              icon={Package}
              value={number.format(stats.products.active)}
              detail={`Live · ${stats.products.draft} draft · ${stats.products.archived} archived`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
            <Panel
              title="Revenue"
              description="Last 14 days (India time), excluding cancelled orders"
            >
              <RevenueChart data={stats.revenueByDay} />
            </Panel>

            <Panel title="Orders by status">
              <ul className="space-y-3">
                {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((status) => (
                  <li key={status} className="flex items-center justify-between text-sm">
                    <Link to={`${paths.adminOrders}?status=${status}`} className="hover:underline">
                      <Badge tone={ORDER_STATUS[status].tone}>{ORDER_STATUS[status].label}</Badge>
                    </Link>
                    <span className="font-semibold tabular-nums">
                      {stats.ordersByStatus[status]}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="Low stock"
              description={`${stats.lowStock.total} live ${stats.lowStock.total === 1 ? 'size is' : 'sizes are'} at or below threshold`}
              actions={
                <Link
                  to={`${paths.adminInventory}?filter=low`}
                  className="text-sm font-semibold hover:underline"
                >
                  View inventory
                </Link>
              }
            >
              {stats.lowStock.items.length === 0 ? (
                <p className="text-sm text-ink-muted">Everything is well stocked.</p>
              ) : (
                <Table label="Low-stock sizes" compact>
                  <thead>
                    <tr>
                      <Th>Product</Th>
                      <Th>Size</Th>
                      <Th className="text-right">Stock</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lowStock.items.map((row) => (
                      <tr key={row.variantId}>
                        <Td>
                          <Link
                            to={paths.adminProduct(row.productId)}
                            className="font-medium hover:underline"
                          >
                            {row.productName}
                          </Link>
                          <span className="block text-xs text-ink-muted">{row.colorway}</span>
                        </Td>
                        <Td>{row.sizeLabel}</Td>
                        <Td className="text-right">
                          <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
                            {row.quantity === 0 && (
                              <TriangleAlert aria-hidden className="size-3.5 text-danger" />
                            )}
                            {row.quantity === 0 ? 'Sold out' : row.quantity}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>

            <Panel
              title="Recent orders"
              actions={
                <Link to={paths.adminOrders} className="text-sm font-semibold hover:underline">
                  All orders
                </Link>
              }
            >
              {stats.recentOrders.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <Boxes aria-hidden className="size-4" /> No orders yet.
                </p>
              ) : (
                <Table label="Recent orders" compact>
                  <thead>
                    <tr>
                      <Th>Order</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((o) => (
                      <tr key={o.orderNumber}>
                        <Td>
                          <Link
                            to={paths.adminOrder(o.orderNumber)}
                            className="font-medium hover:underline"
                          >
                            {o.orderNumber}
                          </Link>
                          <span className="block text-xs text-ink-muted">
                            {o.customerName} · {formatDate(o.placedAt)}
                          </span>
                        </Td>
                        <Td>
                          <Badge tone={ORDER_STATUS[o.status].tone}>
                            {ORDER_STATUS[o.status].label}
                          </Badge>
                        </Td>
                        <Td className="text-right font-semibold tabular-nums">
                          {formatPrice(o.totalPaise)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
