import { ChevronDown } from 'lucide-react';
import { SORT_OPTIONS } from '../../config/catalog.ts';
import type { ProductSort } from '../../types/catalog.ts';

interface SortSelectProps {
  value: ProductSort | undefined;
  hasSearch: boolean;
  onChange: (value: ProductSort | undefined) => void;
}

export function SortSelect({ value, hasSearch, onChange }: SortSelectProps) {
  const options = hasSearch
    ? [{ value: 'relevance' as const, label: 'Best match' }, ...SORT_OPTIONS]
    : SORT_OPTIONS;
  const current = value ?? (hasSearch ? 'relevance' : 'featured');

  return (
    <label className="relative inline-flex items-center gap-2 text-sm">
      <span className="text-ink-muted">Sort</span>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value as ProductSort;
          // Default sorts are omitted from the URL to keep it clean.
          onChange(next === (hasSearch ? 'relevance' : 'featured') ? undefined : next);
        }}
        className="h-10 cursor-pointer appearance-none rounded-md border border-line-strong bg-surface py-0 pr-9 pl-3 text-sm font-medium hover:border-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 size-4 text-ink-muted"
      />
    </label>
  );
}
