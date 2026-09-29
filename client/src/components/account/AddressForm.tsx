import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { INDIAN_STATES } from '../../config/india.ts';
import { useCreateAddress, useUpdateAddress } from '../../hooks/useAddresses.ts';
import {
  addressSchema,
  type AddressFormValues,
  type AddressValues,
} from '../../schemas/address.schemas.ts';
import type { Address } from '../../types/order.ts';
import { applyServerErrors, errorMessage } from '../../utils/forms.ts';
import { Alert } from '../common/Alert.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Select } from '../common/Select.tsx';

const FIELDS = ['fullName', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode'] as const;

interface AddressFormProps {
  /** Edit this address; omit to create a new one. */
  address?: Address;
  onDone: (address: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function AddressForm({ address, onDone, onCancel, submitLabel }: AddressFormProps) {
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const mutation = address ? update : create;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddressFormValues, unknown, AddressValues>({
    resolver: zodResolver(addressSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: address?.fullName ?? '',
      phone: address?.phone.replace(/^\+91\s?/, '') ?? '',
      line1: address?.line1 ?? '',
      line2: address?.line2 ?? '',
      city: address?.city ?? '',
      state: (address?.state as AddressFormValues['state']) ?? ('' as AddressFormValues['state']),
      postalCode: address?.postalCode ?? '',
      isDefault: address?.isDefault ?? false,
    },
  });

  const onSubmit = handleSubmit((values) => {
    const options = {
      onSuccess: onDone,
      onError: (err: unknown) => applyServerErrors(err, setError, FIELDS),
    };
    if (address) update.mutate({ id: address.id, values }, options);
    else create.mutate(values, options);
  });

  const hasFieldErrors = FIELDS.some((f) => errors[f]);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {mutation.isError && !hasFieldErrors && (
        <Alert tone="danger">{errorMessage(mutation.error)}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>
      <Input
        label="Address"
        autoComplete="address-line1"
        placeholder="House / flat no., building, street"
        error={errors.line1?.message}
        {...register('line1')}
      />
      <Input
        label="Address line 2 (optional)"
        autoComplete="address-line2"
        placeholder="Area, landmark"
        error={errors.line2?.message}
        {...register('line2')}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="City"
          autoComplete="address-level2"
          error={errors.city?.message}
          {...register('city')}
        />
        <Select
          label="State"
          autoComplete="address-level1"
          placeholder="Select state"
          options={INDIAN_STATES}
          error={errors.state?.message}
          {...register('state')}
        />
        <Input
          label="PIN code"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          error={errors.postalCode?.message}
          {...register('postalCode')}
        />
      </div>

      {!address?.isDefault && (
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--velo-ink)]"
            {...register('isDefault')}
          />
          Use as my default address
        </label>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" loading={mutation.isPending}>
          {submitLabel ?? (address ? 'Save address' : 'Add address')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
