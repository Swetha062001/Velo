export const CHECKOUT_STEPS = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'review', label: 'Review' },
  { id: 'payment', label: 'Payment' },
] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]['id'];
