import type { BadgeTone } from '../components/common/Badge.tsx';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../types/order.ts';

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  CONFIRMED: { label: 'Confirmed', tone: 'accent' },
  PROCESSING: { label: 'Processing', tone: 'warning' },
  SHIPPED: { label: 'Shipped', tone: 'neutral' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Payment due on delivery',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  REFUNDED: 'Refunded',
};

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; description: string }> =
  [
    {
      value: 'MOCK_CARD',
      label: 'Card (simulated)',
      description: 'Instant approval. No card details are requested.',
    },
    {
      value: 'MOCK_UPI',
      label: 'UPI (simulated)',
      description: 'Instant approval. No UPI app is opened.',
    },
    { value: 'COD', label: 'Cash on delivery', description: 'Pay when your order arrives.' },
  ];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  MOCK_CARD: 'Card (simulated)',
  MOCK_UPI: 'UPI (simulated)',
  COD: 'Cash on delivery',
};
