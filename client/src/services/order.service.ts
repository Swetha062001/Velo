import { api } from '../lib/apiClient.ts';
import type { AddressValues } from '../schemas/address.schemas.ts';
import type { Address, Order, OrderListMeta, OrderSummary, PaymentMethod } from '../types/order.ts';

export interface PlaceOrderInput {
  addressId: string;
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  expectedTotalPaise: number;
  simulateDecline?: boolean;
}

export const addressService = {
  list: (signal?: AbortSignal) => api.get<Address[]>('/users/me/addresses', { signal }),
  create: (values: AddressValues) => api.post<Address>('/users/me/addresses', values),
  update: (id: string, values: Partial<AddressValues>) =>
    api.patch<Address>(`/users/me/addresses/${id}`, values),
  remove: (id: string) => api.delete<void>(`/users/me/addresses/${id}`),
};

export const orderService = {
  place: (input: PlaceOrderInput) => api.post<Order>('/orders', input),
  async list(page: number, signal?: AbortSignal) {
    const { data, meta } = await api.getWithMeta<OrderSummary[], OrderListMeta>('/orders', {
      query: { page, limit: 10 },
      signal,
    });
    return { items: data, meta };
  },
  get: (orderNumber: string, signal?: AbortSignal) =>
    api.get<Order>(`/orders/${encodeURIComponent(orderNumber)}`, { signal }),
  cancel: (orderNumber: string) =>
    api.post<Order>(`/orders/${encodeURIComponent(orderNumber)}/cancel`),
};
