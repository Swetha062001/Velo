import { query } from '../../db/index.js';

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  product_count: number;
}

const SELECT_CATEGORIES = `
  SELECT c.id, c.name, c.slug, c.description, c.image_url,
         count(p.id) FILTER (WHERE p.status = 'ACTIVE') AS product_count
  FROM categories c
  LEFT JOIN products p ON p.category_id = c.id
  WHERE c.is_active`;

export const categoriesRepository = {
  listActive() {
    return query<CategoryRow>(`${SELECT_CATEGORIES} GROUP BY c.id ORDER BY c.sort_order, c.name`);
  },

  async findActiveBySlug(slug: string) {
    const rows = await query<CategoryRow>(`${SELECT_CATEGORIES} AND c.slug = $1 GROUP BY c.id`, [
      slug,
    ]);
    return rows[0] ?? null;
  },
};
