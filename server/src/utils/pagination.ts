import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

/** `?page=&limit=` — coerced from strings, bounded, with defaults. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function toOffset({ page, limit }: PaginationQuery) {
  return (page - 1) * limit;
}

export function paginationMeta({ page, limit }: PaginationQuery, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
