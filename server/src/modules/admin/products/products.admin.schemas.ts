import { z } from 'zod';
import { slugSchema } from '../../../schemas/common.js';
import { storage } from '../../../storage/index.js';
import { paginationQuerySchema } from '../../../utils/pagination.js';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const paise = z
  .number()
  .int('Must be whole paise')
  .min(100, 'Minimum ₹1')
  .max(10_000_000, 'Maximum ₹1,00,000');

/** External https URLs (CDN / Unsplash) or files uploaded through /admin/uploads/images. */
export const imageUrlSchema = z
  .url('Enter a valid URL')
  .max(1000)
  .refine(
    (u) => u.startsWith('https://') || storage.keyFromUrl(u) !== null,
    'Use an https:// image URL or upload an image',
  );

export const imageInputSchema = z.object({
  url: imageUrlSchema,
  altText: z.string().trim().min(1, 'Alt text is required').max(200),
});

export const variantInputSchema = z.object({
  sizeLabel: z.string().trim().min(1, 'Size is required').max(20),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,40}$/, 'SKU: 3–40 letters, numbers or dashes'),
  priceOverridePaise: paise.nullable().optional(),
  quantity: z.number().int().min(0, 'Stock cannot be negative').max(100_000),
  lowStockThreshold: z.number().int().min(0).max(1000).default(5),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

const productFields = {
  categoryId: z.uuid('Choose a category'),
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: slugSchema,
  colorway: z.string().trim().min(1, 'Colourway is required').max(60),
  color: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,20}$/, 'Colour family: a single lowercase word, e.g. "white"'),
  gender: z.enum(['MEN', 'WOMEN', 'UNISEX']),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(4000),
  material: z.string().trim().max(300).nullable(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9-]{2,30}$/, 'Tags: lowercase words or dashes'),
    )
    .max(20),
  pricePaise: paise,
  compareAtPricePaise: paise.nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  isFeatured: z.boolean(),
};

const comparePriceRule = {
  check: (v: { pricePaise?: number; compareAtPricePaise?: number | null }) =>
    v.compareAtPricePaise == null ||
    v.pricePaise === undefined ||
    v.compareAtPricePaise > v.pricePaise,
  message: {
    path: ['compareAtPricePaise'],
    message: 'Compare-at price must be higher than the price',
  },
};

export const createProductSchema = z
  .object({
    ...productFields,
    slug: productFields.slug.optional(),
    material: productFields.material.optional(),
    tags: productFields.tags.default([]),
    compareAtPricePaise: productFields.compareAtPricePaise.optional(),
    status: productFields.status.default('DRAFT'),
    isFeatured: productFields.isFeatured.default(false),
    images: z.array(imageInputSchema).max(10).default([]),
    variants: z.array(variantInputSchema).max(30).default([]),
  })
  .refine(comparePriceRule.check, comparePriceRule.message);

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine(comparePriceRule.check, comparePriceRule.message);

export const replaceImagesSchema = z.object({ images: z.array(imageInputSchema).max(10) });

export const updateVariantSchema = variantInputSchema
  .omit({ quantity: true, lowStockThreshold: true })
  .partial();

export const listAdminProductsQuerySchema = paginationQuerySchema.extend({
  q: optional(z.string().trim().max(100)),
  status: optional(z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'])),
  categoryId: optional(z.uuid()),
});

export const idParam = z.object({ id: z.uuid('Invalid id') });
export const variantIdParam = z.object({ variantId: z.uuid('Invalid variant') });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type ImageInput = z.infer<typeof imageInputSchema>;
export type ListAdminProductsQuery = z.infer<typeof listAdminProductsQuerySchema>;
