import { z } from 'zod';

/** "4,999.50" / "4999" → paise. */
const rupees = z
  .string()
  .trim()
  .transform((v) => v.replace(/,/g, ''))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount in rupees, e.g. 4999'))
  .transform((v) => Math.round(Number(v) * 100))
  .pipe(z.number().min(100, 'Minimum ₹1').max(10_000_000, 'Maximum ₹1,00,000'));

const optionalRupees = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .pipe(rupees.nullable());

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    colorway: z.string().trim().min(1, 'Colourway is required').max(60),
    color: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z]{2,20}$/, 'One lowercase word, e.g. white'),
    gender: z.enum(['MEN', 'WOMEN', 'UNISEX']),
    categoryId: z.string().min(1, 'Choose a category'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .refine(
        (v) => v === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v),
        'Lowercase letters, numbers and dashes',
      )
      .transform((v) => v || undefined),
    description: z.string().trim().min(20, 'At least 20 characters').max(4000),
    material: z
      .string()
      .trim()
      .max(300)
      .transform((v) => v || null),
    tags: z
      .string()
      .transform((v) =>
        v
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      )
      .pipe(
        z.array(z.string().regex(/^[a-z0-9-]{2,30}$/, 'Tags: lowercase words or dashes')).max(20),
      ),
    price: rupees,
    compareAt: optionalRupees,
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
    isFeatured: z.boolean(),
  })
  .refine((v) => v.compareAt === null || v.compareAt > v.price, {
    path: ['compareAt'],
    message: 'Must be higher than the price (it is the "was" price)',
  });

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormOutput = z.output<typeof productFormSchema>;

export const PRODUCT_FORM_FIELDS = [
  'name',
  'colorway',
  'color',
  'gender',
  'categoryId',
  'slug',
  'description',
  'material',
  'tags',
  'price',
  'compareAt',
  'status',
  'isFeatured',
] as const;

/** Server field names that differ from the form's. */
export const PRODUCT_FIELD_ALIASES = {
  pricePaise: 'price',
  compareAtPricePaise: 'compareAt',
} as const;

export const toRupeesInput = (paise: number | null | undefined) =>
  paise == null ? '' : String(paise / 100);
