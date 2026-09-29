import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { COLOR_SWATCHES, GENDER_OPTIONS, PRICE_RANGES } from '../../config/catalog.ts';
import { useCategories, useFacets } from '../../hooks/useCatalog.ts';
import type { ProductFiltersApi } from '../../hooks/useProductFilters.ts';
import { cn } from '../../utils/cn.ts';
import { Skeleton } from '../common/Skeleton.tsx';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <legend className="float-left mb-4 w-full font-sans text-xs font-semibold tracking-[0.16em] text-ink uppercase">
        {title}
      </legend>
      <div className="clear-left">{children}</div>
    </fieldset>
  );
}

/** A radio that can be cleared by clicking it again (single-choice filters). */
function ChoiceRow({
  name,
  label,
  checked,
  count,
  onSelect,
}: {
  name: string;
  label: string;
  checked: boolean;
  count?: number;
  onSelect: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm">
      <span className="flex items-center gap-3">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onSelect}
          onClick={() => checked && onSelect()}
          className="size-4 accent-[var(--velo-ink)]"
        />
        <span className={cn(checked ? 'font-semibold text-ink' : 'text-ink-muted')}>{label}</span>
      </span>
      {count !== undefined && <span className="text-xs text-ink-subtle tabular-nums">{count}</span>}
    </label>
  );
}

export function FilterPanel({
  api,
  idPrefix = 'f',
}: {
  api: ProductFiltersApi;
  idPrefix?: string;
}) {
  const { filters, listValues, setFilter, setPriceRange, toggleListValue } = api;
  const categories = useCategories();
  const facets = useFacets();

  const selectedColors = listValues('color');
  const selectedSizes = listValues('size');
  const minPrice = filters.minPrice ? Number(filters.minPrice) : undefined;
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : undefined;

  return (
    <div>
      <Section title="Category">
        {categories.isPending ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          categories.data?.map((c) => (
            <ChoiceRow
              key={c.slug}
              name={`${idPrefix}-category`}
              label={c.name}
              count={c.productCount}
              checked={filters.category === c.slug}
              onSelect={() =>
                setFilter('category', filters.category === c.slug ? undefined : c.slug)
              }
            />
          ))
        )}
      </Section>

      <Section title="Gender">
        {GENDER_OPTIONS.map((g) => (
          <ChoiceRow
            key={g.value}
            name={`${idPrefix}-gender`}
            label={g.label}
            checked={filters.gender === g.value}
            onSelect={() => setFilter('gender', filters.gender === g.value ? undefined : g.value)}
          />
        ))}
      </Section>

      <Section title="Size (UK)">
        {facets.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {facets.data?.sizes.map((label) => {
              const value = label.replace(/^UK\s*/, '');
              const selected = selectedSizes.includes(value);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Size ${label}`}
                  onClick={() => toggleListValue('size', value)}
                  className={cn(
                    'h-10 rounded-sm border text-sm tabular-nums transition-colors',
                    selected
                      ? 'border-ink bg-inverse text-inverse-fg'
                      : 'border-line-strong hover:border-ink',
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Colour">
        {facets.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {facets.data?.colors.map(({ value, count }) => {
              const selected = selectedColors.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  title={`${value} (${count})`}
                  onClick={() => toggleListValue('color', value)}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'relative flex size-8 items-center justify-center rounded-full border transition-shadow',
                      selected
                        ? 'border-ink ring-2 ring-ink ring-offset-2 ring-offset-canvas'
                        : 'border-line-strong group-hover:border-ink',
                    )}
                    style={{ backgroundColor: COLOR_SWATCHES[value] ?? '#ccc' }}
                  >
                    {selected && (
                      <Check
                        aria-hidden
                        className="size-4"
                        style={{
                          color: ['white', 'beige', 'pink'].includes(value) ? '#161616' : '#fff',
                        }}
                      />
                    )}
                  </span>
                  <span className="text-[0.7rem] text-ink-muted capitalize">{value}</span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Price">
        {PRICE_RANGES.map((range) => {
          const checked = minPrice === range.min && maxPrice === range.max;
          return (
            <ChoiceRow
              key={range.label}
              name={`${idPrefix}-price`}
              label={range.label}
              checked={checked}
              onSelect={() =>
                checked ? setPriceRange(undefined, undefined) : setPriceRange(range.min, range.max)
              }
            />
          );
        })}
      </Section>
    </div>
  );
}
