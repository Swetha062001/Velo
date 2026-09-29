import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const PAYMENT_METHODS = ['MOCK_CARD', 'MOCK_UPI', 'COD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const placeOrderSchema = z.object({
  addressId: z.uuid('Choose a shipping address'),
  /** Generated once per checkout by the client; makes retries safe (no duplicate orders). */
  idempotencyKey: z.uuid('Invalid idempotency key'),
  paymentMethod: z.enum(PAYMENT_METHODS, 'Choose a payment method'),
  /** The total the shopper saw. If the server's total differs, the order is not placed. */
  expectedTotalPaise: z.number().int().min(0).optional(),
  /** Demo only: exercise the payment-declined path. */
  simulateDecline: z.boolean().optional(),
});

export const listOrdersQuerySchema = paginationQuerySchema;

export const orderNumberParamSchema = z.object({
  orderNumber: z.string().regex(/^VELO-\d{4}-\d{6,}$/, 'Invalid order number'),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
