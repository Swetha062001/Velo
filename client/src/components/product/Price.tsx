import { discountPercent, formatPrice } from '../../utils/money.ts';
import { cn } from '../../utils/cn.ts';

interface PriceProps {
  pricePaise: number;
  compareAtPricePaise?: number | null;
  size?: 'sm' | 'lg';
  className?: string;
}

export function Price({ pricePaise, compareAtPricePaise, size = 'sm', className }: PriceProps) {
  const discount = discountPercent(pricePaise, compareAtPricePaise ?? null);

  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span
        className={cn(
          'font-semibold tabular-nums',
          size === 'lg' ? 'text-2xl' : 'text-sm',
          discount ? 'text-accent' : null,
        )}
      >
        {formatPrice(pricePaise)}
      </span>
      {discount && compareAtPricePaise && (
        <>
          <s
            className={cn('text-ink-subtle tabular-nums', size === 'lg' ? 'text-base' : 'text-xs')}
          >
            <span className="sr-only">Was </span>
            {formatPrice(compareAtPricePaise)}
          </s>
          <span className={cn('font-medium text-accent', size === 'lg' ? 'text-sm' : 'text-xs')}>
            {discount}% off
          </span>
        </>
      )}
    </p>
  );
}
