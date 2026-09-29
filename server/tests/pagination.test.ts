import { describe, expect, it } from 'vitest';
import { paginationMeta, paginationQuerySchema, toOffset } from '../src/utils/pagination.js';

describe('pagination', () => {
  it('applies defaults and coerces strings', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 12 });
    expect(paginationQuerySchema.parse({ page: '2', limit: '24' })).toEqual({ page: 2, limit: 24 });
  });

  it('rejects out-of-range values', () => {
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ limit: '1000' }).success).toBe(false);
  });

  it('computes offset and meta', () => {
    expect(toOffset({ page: 3, limit: 12 })).toBe(24);
    expect(paginationMeta({ page: 1, limit: 12 }, 30)).toEqual({
      page: 1,
      limit: 12,
      total: 30,
      totalPages: 3,
    });
    expect(paginationMeta({ page: 1, limit: 12 }, 0).totalPages).toBe(1);
  });
});
