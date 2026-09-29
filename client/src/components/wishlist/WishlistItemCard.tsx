import { X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useMoveToCart, useToggleWishlist } from '../../hooks/useWishlist.ts';
import { paths } from '../../routes/paths.ts';
import { useUi } from '../../store/ui.ts';
import type { WishlistItem } from '../../types/wishlist.ts';
import { cn } from '../../utils/cn.ts';
import { errorMessage } from '../../utils/forms.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Price } from '../product/Price.tsx';
import { ProductImage } from '../product/ProductImage.tsx';

export function WishlistItemCard({ item }: { item: WishlistItem }) {
  const { product } = item;
  const [variantId, setVariantId] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const move = useMoveToCart();
  const toggle = useToggleWishlist();
  const openCartDrawer = useUi((s) => s.openCartDrawer);

  const allSoldOut = item.variants.every((v) => v.stockStatus === 'out_of_stock');
  const selectId = `size-${item.productId}`;

  function handleMove() {
    if (!variantId) {
      setSizeError(true);
      return;
    }
    move.mutate({ productId: item.productId, variantId }, { onSuccess: openCartDrawer });
  }

  return (
    <article className={cn('relative flex h-full flex-col', move.isPending && 'opacity-60')}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface-muted">
        <Link to={paths.product(product.slug)} tabIndex={-1} aria-hidden>
          {product.images[0] && (
            <ProductImage
              src={product.images[0].url}
              alt=""
              sizes="(min-width: 1024px) 25vw, 50vw"
              className={cn('size-full object-cover', !item.available && 'opacity-50 grayscale')}
            />
          )}
        </Link>
        <button
          type="button"
          onClick={() => toggle.mutate({ product, saved: true })}
          aria-label={`Remove ${product.name} ${product.colorway} from wishlist`}
          className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full bg-canvas/90 shadow-sm hover:bg-canvas"
        >
          <X aria-hidden className="size-4" />
        </button>
        {!item.available && <Badge className="absolute top-3 left-3">Unavailable</Badge>}
      </div>

      <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-sans text-sm font-semibold tracking-normal">
            <Link to={paths.product(product.slug)} className="hover:underline">
              {product.name}
            </Link>
          </h2>
          <p className="truncate text-sm text-ink-muted">{product.colorway}</p>
        </div>
        <Price
          pricePaise={product.pricePaise}
          compareAtPricePaise={product.compareAtPricePaise}
          className="shrink-0 gap-x-1.5 sm:flex-col sm:items-end sm:gap-0"
        />
      </div>

      {/* Controls pinned to the bottom so rows line up regardless of price/badge height. */}
      {!item.available ? (
        <p className="mt-auto pt-3 text-xs text-ink-muted">This product is no longer available.</p>
      ) : allSoldOut ? (
        <p className="mt-auto pt-3 text-xs font-medium text-danger">Sold out in every size.</p>
      ) : (
        <div className="mt-auto space-y-2 pt-3">
          <label htmlFor={selectId} className="sr-only">
            Size for {product.name}
          </label>
          <select
            id={selectId}
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setSizeError(false);
              move.reset();
            }}
            aria-invalid={sizeError || undefined}
            className={cn(
              'h-10 w-full cursor-pointer rounded-sm border bg-surface px-3 text-sm',
              sizeError ? 'border-danger' : 'border-line-strong hover:border-ink',
            )}
          >
            <option value="">Select size</option>
            {item.variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stockStatus === 'out_of_stock'}>
                {v.sizeLabel}
                {v.stockStatus === 'out_of_stock'
                  ? ' — sold out'
                  : v.stockStatus === 'low_stock'
                    ? ' — few left'
                    : ''}
              </option>
            ))}
          </select>
          <Button size="sm" fullWidth onClick={handleMove} loading={move.isPending}>
            Move to bag
          </Button>
          {sizeError && (
            <p role="alert" className="text-xs font-medium text-danger">
              Please select a size.
            </p>
          )}
          {move.isError && (
            <p role="alert" className="text-xs font-medium text-danger">
              {errorMessage(move.error)}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
