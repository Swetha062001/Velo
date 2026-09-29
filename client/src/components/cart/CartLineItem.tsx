import { Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { useRemoveCartItem, useUpdateCartItem } from '../../hooks/useCart.ts';
import { paths } from '../../routes/paths.ts';
import type { CartLine } from '../../types/cart.ts';
import { cn } from '../../utils/cn.ts';
import { errorMessage } from '../../utils/forms.ts';
import { formatPrice } from '../../utils/money.ts';
import { ProductImage } from '../product/ProductImage.tsx';
import { QuantitySelect } from './QuantitySelect.tsx';

function IssueNote({ line, onFix }: { line: CartLine; onFix: () => void }) {
  if (!line.issue) return null;
  const message = {
    unavailable: 'No longer available — please remove it to continue.',
    out_of_stock: `${line.sizeLabel} has sold out — please remove it to continue.`,
    insufficient_stock: `Only ${line.maxQuantity} left in ${line.sizeLabel}.`,
  }[line.issue];

  return (
    <p role="alert" className="mt-2 text-xs font-medium text-danger">
      {message}{' '}
      {line.issue === 'insufficient_stock' && line.maxQuantity > 0 && (
        <button type="button" onClick={onFix} className="underline underline-offset-2">
          Update to {line.maxQuantity}
        </button>
      )}
    </p>
  );
}

export function CartLineItem({ line, compact = false }: { line: CartLine; compact?: boolean }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const busy = update.isPending || remove.isPending;
  const error = update.error ?? remove.error;

  return (
    <li className={cn('flex gap-4 py-6', busy && 'opacity-60')}>
      <Link
        to={paths.product(line.slug)}
        className="shrink-0 overflow-hidden rounded-md bg-surface-muted"
        tabIndex={-1}
        aria-hidden
      >
        {line.image && (
          <ProductImage
            src={line.image.url}
            alt=""
            width={240}
            className={cn('object-cover', compact ? 'size-20' : 'size-24 sm:size-32')}
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-sans text-sm font-semibold tracking-normal">
              <Link to={paths.product(line.slug)} className="hover:underline">
                {line.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-sm text-ink-muted">
              {line.colorway} · {line.sizeLabel}
            </p>
            {!compact && (
              <p className="mt-0.5 text-xs text-ink-subtle">
                {formatPrice(line.unitPricePaise)} each
              </p>
            )}
          </div>
          <p
            className={cn(
              'shrink-0 text-sm font-semibold tabular-nums',
              line.issue && 'text-ink-subtle line-through',
            )}
          >
            {formatPrice(line.lineTotalPaise)}
          </p>
        </div>

        <IssueNote line={line} onFix={() => update.mutate({ line, quantity: line.maxQuantity })} />

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {line.issue === 'unavailable' || line.issue === 'out_of_stock' ? (
            <span />
          ) : (
            <QuantitySelect
              value={line.quantity}
              max={line.maxQuantity}
              disabled={busy}
              label={`Quantity for ${line.name}, ${line.sizeLabel}`}
              onChange={(quantity) => update.mutate({ line, quantity })}
            />
          )}
          <button
            type="button"
            onClick={() => remove.mutate(line)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-danger disabled:opacity-50"
          >
            <Trash2 aria-hidden className="size-3.5" />
            Remove
            <span className="sr-only">
              {' '}
              {line.name} {line.sizeLabel}
            </span>
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-danger">
            {errorMessage(error)}
          </p>
        )}
      </div>
    </li>
  );
}
