import { X } from 'lucide-react';
import { GENDER_OPTIONS, PRICE_RANGES } from '../../config/catalog.ts';
import { useCategories } from '../../hooks/useCatalog.ts';
import type { ProductFiltersApi } from '../../hooks/useProductFilters.ts';
import { formatRupees } from '../../utils/money.ts';

function priceLabel(min?: string, max?: string) {
  const preset = PRICE_RANGES.find(
    (r) => r.min === (min ? Number(min) : undefined) && r.max === (max ? Number(max) : undefined),
  );
  if (preset) return preset.label;
  if (min && max) return `${formatRupees(Number(min))} – ${formatRupees(Number(max))}`;
  if (max) return `Up to ${formatRupees(Number(max))}`;
  return `From ${formatRupees(Number(min))}`;
}

/** Removable chips for every active filter. */
export function ActiveFilters({ api }: { api: ProductFiltersApi }) {
  const {
    filters,
    listValues,
    activeCount,
    setFilter,
    setPriceRange,
    toggleListValue,
    clearFilters,
  } = api;
  const categories = useCategories();

  if (activeCount === 0) return null;

  const chips: Array<{ key: string; label: string; remove: () => void }> = [];
  if (filters.category) {
    const name =
      categories.data?.find((c) => c.slug === filters.category)?.name ?? filters.category;
    chips.push({ key: 'category', label: name, remove: () => setFilter('category', undefined) });
  }
  if (filters.gender) {
    const label = GENDER_OPTIONS.find((g) => g.value === filters.gender)?.label ?? filters.gender;
    chips.push({ key: 'gender', label, remove: () => setFilter('gender', undefined) });
  }
  for (const size of listValues('size')) {
    chips.push({
      key: `size-${size}`,
      label: `UK ${size}`,
      remove: () => toggleListValue('size', size),
    });
  }
  for (const color of listValues('color')) {
    chips.push({
      key: `color-${color}`,
      label: color[0]!.toUpperCase() + color.slice(1),
      remove: () => toggleListValue('color', color),
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      key: 'price',
      label: priceLabel(filters.minPrice, filters.maxPrice),
      remove: () => setPriceRange(undefined, undefined),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium transition-colors hover:border-ink"
        >
          {chip.label}
          <X aria-hidden className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={clearFilters}
        className="ml-1 text-xs font-semibold underline underline-offset-4 hover:text-accent"
      >
        Clear all
      </button>
    </div>
  );
}
