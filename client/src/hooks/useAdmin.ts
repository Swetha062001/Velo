import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { adminService } from '../services/admin.service.ts';
import type { AdminProduct } from '../types/admin.ts';

/** All admin data lives under one key prefix, so a mutation can refresh everything it affects. */
export const adminKeys = {
  all: ['admin'] as const,
  stats: ['admin', 'stats'] as const,
  products: (q: object) => ['admin', 'products', 'list', q] as const,
  product: (id: string) => ['admin', 'products', 'detail', id] as const,
  categories: ['admin', 'categories'] as const,
  inventory: (q: object) => ['admin', 'inventory', q] as const,
  orders: (q: object) => ['admin', 'orders', 'list', q] as const,
  order: (n: string) => ['admin', 'orders', 'detail', n] as const,
  users: (q: object) => ['admin', 'users', q] as const,
};

/**
 * List-page filters in the URL (`?q=&status=&page=`), so admin views are linkable and
 * survive refresh. Changing any filter resets to page 1.
 */
export function useListParams(keys: readonly string[]) {
  const [params, setParams] = useSearchParams();
  const values: Record<string, string | undefined> = {};
  for (const key of [...keys, 'page']) values[key] = params.get(key) ?? undefined;
  const page = Math.max(1, Number(values.page) || 1);

  const set = useCallback(
    (key: string, value: string | undefined) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          if (key !== 'page') next.delete('page');
          return next;
        },
        { preventScrollReset: key !== 'page' },
      ),
    [setParams],
  );

  return { values, page, set };
}

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: ({ signal }) => adminService.stats(signal),
  });
}

export function useAdminProducts(q: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.products(q),
    queryFn: ({ signal }) => adminService.listProducts(q, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.product(id ?? ''),
    queryFn: ({ signal }) => adminService.getProduct(id!, signal),
    enabled: Boolean(id),
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories,
    queryFn: ({ signal }) => adminService.listCategories(signal),
  });
}

export function useAdminInventory(q: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.inventory(q),
    queryFn: ({ signal }) => adminService.listInventory(q, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrders(q: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.orders(q),
    queryFn: ({ signal }) => adminService.listOrders(q, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(orderNumber: string) {
  return useQuery({
    queryKey: adminKeys.order(orderNumber),
    queryFn: ({ signal }) => adminService.getOrder(orderNumber, signal),
  });
}

export function useAdminUsers(q: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.users(q),
    queryFn: ({ signal }) => adminService.listUsers(q, signal),
    placeholderData: keepPreviousData,
  });
}

/**
 * Admin mutation that refreshes admin views and the storefront catalogue afterwards
 * (a price, stock or status change is visible to shoppers).
 */
export function useAdminMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  { onSuccess }: { onSuccess?: (result: TResult) => void } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      // A mutation that returns the full product lets the editor update without a refetch.
      if (result && typeof result === 'object' && 'variants' in result && 'id' in result) {
        const product = result as unknown as AdminProduct;
        queryClient.setQueryData(adminKeys.product(product.id), product);
      }
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      onSuccess?.(result);
    },
  });
}
