import { Package, Plus } from 'lucide-react';
import { Link } from 'react-router';
import {
  AdminPage,
  AdminSearch,
  FilterTabs,
  ProductStatusBadge,
  Table,
  Td,
  Th,
} from '../../components/admin/AdminUI.tsx';
import { ButtonLink } from '../../components/common/Button.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Pagination } from '../../components/product/Pagination.tsx';
import { ProductImage } from '../../components/product/ProductImage.tsx';
import { useAdminProducts, useListParams } from '../../hooks/useAdmin.ts';
import { paths } from '../../routes/paths.ts';
import type { ProductStatus } from '../../types/admin.ts';
import { cn } from '../../utils/cn.ts';
import { formatPrice } from '../../utils/money.ts';

const STATUS_OPTIONS: Array<{ value: ProductStatus | undefined; label: string }> = [
  { value: undefined, label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function AdminProductsPage() {
  const { values, page, set } = useListParams(['q', 'status']);
  const { data, isPending, isError, isPlaceholderData, refetch } = useAdminProducts({
    q: values.q,
    status: values.status,
    page,
    limit: 20,
  });

  return (
    <AdminPage
      title="Products"
      description={data ? `${data.meta.total} products` : undefined}
      actions={
        <ButtonLink to={paths.adminProductNew}>
          <Plus aria-hidden className="size-4" /> New product
        </ButtonLink>
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          label="Filter by status"
          options={STATUS_OPTIONS}
          value={values.status as ProductStatus | undefined}
          onChange={(v) => set('status', v)}
        />
        <AdminSearch
          key={values.q ?? ''}
          value={values.q}
          onSearch={(q) => set('q', q)}
          placeholder="Search name, colourway, slug"
        />
      </div>

      {isPending ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : isError ? (
        <ErrorState message="We couldn't load products." onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Try a different search or filter."
        />
      ) : (
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-50')}>
          <Table label="Products">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Stock</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="hover:bg-surface-muted/50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                        {p.imageUrl && (
                          <ProductImage
                            src={p.imageUrl}
                            alt=""
                            width={96}
                            className="size-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={paths.adminProduct(p.id)}
                          className="font-semibold hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="block truncate text-xs text-ink-muted">
                          {p.colorway}
                          {p.isFeatured && ' · Featured'}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-ink-muted">{p.categoryName}</Td>
                  <Td>
                    <ProductStatusBadge status={p.status} />
                  </Td>
                  <Td className="text-right tabular-nums">{formatPrice(p.pricePaise)}</Td>
                  <Td className="text-right tabular-nums">
                    {p.totalStock}
                    <span className="block text-xs text-ink-muted">
                      {p.variantCount} sizes
                      {p.lowStockCount > 0 && (
                        <span className="text-warning"> · {p.lowStockCount} low</span>
                      )}
                    </span>
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
