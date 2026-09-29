import { z } from 'zod';
import { query } from '../../../db/index.js';
import { AppError } from '../../../utils/AppError.js';
import { paginationMeta, paginationQuerySchema, toOffset } from '../../../utils/pagination.js';

/* ── Schemas ─────────────────────────────────────────────────────────────── */

export const listInventoryQuerySchema = paginationQuerySchema.extend({
  q: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(100).optional()),
  /** low = at or below threshold (but not zero), out = zero. */
  filter: z.enum(['all', 'low', 'out']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateInventorySchema = z
  .object({
    quantity: z.number().int().min(0, 'Stock cannot be negative').max(100_000).optional(),
    lowStockThreshold: z.number().int().min(0).max(1000).optional(),
  })
  .refine((v) => v.quantity !== undefined || v.lowStockThreshold !== undefined, {
    message: 'Provide quantity and/or lowStockThreshold',
  });

export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;

/* ── Repository + service ────────────────────────────────────────────────── */

interface InventoryRow {
  variant_id: string;
  product_id: string;
  product_name: string;
  colorway: string;
  product_status: string;
  size_label: string;
  sku: string;
  variant_active: boolean;
  quantity: number;
  low_stock_threshold: number;
  updated_at: Date;
  total_count: number;
}

const FILTERS: Record<ListInventoryQuery['filter'], string> = {
  all: 'true',
  low: 'i.quantity > 0 AND i.quantity <= i.low_stock_threshold',
  out: 'i.quantity = 0',
};

const SELECT = `
  SELECT v.id AS variant_id, p.id AS product_id, p.name AS product_name, p.colorway,
         p.status AS product_status, v.size_label, v.sku, v.is_active AS variant_active,
         i.quantity, i.low_stock_threshold, i.updated_at`;

const toDto = (r: Omit<InventoryRow, 'total_count'>) => ({
  variantId: r.variant_id,
  productId: r.product_id,
  productName: r.product_name,
  colorway: r.colorway,
  productStatus: r.product_status,
  sizeLabel: r.size_label,
  sku: r.sku,
  isActive: r.variant_active,
  quantity: r.quantity,
  lowStockThreshold: r.low_stock_threshold,
  updatedAt: r.updated_at.toISOString(),
});

export const adminInventoryService = {
  async list(q: ListInventoryQuery) {
    const params: unknown[] = [];
    const where = [FILTERS[q.filter]];
    if (q.q) {
      params.push(`%${q.q}%`);
      where.push(`(p.name ILIKE $1 OR p.colorway ILIKE $1 OR v.sku ILIKE $1)`);
    }
    params.push(q.limit, toOffset(q));

    // Most urgent first: lowest stock relative to its threshold.
    const rows = await query<InventoryRow>(
      `${SELECT}, count(*) OVER () AS total_count
       FROM inventory i
       JOIN product_variants v ON v.id = i.variant_id
       JOIN products p ON p.id = v.product_id
       WHERE ${where.join(' AND ')}
       ORDER BY (i.quantity - i.low_stock_threshold) ASC, p.name, v.sort_order
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: rows.map(toDto), meta: paginationMeta(q, rows[0]?.total_count ?? 0) };
  },

  /** Sets absolute values (not deltas), so repeating the same request is harmless. */
  async update(variantId: string, input: UpdateInventoryInput) {
    const rows = await query<{ variant_id: string }>(
      `UPDATE inventory
       SET quantity = COALESCE($2, quantity),
           low_stock_threshold = COALESCE($3, low_stock_threshold)
       WHERE variant_id = $1 RETURNING variant_id`,
      [variantId, input.quantity ?? null, input.lowStockThreshold ?? null],
    );
    if (!rows[0]) throw AppError.notFound('Size not found');

    const [row] = await query<Omit<InventoryRow, 'total_count'>>(
      `${SELECT}
       FROM inventory i JOIN product_variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id
       WHERE v.id = $1`,
      [variantId],
    );
    return toDto(row!);
  },
};
