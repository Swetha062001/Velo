import { z } from 'zod';
import { INDIAN_STATES } from '../config/india.ts';

/* Mirrors the server rules for instant feedback; the server re-validates everything. */

const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const addressSchema = z.object({
  fullName: required('Full name', 100),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '')),
      'Enter a valid 10-digit Indian mobile number',
    ),
  line1: required('Address', 200),
  line2: z.string().trim().max(200, 'Address line 2 is too long'),
  city: required('City', 100),
  state: z.enum(INDIAN_STATES, 'Choose a state'),
  postalCode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  isDefault: z.boolean(),
});

export type AddressFormValues = z.input<typeof addressSchema>;
export type AddressValues = z.output<typeof addressSchema>;
