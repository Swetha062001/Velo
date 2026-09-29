import { Boxes } from 'lucide-react';
import { useState } from 'react';
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
import { Button } from '../../components/common/Button.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Pagination } from '../../components/product/Pagination.tsx';
import { useAdminInventory, useAdminMutation, useListParams } from '../../hooks/useAdmin.ts';
import { paths } from '../../routes/paths.ts';
import { adminService } from '../../services/admin.service.ts';
import type { InventoryRow } from '../../types/admin.ts';
import { cn } from '../../utils/cn.ts';
import { errorMessage } from '../../utils/forms.ts';

type Filter = 'low' | 'out';

const input =
  'h-9 w-20 rounded-sm border border-line-strong bg-surface px-2 text-sm tabular-nums hover:border-ink-muted';

function StockRow({ row }: { row: InventoryRow }) {
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [threshold, setThreshold] = useState(String(row.lowStockThreshold));
  const save = useAdminMutation(() =>
    adminService.updateInventory(row.variantId, {
      quantity: Number(quantity),
      lowStockThreshold: Number(threshold),
    }),
  );

  const dirty = Number(quantity) !== row.quantity || Number(threshold) !== row.lowStockThreshold;
  const valid = /^\d+$/.test(quantity) && /^\d+$/.test(threshold);
  const status =
    row.quantity === 0
      ? { label: 'Out of stock', tone: 'danger' as const }
      : row.quantity <= row.lowStockThreshold
        ? { label: 'Low', tone: 'warning' as const }
        : { label: 'In stock', tone: 'success' as const };

  return (
    <>
      <tr className={cn(!row.isActive && 'opacity-60')}>
        <Td>
          <Link to={paths.adminProduct(row.productId)} className="font-semibold hover:underline">
            {row.productName}
          </Link>
          <span className="block text-xs text-ink-muted">
            {row.colorway}
            {row.productStatus !== 'ACTIVE' && ` · ${row.productStatus.toLowerCase()}`}
            {!row.isActive && ' · size inactive'}
          </span>
        </Td>
        <Td>{row.sizeLabel}</Td>
        <Td className="font-mono text-xs text-ink-muted">{row.sku}</Td>
        <Td>
          <Badge tone={status.tone}>{status.label}</Badge>
        </Td>
        <Td>
          <input
            aria-label={`Stock for ${row.sku}`}
            inputMode="numeric"
            className={input}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Td>
        <Td>
          <input
            aria-label={`Low-stock level for ${row.sku}`}
            inputMode="numeric"
            className={input}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </Td>
        <Td className="text-right">
          <Button
            size="sm"
            variant={dirty ? 'primary' : 'secondary'}
            disabled={!dirty || !valid}
            loading={save.isPending}
            onClick={() => save.mutate(undefined)}
          >
            Save
          </Button>
        </Td>
      </tr>
      {save.isError && (
        <tr>
          <td colSpan={7} role="alert" className="px-4 pb-3 text-xs font-medium text-danger">
            {errorMessage(save.error)}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminInventoryPage() {
  const { values, page, set } = useListParams(['q', 'filter']);
  const { data, isPending, isError, isPlaceholderData, refetch } = useAdminInventory({
    q: values.q,
    filter: values.filter ?? 'all',
    page,
    limit: 25,
  });

  return (
    <AdminPage title="Inventory" description="Stock per size. Most urgent first.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Filter>
          label="Filter stock"
          options={[
            { value: undefined, label: 'All sizes' },
            { value: 'low', label: 'Low stock' },
            { value: 'out', label: 'Out of stock' },
          ]}
          value={values.filter as Filter | undefined}
          onChange={(v) => set('filter', v)}
        />
        <AdminSearch
          key={values.q ?? ''}
          value={values.q}
          onSearch={(q) => set('q', q)}
          placeholder="Search product or SKU"
        />
      </div>

      {isPending ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : isError ? (
        <ErrorState message="We couldn't load inventory." onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Boxes} title="Nothing here" description="No sizes match this filter." />
      ) : (
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-50')}>
          <Table label="Inventory">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Size</Th>
                <Th>SKU</Th>
                <Th>Status</Th>
                <Th>Stock</Th>
                <Th>Low at</Th>
                <Th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <StockRow
                  key={`${row.variantId}:${row.quantity}:${row.lowStockThreshold}`}
                  row={row}
                />
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
