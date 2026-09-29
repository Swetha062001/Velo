import { query } from '../../db/index.js';
import type { Gender, ProductImage } from './products.types.js';
import type { ProductSort } from './products.schemas.js';

/** Filters in database terms (paise, enum values, size labels) — built by the service. */
export interface ProductFilters {
  tsQuery?: string;
  category?: string;
  genders?: Gender[];
  colors?: string[];
  sizeLabels?: string[];
  minPricePaise?: number;
  maxPricePaise?: number;
  featured?: boolean;
  inStock?: boolean;
  sort: ProductSort;
  limit: number;
  offset: number;
}

export interface ProductSummaryRow {
  id: string;
  slug: string;
  name: string;
  colorway: string;
  color: string;
  gender: Gender;
  price_paise: number;
  compare_at_price_paise: number | null;
  is_featured: boolean;
  category_slug: string;
  category_name: string;
  in_stock: boolean;
  images: ProductImage[];
}

export interface ProductDetailRow extends ProductSummaryRow {
  description: string;
  material: string | null;
  brand: string;
  tags: string[];
}

export interface VariantRow {
  id: string;
  size_label: string;
  sku: string;
  price_paise: number;
  is_active: boolean;
  quantity: number;
  low_stock_threshold: number;
}

/** Only live products in live categories are ever visible to shoppers. */
export const VISIBLE = `p.status = 'ACTIVE' AND c.is_active`;

export const SUMMARY_COLUMNS = `
  p.id, p.slug, p.name, p.colorway, p.color, p.gender,
  p.price_paise, p.compare_at_price_paise, p.is_featured,
  c.slug AS category_slug, c.name AS category_name,
  COALESCE(stock.in_stock, false) AS in_stock,
  COALESCE(img.images, '[]'::jsonb) AS images`;

export const SUMMARY_JOINS = `
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT bool_or(v.is_active AND i.quantity > 0) AS in_stock
    FROM product_variants v
    JOIN inventory i ON i.variant_id = v.id
    WHERE v.product_id = p.id
  ) stock ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('url', t.url, 'alt', t.alt_text) ORDER BY t.sort_order) AS images
    FROM (
      SELECT url, alt_text, sort_order FROM product_images
      WHERE product_id = p.id ORDER BY sort_order LIMIT 2
    ) t
  ) img ON true`;

// Tags aren't in the stored tsvector (array_to_string isn't immutable), so they're added here.
const SEARCH_VECTOR = `(p.search_vector || to_tsvector('english', array_to_string(p.tags, ' ')))`;

const IN_STOCK_VARIANT = `
  SELECT 1 FROM product_variants v JOIN inventory i ON i.variant_id = v.id
  WHERE v.product_id = p.id AND v.is_active AND i.quantity > 0`;

