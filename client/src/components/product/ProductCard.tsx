import { Link } from 'react-router';
import { paths } from '../../routes/paths.ts';
import type { ProductSummary } from '../../types/catalog.ts';
import { discountPercent } from '../../utils/money.ts';
import { cn } from '../../utils/cn.ts';
import { Badge } from '../common/Badge.tsx';
import { Price } from './Price.tsx';
import { ProductImage } from './ProductImage.tsx';

const CARD_SIZES =
  '(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';

interface ProductCardProps {
  product: ProductSummary;
  /** Load eagerly (above-the-fold cards). */
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [primary, secondary] = product.images;
  const onSale = discountPercent(product.pricePaise, product.compareAtPricePaise) !== null;

  return (
    <article className="group relative">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface-muted">
        {primary ? (
          <>
            <ProductImage
              src={primary.url}
              alt={primary.alt}
              sizes={CARD_SIZES}
              loading={priority ? 'eager' : 'lazy'}
              className={cn(
                'absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500 ease-velo',
                secondary ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]',
                !product.inStock && 'opacity-60',
              )}
            />
            {secondary && (
              <ProductImage
                src={secondary.url}
                alt=""
                aria-hidden
                sizes={CARD_SIZES}
                className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 ease-velo group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex size-full items-center justify-center font-display text-2xl font-black text-ink-subtle">
            VELO
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {!product.inStock && <Badge>Sold out</Badge>}
          {product.inStock && onSale && <Badge tone="accent">Sale</Badge>}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-sans text-sm font-semibold tracking-normal">
            {/* The stretched link makes the whole card clickable while keeping one tab stop. */}
            <Link
              to={paths.product(product.slug)}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none after:focus-visible:rounded-md after:focus-visible:outline-2 after:focus-visible:outline-offset-2 after:focus-visible:outline-accent"
            >
              {product.name}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-ink-muted">{product.colorway}</p>
        </div>
        <Price
          pricePaise={product.pricePaise}
          compareAtPricePaise={product.compareAtPricePaise}
          className="shrink-0 gap-x-1.5 sm:flex-col sm:items-end sm:gap-0"
        />
      </div>
    </article>
  );
}
