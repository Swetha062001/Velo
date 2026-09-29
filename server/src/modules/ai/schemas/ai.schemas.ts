import { z } from 'zod';

/* ── API input ──────────────────────────────────────────────────────────── */

export const shoppingIntentSchema = z.object({
  keywords: z.array(z.string()).max(6),
  category: z.string().nullable(),
  gender: z.enum(['men', 'women', 'unisex']).nullable(),
  colors: z.array(z.string()).max(4),
  minPriceInr: z.number().nullable(),
  maxPriceInr: z.number().nullable(),
  size: z.string().nullable(),
});

export type ShoppingIntent = z.infer<typeof shoppingIntentSchema>;

export const assistantRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, 'Tell me what you are looking for')
    .max(500, 'Please keep it under 500 characters'),
  /** Recent turns, for follow-ups like "any cheaper?". */
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(800) }))
    .max(6)
    .default([]),
  /** Filters applied in the previous answer (returned by this API), for refinements. */
  context: shoppingIntentSchema.partial().optional(),
});

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

/* ── Model outputs (always re-validated; never trusted) ─────────────────── */

/** Step 1: free text → filters. Values are checked against the real catalogue afterwards. */
export const llmIntentSchema = z.object({
  keywords: z.array(z.string().max(30)).max(6),
  category: z.string().max(30).nullable(),
  gender: z.enum(['men', 'women', 'unisex']).nullable(),
  colors: z.array(z.string().max(20)).max(4),
  minPriceInr: z.number().nullable(),
  maxPriceInr: z.number().nullable(),
  size: z.string().max(10).nullable(),
});

/** Step 2: pick from the numbered candidate list only (refs like "P3"). */
export const llmRecommendationSchema = z.object({
  reply: z.string().max(400),
  picks: z.array(z.object({ ref: z.string().max(5), reason: z.string().max(240) })).max(4),
});