/** Builds a WHERE clause; every value goes through a numbered parameter. */
function buildWhere(filters: ProductFilters) {
  const params: unknown[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  const conditions = [VISIBLE];
  let rank: string | null = null;

  if (filters.tsQuery) {
    const tsQuery = `to_tsquery('english', ${add(filters.tsQuery)})`;
    conditions.push(`${SEARCH_VECTOR} @@ ${tsQuery}`);
    rank = `ts_rank(${SEARCH_VECTOR}, ${tsQuery})`;
  }
  if (filters.category) conditions.push(`c.slug = ${add(filters.category)}`);
  if (filters.genders?.length)
    conditions.push(`p.gender = ANY(${add(filters.genders)}::product_gender[])`);
  if (filters.colors?.length) conditions.push(`p.color = ANY(${add(filters.colors)}::text[])`);
  if (filters.minPricePaise !== undefined)
    conditions.push(`p.price_paise >= ${add(filters.minPricePaise)}`);
  if (filters.maxPricePaise !== undefined)
    conditions.push(`p.price_paise <= ${add(filters.maxPricePaise)}`);
  if (filters.featured) conditions.push('p.is_featured');
  // A size filter means "available in this size", so it only matches in-stock sizes.
  if (filters.sizeLabels?.length) {
    conditions.push(
      `EXISTS (${IN_STOCK_VARIANT} AND v.size_label = ANY(${add(filters.sizeLabels)}::text[]))`,
    );
  }
  if (filters.inStock) conditions.push(`EXISTS (${IN_STOCK_VARIANT})`);

  return { where: conditions.join(' AND '), params, add, rank };
}

function orderBy(sort: ProductSort, rank: string | null) {
  const primary: Record<ProductSort, string> = {
    featured: 'p.is_featured DESC, p.created_at DESC',
    newest: 'p.created_at DESC',
    'price-low': 'p.price_paise ASC',
    'price-high': 'p.price_paise DESC',
    relevance: rank ? `${rank} DESC, p.is_featured DESC` : 'p.is_featured DESC, p.created_at DESC',
  };
  // Name + id tiebreakers keep pagination stable.
  return `${primary[sort]}, p.name ASC, p.id ASC`;
}

export const productsRepository = {
  async list(filters: ProductFilters) {
    const { where, params, add, rank } = buildWhere(filters);
    const countParams = [...params];

    const [rows, countRows] = await Promise.all([
      query<ProductSummaryRow>(
        `SELECT ${SUMMARY_COLUMNS}
         FROM products p ${SUMMARY_JOINS}
         WHERE ${where}
         ORDER BY ${orderBy(filters.sort, rank)}
         LIMIT ${add(filters.limit)} OFFSET ${add(filters.offset)}`,
        params,
      ),
      query<{ total: number }>(
        `SELECT count(*) AS total
         FROM products p JOIN categories c ON c.id = p.category_id
         WHERE ${where}`,
        countParams,
      ),
    ]);

    return { rows, total: countRows[0]?.total ?? 0 };
  },

  async findVisibleBySlug(slug: string) {
    const rows = await query<ProductDetailRow>(
      `SELECT ${SUMMARY_COLUMNS}, p.description, p.material, p.brand, p.tags
       FROM products p ${SUMMARY_JOINS}
       WHERE ${VISIBLE} AND p.slug = $1`,
      [slug],
    );
    return rows[0] ?? null;
  },

  findImages(productId: string) {
    return query<ProductImage>(
      `SELECT url, alt_text AS alt FROM product_images
       WHERE product_id = $1 ORDER BY sort_order, created_at`,
      [productId],
    );
  },

  findVariants(productId: string) {
    return query<VariantRow>(
      `SELECT v.id, v.size_label, v.sku,
              COALESCE(v.price_override_paise, p.price_paise) AS price_paise,
              v.is_active, i.quantity, i.low_stock_threshold
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       JOIN inventory i ON i.variant_id = v.id
       WHERE v.product_id = $1
       ORDER BY v.sort_order, v.size_label`,
      [productId],
    );
  },

  /** Other visible colourways of the same model (same product name). */
  findColorways(name: string, excludeId: string) {
    return query<{ slug: string; colorway: string; color: string; image: ProductImage | null }>(
      `SELECT p.slug, p.colorway, p.color,
              (SELECT jsonb_build_object('url', url, 'alt', alt_text) FROM product_images
               WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE ${VISIBLE} AND p.name = $1 AND p.id <> $2
       ORDER BY p.colorway`,
      [name, excludeId],
    );
  },

  /** Same category, different model. */
  findRelated(categorySlug: string, name: string, limit: number) {
    return query<ProductSummaryRow>(
      `SELECT ${SUMMARY_COLUMNS}
       FROM products p ${SUMMARY_JOINS}
       WHERE ${VISIBLE} AND c.slug = $1 AND p.name <> $2
       ORDER BY p.is_featured DESC, p.created_at DESC, p.id
       LIMIT $3`,
      [categorySlug, name, limit],
    );
  },

  async facets() {
    const base = `FROM products p JOIN categories c ON c.id = p.category_id WHERE ${VISIBLE}`;
    const [colors, sizes, genders, price] = await Promise.all([
      query<{ value: string; count: number }>(
        `SELECT p.color AS value, count(*) AS count ${base} GROUP BY p.color ORDER BY count DESC, value`,
      ),
      query<{ size_label: string }>(
        `SELECT v.size_label
         FROM product_variants v JOIN products p ON p.id = v.product_id
         JOIN categories c ON c.id = p.category_id
         WHERE ${VISIBLE} AND v.is_active
         GROUP BY v.size_label
         ORDER BY min(substring(v.size_label FROM '[0-9.]+')::numeric)`,
      ),
      query<{ value: Gender; count: number }>(
        `SELECT p.gender AS value, count(*) AS count ${base} GROUP BY p.gender ORDER BY p.gender`,
      ),
      query<{ min: number | null; max: number | null }>(
        `SELECT min(p.price_paise) AS min, max(p.price_paise) AS max ${base}`,
      ),
    ]);

    return {
      colors,
      sizes: sizes.map((s) => s.size_label),
      genders,
      priceRange: { minPaise: price[0]?.min ?? 0, maxPaise: price[0]?.max ?? 0 },
    };
  },
};
