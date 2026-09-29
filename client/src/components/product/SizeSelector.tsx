import type { ProductVariant } from '../../types/catalog.ts';
import { cn } from '../../utils/cn.ts';

interface SizeSelectorProps {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variantId: string) => void;
  error?: string;
}

/** Native radio group styled as size tiles — keyboard (arrow keys) and screen-reader friendly. */
export function SizeSelector({ variants, selectedId, onSelect, error }: SizeSelectorProps) {
  const selected = variants.find((v) => v.id === selectedId);

  return (
    <fieldset aria-describedby={error ? 'size-error' : undefined}>
      <div className="mb-3 flex items-baseline justify-between">
        <legend className="text-sm font-semibold">Select size (UK)</legend>
        {selected?.stockStatus === 'low_stock' && (
          <span className="text-xs font-medium text-warning">
            Only a few left in {selected.sizeLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {variants.map((v) => {
          const soldOut = v.stockStatus === 'out_of_stock';
          const size = v.sizeLabel.replace(/^UK\s*/, '');
          return (
            <label
              key={v.id}
              className={cn(
                'relative flex h-12 items-center justify-center rounded-sm border text-sm tabular-nums transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                soldOut
                  ? 'cursor-not-allowed border-line text-ink-subtle line-through'
                  : 'cursor-pointer',
                !soldOut &&
                  (v.id === selectedId
                    ? 'border-ink bg-inverse text-inverse-fg'
                    : 'border-line-strong hover:border-ink'),
                error && !selectedId && 'border-danger',
              )}
            >
              <input
                type="radio"
                name="size"
                value={v.id}
                checked={v.id === selectedId}
                disabled={soldOut}
                onChange={() => onSelect(v.id)}
                className="sr-only"
              />
              <span aria-hidden>{size}</span>
              <span className="sr-only">
                {v.sizeLabel}
                {soldOut ? ', sold out' : v.stockStatus === 'low_stock' ? ', low stock' : ''}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p id="size-error" role="alert" className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
