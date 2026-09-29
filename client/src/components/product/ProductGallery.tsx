import { useState } from 'react';
import type { ProductImage as ProductImageType } from '../../types/catalog.ts';
import { cn } from '../../utils/cn.ts';
import { ProductImage } from './ProductImage.tsx';

const MAIN_SIZES = '(min-width: 1024px) 55vw, 100vw';

/**
 * Desktop: large image + thumbnail buttons. Mobile: swipeable scroll-snap strip.
 */
export function ProductGallery({ images, name }: { images: ProductImageType[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  if (!current) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-surface-muted font-display text-4xl font-black text-ink-subtle">
        VELO
      </div>
    );
  }

  return (
    <div>
      {/* Mobile: swipe */}
      <ul
        aria-label={`${name} images`}
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden"
      >
        {images.map((img, i) => (
          <li key={img.url + i} className="w-[88%] shrink-0 snap-center">
            <ProductImage
              src={img.url}
              alt={img.alt}
              sizes="88vw"
              loading={i === 0 ? 'eager' : 'lazy'}
              className="aspect-[4/5] w-full rounded-lg bg-surface-muted object-cover"
            />
          </li>
        ))}
      </ul>

      {/* Desktop: main + thumbnails */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[4.5rem_1fr]">
        <ul className="flex flex-col gap-3" aria-label="Choose image">
          {images.map((img, i) => (
            <li key={img.url + i}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={cn(
                  'block overflow-hidden rounded-md border-2 transition-colors',
                  i === active ? 'border-ink' : 'border-transparent hover:border-line-strong',
                )}
              >
                <ProductImage
                  src={img.url}
                  alt=""
                  width={160}
                  className="aspect-square w-full bg-surface-muted object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
        <ProductImage
          key={current.url}
          src={current.url}
          alt={current.alt}
          width={1280}
          sizes={MAIN_SIZES}
          loading="eager"
          className="aspect-[4/5] w-full rounded-lg bg-surface-muted object-cover"
        />
      </div>
    </div>
  );
}
