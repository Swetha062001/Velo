import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { ProductFilters } from '../types/catalog.ts';

const FILTER_KEYS = [
  'q',
  'category',
  'gender',
  'color',
  'size',
  'minPrice',
  'maxPrice',
  'sort',
  'page',
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];
type ListKey = 'color' | 'size';

/**
 * The URL is the single source of truth for catalogue filters, so results are
 * shareable, bookmarkable and survive refresh / back navigation.
 */
export function useProductFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const out: Record<string, string> = {};
    for (const key of FILTER_KEYS) {
      const value = params.get(key);
      if (value) out[key] = value;
    }
    return out as ProductFilters;
  }, [params]);

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void, { resetPage = true, scroll = false } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          if (resetPage) next.delete('page');
          return next;
        },
        { preventScrollReset: !scroll },
      );
    },
    [setParams],
  );

  const setFilter = useCallback(
    (key: FilterKey, value: string | undefined) =>
      update((next) => (value ? next.set(key, value) : next.delete(key))),
    [update],
  );

  const setPriceRange = useCallback(
    (min?: number, max?: number) =>
      update((next) => {
        if (min === undefined) next.delete('minPrice');
        else next.set('minPrice', String(min));
        if (max === undefined) next.delete('maxPrice');
        else next.set('maxPrice', String(max));
      }),
    [update],
  );

  /** Adds/removes one value of a comma-separated filter (colour, size). */
  const toggleListValue = useCallback(
    (key: ListKey, value: string) =>
      update((next) => {
        const values = new Set((next.get(key) ?? '').split(',').filter(Boolean));
        if (values.has(value)) values.delete(value);
        else values.add(value);
        if (values.size) next.set(key, [...values].join(','));
        else next.delete(key);
      }),
    [update],
  );

  const setPage = useCallback(
    (page: number) =>
      update((next) => (page > 1 ? next.set('page', String(page)) : next.delete('page')), {
        resetPage: false,
        scroll: true,
      }),
    [update],
  );

  /** Clears filters but keeps the search term. */
  const clearFilters = useCallback(
    () =>
      update((next) => {
        for (const key of FILTER_KEYS) if (key !== 'q') next.delete(key);
      }),
    [update],
  );

  const listValues = (key: ListKey) => (filters[key] ?? '').split(',').filter(Boolean);

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.gender ? 1 : 0) +
    listValues('color').length +
    listValues('size').length +
    (filters.minPrice || filters.maxPrice ? 1 : 0);

  return {
    filters,
    listValues,
    activeCount,
    setFilter,
    setPriceRange,
    toggleListValue,
    setPage,
    clearFilters,
  };
}

export type ProductFiltersApi = ReturnType<typeof useProductFilters>;
