import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn.ts';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** 1 … 4 5 6 … 12 — current page ±1, plus first/last. */
function pageItems(page: number, total: number): Array<number | 'gap'> {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | 'gap'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) items.push('gap');
    items.push(p);
  });
  return items;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const arrow =
    'inline-flex size-10 items-center justify-center rounded-md border border-line-strong transition-colors hover:border-ink disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <button
        type="button"
        className={arrow}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>

      <ul className="flex items-center gap-1">
        {pageItems(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-ink-subtle">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  'inline-flex size-10 items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                  item === page
                    ? 'bg-inverse font-semibold text-inverse-fg'
                    : 'hover:bg-surface-muted',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className={arrow}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </nav>
  );
}
