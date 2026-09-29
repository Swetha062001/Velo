import { z } from 'zod';
import { INDIAN_STATES } from '../../config/india.js';

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

/** Accepts "98765 43210", "+91 98765-43210", "09876543210" → stored as "+91 9876543210". */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'))
  .transform((digits) => `+91 ${digits}`);

const postalCode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');

const optionalLine = z
  .string()
  .trim()
  .max(200, 'Address line 2 is too long')
  .optional()
  .transform((v) => (v ? v : null));

export const createAddressSchema = z.object({
  fullName: text('Full name', 100),
  phone,
  line1: text('Address', 200),
  line2: optionalLine,
  city: text('City', 100),
  state: z.enum(INDIAN_STATES, 'Choose a state'),
  postalCode,
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressIdParamSchema = z.object({ id: z.uuid('Invalid address') });

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
