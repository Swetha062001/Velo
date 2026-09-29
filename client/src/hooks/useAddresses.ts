import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddressValues } from '../schemas/address.schemas.ts';
import { addressService } from '../services/order.service.ts';

export const ADDRESSES_KEY = ['addresses'] as const;

export function useAddresses() {
  return useQuery({
    queryKey: ADDRESSES_KEY,
    queryFn: ({ signal }) => addressService.list(signal),
  });
}

/** Any change can move the default flag between addresses, so refetch the list afterwards. */
function useAddressMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY }),
  });
}

export const useCreateAddress = () =>
  useAddressMutation((values: AddressValues) => addressService.create(values));

export const useUpdateAddress = () =>
  useAddressMutation(({ id, values }: { id: string; values: Partial<AddressValues> }) =>
    addressService.update(id, values),
  );

export const useDeleteAddress = () => useAddressMutation((id: string) => addressService.remove(id));
