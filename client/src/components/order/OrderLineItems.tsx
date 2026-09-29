import { Link } from 'react-router';
import { paths } from '../../routes/paths.ts';
import { formatPrice } from '../../utils/money.ts';
import { ProductImage } from '../product/ProductImage.tsx';

export interface ReadOnlyLine {
  id: string;
  name: string;
  colorway: string | null;
  sizeLabel: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  imageUrl: string | null;
  slug: string | null;
}

/** Read-only item list for checkout review, confirmation and order detail. */
export function OrderLineItems({ lines }: { lines: ReadOnlyLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <li key={line.id} className="flex gap-4 py-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-md bg-surface-muted">
            {line.imageUrl && (
              <ProductImage
                src={line.imageUrl}
                alt=""
                width={200}
                className="size-full object-cover"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {line.slug ? (
                  <Link to={paths.product(line.slug)} className="hover:underline">
                    {line.name}
                  </Link>
                ) : (
                  line.name
                )}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {[line.colorway, line.sizeLabel].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-0.5 text-xs text-ink-subtle">
                Qty {line.quantity} × {formatPrice(line.unitPricePaise)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {formatPrice(line.lineTotalPaise)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
