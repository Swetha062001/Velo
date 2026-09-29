import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogService } from '../services/catalog.service.ts';
import type { ProductFilters } from '../types/catalog.ts';

export const catalogKeys = {
  products: (filters: ProductFilters) => ['products', 'list', filters] as const,
  product: (slug: string) => ['products', 'detail', slug] as const,
  facets: ['products', 'facets'] as const,
  categories: ['categories'] as const,
};

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: catalogKeys.products(filters),
    queryFn: ({ signal }) => catalogService.listProducts(filters, signal),
    // Keep showing the previous results while a new filter combination loads.
    placeholderData: keepPreviousData,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: ({ signal }) => catalogService.getProduct(slug, signal),
  });
}

/** Rarely changes — cache for 10 minutes. */
export function useFacets() {
  return useQuery({
    queryKey: catalogKeys.facets,
    queryFn: ({ signal }) => catalogService.getFacets(signal),
    staleTime: 10 * 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: ({ signal }) => catalogService.listCategories(signal),
    staleTime: 10 * 60_000,
  });
}
