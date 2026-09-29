import { z } from 'zod';
import { slugSchema } from '../../schemas/common.js';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const PRODUCT_SORTS = [
  'featured',
  'newest',
  'price-low',
  'price-high',
  'relevance',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Treat `?param=` (empty) as absent, so cleared filters don't fail validation. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

/** Comma-separated list of tokens: `?color=white,black` → ['white', 'black']. */
const csv = (pattern: RegExp, message: string) =>
  z
    .string()
    .max(200)
    .transform((s) =>
      s
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(pattern, message)).max(20));

const booleanFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

/** Price filters are whole rupees in the URL (`maxPrice=5000`); converted to paise in the service. */
const rupees = z.coerce.number().int().min(0).max(10_000_000);

export const listProductsQuerySchema = paginationQuerySchema
  .extend({
    q: optional(z.string().trim().max(100)),
    category: optional(slugSchema),
    gender: optional(z.enum(['men', 'women', 'unisex'])),
    color: optional(csv(/^[a-z]+$/, 'Invalid colour')),
    size: optional(csv(/^\d{1,2}(\.5)?$/, 'Invalid UK size')),
    minPrice: optional(rupees),
    maxPrice: optional(rupees),
    featured: optional(booleanFlag),
    inStock: optional(booleanFlag),
    sort: optional(z.enum(PRODUCT_SORTS)),
  })
  .refine((f) => f.minPrice === undefined || f.maxPrice === undefined || f.minPrice <= f.maxPrice, {
    path: ['maxPrice'],
    message: 'maxPrice must be greater than or equal to minPrice',
  });

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
