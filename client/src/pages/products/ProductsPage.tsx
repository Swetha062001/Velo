import { SearchX, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { Drawer } from '../../components/common/Drawer.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { ActiveFilters } from '../../components/product/ActiveFilters.tsx';
import { FilterPanel } from '../../components/product/FilterPanel.tsx';
import { Pagination } from '../../components/product/Pagination.tsx';
import { ProductGrid, ProductGridSkeleton } from '../../components/product/ProductGrid.tsx';
import { SearchField } from '../../components/product/SearchField.tsx';
import { SortSelect } from '../../components/product/SortSelect.tsx';
import { PAGE_SIZE } from '../../config/catalog.ts';
import { useCategories, useProducts } from '../../hooks/useCatalog.ts';
import { useProductFilters } from '../../hooks/useProductFilters.ts';
import { ApiError } from '../../lib/apiClient.ts';
import { cn } from '../../utils/cn.ts';

export default function ProductsPage() {
  const filtersApi = useProductFilters();
  const { filters, activeCount, setFilter, setPage, clearFilters } = filtersApi;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const products = useProducts({ ...filters, limit: String(PAGE_SIZE) });
  const categories = useCategories();

  const category = categories.data?.find((c) => c.slug === filters.category);
  const heading = filters.q ? `Results for “${filters.q}”` : (category?.name ?? 'Shop all');
  const total = products.data?.meta.total;
  const invalidFilters = products.error instanceof ApiError && products.error.status === 400;

  return (
    <Container className="py-10 sm:py-14">
      <DocumentTitle title={filters.q ? `Search: ${filters.q}` : (category?.name ?? 'Shop all')} />

      {/* Heading + search */}
      <header className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold [font-stretch:105%] sm:text-5xl">{heading}</h1>
          <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
            {total === undefined ? ' ' : `${total} ${total === 1 ? 'product' : 'products'}`}
          </p>
          {category?.description && !filters.q && (
            <p className="mt-3 max-w-xl text-ink-muted">{category.description}</p>
          )}
        </div>
        <SearchField
          key={filters.q ?? ''}
          initialValue={filters.q}
          onSearch={(q) => setFilter('q', q)}
          className="w-full lg:w-96"
        />
      </header>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[15rem_1fr]">
        {/* Desktop filters */}
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2 pb-8">
            <FilterPanel api={filtersApi} idPrefix="desktop" />
          </div>
        </aside>

        <section aria-label="Products" className="min-w-0">
          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              Filters{activeCount > 0 && ` (${activeCount})`}
            </Button>
            <div className="ml-auto">
              <SortSelect
                value={filters.sort}
                hasSearch={Boolean(filters.q)}
                onChange={(sort) => setFilter('sort', sort)}
              />
            </div>
          </div>

          <div className="mb-6">
            <ActiveFilters api={filtersApi} />
          </div>

          {products.isPending ? (
            <ProductGridSkeleton count={PAGE_SIZE / 2} />
          ) : products.isError ? (
            invalidFilters ? (
              <EmptyState
                icon={SearchX}
                title="Some filters in this link aren't valid"
                description="Clear the filters to see all products."
                action={<Button onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <ErrorState
                message="We couldn't load products. Please try again."
                onRetry={() => products.refetch()}
              />
            )
          ) : products.data.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No products match"
              description={
                filters.q
                  ? `Nothing matched “${filters.q}”${activeCount ? ' with these filters' : ''}. Try another search or remove some filters.`
                  : 'Try removing some filters to see more styles.'
              }
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  {activeCount > 0 && <Button onClick={clearFilters}>Clear filters</Button>}
                  {filters.q && (
                    <Button variant="secondary" onClick={() => setFilter('q', undefined)}>
                      Clear search
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <div
              className={cn(
                'transition-opacity duration-200',
                products.isPlaceholderData && 'opacity-50',
              )}
              aria-busy={products.isPlaceholderData}
            >
              <ProductGrid products={products.data.items} />
              <div className="mt-14">
                <Pagination
                  page={products.data.meta.page}
                  totalPages={products.data.meta.totalPages}
                  onChange={setPage}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile filters */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={clearFilters}
              disabled={!activeCount}
            >
              Clear
            </Button>
            <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
              Show {total ?? ''} results
            </Button>
          </div>
        }
      >
        <FilterPanel api={filtersApi} idPrefix="mobile" />
      </Drawer>
    </Container>
  );
}
