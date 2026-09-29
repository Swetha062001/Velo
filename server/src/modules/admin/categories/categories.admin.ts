import { z } from 'zod';
import { query } from '../../../db/index.js';
import { slugSchema } from '../../../schemas/common.js';
import { AppError } from '../../../utils/AppError.js';
import { mapConstraintError } from '../../../utils/dbErrors.js';
import { imageUrlSchema, slugify } from '../products/index.js';

/* ── Schemas ─────────────────────────────────────────────────────────────── */

const fields = {
  name: z.string().trim().min(1, 'Name is required').max(60),
  slug: slugSchema,
  description: z.string().trim().max(500).nullable(),
  imageUrl: imageUrlSchema.nullable(),
  sortOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
};

export const createCategorySchema = z.object({
  ...fields,
  slug: fields.slug.optional(),
  description: fields.description.optional(),
  imageUrl: fields.imageUrl.optional(),
  sortOrder: fields.sortOrder.default(0),
  isActive: fields.isActive.default(true),
});

export const updateCategorySchema = z.object(fields).partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/* ── Repository ──────────────────────────────────────────────────────────── */

interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

const COLUMN: Record<keyof UpdateCategoryInput, string> = {
  name: 'name',
  slug: 'slug',
  description: 'description',
  imageUrl: 'image_url',
  sortOrder: 'sort_order',
  isActive: 'is_active',
};

const SELECT = `
  SELECT c.id, c.name, c.slug, c.description, c.image_url, c.sort_order, c.is_active,
         (SELECT count(*) FROM products p WHERE p.category_id = c.id) AS product_count
  FROM categories c`;

const MESSAGES = { categories_slug_key: 'Another category already uses this slug' };

const toDto = (r: AdminCategoryRow) => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  imageUrl: r.image_url,
  sortOrder: r.sort_order,
  isActive: r.is_active,
  productCount: r.product_count,
});

async function findById(id: string) {
  const rows = await query<AdminCategoryRow>(`${SELECT} WHERE c.id = $1`, [id]);
  return rows[0] ?? null;
}

/* ── Service ─────────────────────────────────────────────────────────────── */

export const adminCategoriesService = {
  async list() {
    return (await query<AdminCategoryRow>(`${SELECT} ORDER BY c.sort_order, c.name`)).map(toDto);
  },

  async create(input: CreateCategoryInput) {
    try {
      const rows = await query<{ id: string }>(
        `INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          input.name,
          input.slug ?? slugify(input.name),
          input.description ?? null,
          input.imageUrl ?? null,
          input.sortOrder,
          input.isActive,
        ],
      );
      return toDto((await findById(rows[0]!.id))!);
    } catch (err) {
      mapConstraintError(err, MESSAGES);
    }
  },

  async update(id: string, input: UpdateCategoryInput) {
    const params: unknown[] = [id];
    const sets: string[] = [];
    for (const [key, column] of Object.entries(COLUMN) as Array<
      [keyof UpdateCategoryInput, string]
    >) {
      if (input[key] !== undefined) {
        params.push(input[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    try {
      if (sets.length)
        await query(`UPDATE categories SET ${sets.join(', ')} WHERE id = $1`, params);
    } catch (err) {
      mapConstraintError(err, MESSAGES);
    }
    const row = await findById(id);
    if (!row) throw AppError.notFound('Category not found');
    return toDto(row);
  },

  /** Only empty categories can be deleted; otherwise hide them (isActive: false). */
  async remove(id: string) {
    const row = await findById(id);
    if (!row) throw AppError.notFound('Category not found');
    if (row.product_count > 0) {
      throw new AppError(
        409,
        'CATEGORY_NOT_EMPTY',
        'Move or delete this category’s products first, or hide the category instead.',
      );
    }
    await query(`DELETE FROM categories WHERE id = $1`, [id]);
  },
};
