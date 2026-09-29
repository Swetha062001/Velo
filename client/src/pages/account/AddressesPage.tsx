import { MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddressForm } from '../../components/account/AddressForm.tsx';
import { AddressLines } from '../../components/account/AddressLines.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { Button } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { useAddresses, useDeleteAddress, useUpdateAddress } from '../../hooks/useAddresses.ts';
import type { Address } from '../../types/order.ts';
import { errorMessage } from '../../utils/forms.ts';

function AddressCard({ address, onEdit }: { address: Address; onEdit: () => void }) {
  const update = useUpdateAddress();
  const remove = useDeleteAddress();
  const [confirming, setConfirming] = useState(false);
  const error = update.error ?? remove.error;

  return (
    <li className="flex flex-col rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <AddressLines address={address} />
        {address.isDefault && <Badge tone="accent">Default</Badge>}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-sm font-medium">
        {confirming ? (
          <>
            <span className="text-ink-muted">Delete this address?</span>
            <button
              type="button"
              onClick={() => remove.mutate(address.id)}
              disabled={remove.isPending}
              className="text-danger underline-offset-4 hover:underline"
            >
              Yes, delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="hover:underline">
              Keep
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} className="underline-offset-4 hover:underline">
              Edit
            </button>
            {!address.isDefault && (
              <button
                type="button"
                onClick={() => update.mutate({ id: address.id, values: { isDefault: true } })}
                disabled={update.isPending}
                className="underline-offset-4 hover:underline"
              >
                Set as default
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-ink-muted underline-offset-4 hover:text-danger hover:underline"
            >
              Delete
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {errorMessage(error)}
        </p>
      )}
    </li>
  );
}

export default function AddressesPage() {
  const { data: addresses, isPending, isError, refetch } = useAddresses();
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  return (
    <>
      <DocumentTitle title="Addresses" />
      <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Addresses</h1>
          <p className="mt-2 text-sm text-ink-muted">Saved addresses for faster checkout.</p>
        </div>
        {addresses && addresses.length > 0 && editing !== 'new' && (
          <Button variant="secondary" size="sm" onClick={() => setEditing('new')}>
            <Plus aria-hidden className="size-4" /> Add address
          </Button>
        )}
      </div>

      {editing === 'new' && (
        <section className="mb-8 rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-5 font-sans text-base font-semibold tracking-normal">New address</h2>
          <AddressForm onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </section>
      )}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load your addresses." onRetry={() => refetch()} />
      ) : addresses.length === 0 && editing !== 'new' ? (
        <div className="rounded-lg border border-dashed border-line-strong">
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            description="Add an address to check out faster."
            action={<Button onClick={() => setEditing('new')}>Add address</Button>}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) =>
            editing === address.id ? (
              <li
                key={address.id}
                className="rounded-lg border border-line bg-surface p-6 sm:col-span-2"
              >
                <h2 className="mb-5 font-sans text-base font-semibold tracking-normal">
                  Edit address
                </h2>
                <AddressForm
                  address={address}
                  onDone={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => setEditing(address.id)}
              />
            ),
          )}
        </ul>
      )}
    </>
  );
}
