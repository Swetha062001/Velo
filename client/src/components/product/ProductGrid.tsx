import type { ProductSummary } from '../../types/catalog.ts';
import { cn } from '../../utils/cn.ts';
import { Skeleton } from '../common/Skeleton.tsx';
import { ProductCard } from './ProductCard.tsx';

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6';

export function ProductGrid({
  products,
  className,
  columns = 3,
}: {
  products: ProductSummary[];
  className?: string;
  columns?: 3 | 4;
}) {
  return (
    <ul className={cn(GRID, columns === 4 && 'lg:grid-cols-4', className)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 3 | 4;
}) {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className={cn(GRID, columns === 4 && 'lg:grid-cols-4')}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5] w-full rounded-md" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
