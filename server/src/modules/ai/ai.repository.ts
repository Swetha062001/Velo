import { query } from '../../db/index.js';
import {
  SUMMARY_COLUMNS,
  SUMMARY_JOINS,
  VISIBLE,
  type ProductSummaryRow,
} from '../products/products.repository.js';
import type { Gender } from '../products/products.types.js';

export interface CandidateRow extends ProductSummaryRow {
  tags: string[];
  material: string | null;
  excerpt: string;
  sizes_in_stock: string[];
}

export interface CandidateFilters {
  category?: string | null;
  genders?: Gender[] | null;
  colors?: string[];
  minPricePaise?: number | null;
  maxPricePaise?: number | null;
  sizeLabel?: string | null;
  limit: number;
}

const IN_STOCK_SIZES = `
  (SELECT COALESCE(array_agg(v.size_label ORDER BY v.sort_order), '{}')
   FROM product_variants v JOIN inventory i ON i.variant_id = v.id
   WHERE v.product_id = p.id AND v.is_active AND i.quantity > 0)`;

/**
 * Catalogue retrieval for the assistant. The model never queries the database: the server
 * builds these parameterised filters from the (validated) intent and hands the model only the
 * resulting rows. Only live, in-stock products are ever candidates.
 */
export const aiRepository = {
  findCandidates(f: CandidateFilters) {
    const params: unknown[] = [];
    const add = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    const where = [VISIBLE, `cardinality(${IN_STOCK_SIZES}) > 0`];
    if (f.category) where.push(`c.slug = ${add(f.category)}`);
    if (f.genders?.length) where.push(`p.gender = ANY(${add(f.genders)}::product_gender[])`);
    if (f.colors?.length) where.push(`p.color = ANY(${add(f.colors)}::text[])`);
    if (f.minPricePaise != null) where.push(`p.price_paise >= ${add(f.minPricePaise)}`);
    if (f.maxPricePaise != null) where.push(`p.price_paise <= ${add(f.maxPricePaise)}`);
    if (f.sizeLabel) where.push(`${add(f.sizeLabel)} = ANY(${IN_STOCK_SIZES})`);

    return query<CandidateRow>(
      `SELECT ${SUMMARY_COLUMNS}, p.tags, p.material,
              left(p.description, 220) AS excerpt,
              ${IN_STOCK_SIZES} AS sizes_in_stock
       FROM products p ${SUMMARY_JOINS}
       WHERE ${where.join(' AND ')}
       ORDER BY p.is_featured DESC, p.price_paise ASC
       LIMIT ${add(f.limit)}`,
      params,
    );
  },

  async vocabulary() {
    const [categories, colors] = await Promise.all([
      query<{ slug: string }>(`SELECT slug FROM categories WHERE is_active ORDER BY sort_order`),
      query<{ color: string }>(
        `SELECT DISTINCT p.color FROM products p JOIN categories c ON c.id = p.category_id WHERE ${VISIBLE}`,
      ),
    ]);
    return { categories: categories.map((c) => c.slug), colors: colors.map((c) => c.color) };
  },
};
