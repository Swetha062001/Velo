import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CART_KEY } from '../lib/cartSync.ts';
import { orderService, type PlaceOrderInput } from '../services/order.service.ts';
import type { Order } from '../types/order.ts';
import { EMPTY_CART } from './useCart.ts';

export const orderKeys = {
  all: ['orders'] as const,
  list: (page: number) => ['orders', 'list', page] as const,
  detail: (orderNumber: string) => ['orders', 'detail', orderNumber] as const,
};

export function useOrders(page: number) {
  return useQuery({
    queryKey: orderKeys.list(page),
    queryFn: ({ signal }) => orderService.list(page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderNumber),
    queryFn: ({ signal }) => orderService.get(orderNumber, signal),
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => orderService.place(input),
    onSuccess: (order) => {
      // The server cleared the bag and deducted stock in the same transaction.
      queryClient.setQueryData(CART_KEY, EMPTY_CART);
      queryClient.setQueryData(orderKeys.detail(order.orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => orderService.cancel(orderNumber),
    onSuccess: (order: Order) => {
      queryClient.setQueryData(orderKeys.detail(order.orderNumber), order);
      void queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] }); // stock returned
    },
  });
}
