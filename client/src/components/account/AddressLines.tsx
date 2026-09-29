import type { ShippingAddress } from '../../types/order.ts';

/** Formatted postal address block (also used for order snapshots). */
export function AddressLines({ address }: { address: ShippingAddress }) {
  return (
    <address className="text-sm leading-relaxed text-ink-muted not-italic">
      <span className="font-semibold text-ink">{address.fullName}</span>
      <br />
      {address.line1}
      {address.line2 && (
        <>
          <br />
          {address.line2}
        </>
      )}
      <br />
      {address.city}, {address.state} {address.postalCode}
      <br />
      {address.phone}
    </address>
  );
}
