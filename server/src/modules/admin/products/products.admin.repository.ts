import { query, type Queryable } from '../../../db/index.js';
import type {
  ImageInput,
  ListAdminProductsQuery,
  UpdateProductInput,
  UpdateVariantInput,
  VariantInput,
} from './products.admin.schemas.js';

export interface AdminProductRow {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  slug: string;
  description: string;
  material: string | null;
  gender: 'MEN' | 'WOMEN' | 'UNISEX';
  color: string;
  colorway: string;
  tags: string[];
  price_paise: number;
  compare_at_price_paise: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AdminProductListRow extends AdminProductRow {
  image_url: string | null;
  variant_count: number;
  total_stock: number;
  low_stock_count: number;
  total_count: number;
}

export interface AdminVariantRow {
  id: string;
  size_label: string;
  sku: string;
  price_override_paise: number | null;
  is_active: boolean;
  sort_order: number;
  quantity: number;
  low_stock_threshold: number;
}

const PRODUCT_COLUMNS = `p.id, p.category_id, c.name AS category_name, p.name, p.slug, p.description,
  p.material, p.gender, p.color, p.colorway, p.tags, p.price_paise, p.compare_at_price_paise,
  p.status, p.is_featured, p.created_at, p.updated_at`;

/** camelCase input → column (allow-list for dynamic UPDATEs). */
const PRODUCT_COLUMN: Record<keyof UpdateProductInput, string> = {
  categoryId: 'category_id',
  name: 'name',
  slug: 'slug',
  colorway: 'colorway',
  color: 'color',
  gender: 'gender',
  description: 'description',
  material: 'material',
  tags: 'tags',
  pricePaise: 'price_paise',
  compareAtPricePaise: 'compare_at_price_paise',
  status: 'status',
  isFeatured: 'is_featured',
};

const VARIANT_COLUMN: Record<keyof UpdateVariantInput, string> = {
  sizeLabel: 'size_label',
  sku: 'sku',
  priceOverridePaise: 'price_override_paise',
  isActive: 'is_active',
  sortOrder: 'sort_order',
};

/** Builds `col = $n` pairs for the provided (defined) keys only. */
function setClause<T extends object>(
  input: T,
  columns: Record<keyof T, string>,
  params: unknown[],
) {
  const sets: string[] = [];
  for (const [key, column] of Object.entries(columns) as Array<[keyof T, string]>) {
    const value = input[key];
    if (value !== undefined) {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    }
  }
  return sets;
}

export const adminProductsRepository = {
  list(q: ListAdminProductsQuery, limit: number, offset: number) {
    const params: unknown[] = [];
    const where: string[] = [];
    if (q.q) {
      params.push(`%${q.q}%`);
      where.push(
        `(p.name ILIKE $${params.length} OR p.colorway ILIKE $${params.length} OR p.slug ILIKE $${params.length})`,
      );
    }
    if (q.status) {
      params.push(q.status);
      where.push(`p.status = $${params.length}`);
    }
    if (q.categoryId) {
      params.push(q.categoryId);
      where.push(`p.category_id = $${params.length}`);
    }
    params.push(limit, offset);

    return query<AdminProductListRow>(
      `SELECT ${PRODUCT_COLUMNS},
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url,
              s.variant_count, s.total_stock, s.low_stock_count,
              count(*) OVER () AS total_count
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN LATERAL (
         SELECT count(*) AS variant_count,
                COALESCE(sum(i.quantity), 0) AS total_stock,
                count(*) FILTER (WHERE v.is_active AND i.quantity <= i.low_stock_threshold) AS low_stock_count
         FROM product_variants v JOIN inventory i ON i.variant_id = v.id
         WHERE v.product_id = p.id
       ) s ON true
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.updated_at DESC, p.id
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
  },

  async findById(id: string, db?: Queryable) {
    const rows = await query<AdminProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
      [id],
      db,
    );
    return rows[0] ?? null;
  },

  findImages(productId: string, db?: Queryable) {
    return query<{ id: string; url: string; alt_text: string; sort_order: number }>(
      `SELECT id, url, alt_text, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order, created_at`,
      [productId],
      db,
    );
  },

  findVariants(productId: string, db?: Queryable) {
    return query<AdminVariantRow>(
      `SELECT v.id, v.size_label, v.sku, v.price_override_paise, v.is_active, v.sort_order,
              i.quantity, i.low_stock_threshold
       FROM product_variants v JOIN inventory i ON i.variant_id = v.id
       WHERE v.product_id = $1 ORDER BY v.sort_order, v.size_label`,
      [productId],
      db,
    );
  },

  async insert(
    p: Required<Omit<UpdateProductInput, 'material' | 'compareAtPricePaise'>> & {
      material: string | null;
      compareAtPricePaise: number | null;
    },
    db: Queryable,
  ) {
    const rows = await query<{ id: string }>(
      `INSERT INTO products
         (category_id, name, slug, colorway, color, gender, description, material, tags,
          price_paise, compare_at_price_paise, status, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        p.categoryId,
        p.name,
        p.slug,
        p.colorway,
        p.color,
        p.gender,
        p.description,
        p.material,
        p.tags,
        p.pricePaise,
        p.compareAtPricePaise,
        p.status,
        p.isFeatured,
      ],
      db,
    );
    return rows[0]!.id;
  },

  async update(id: string, input: UpdateProductInput, db?: Queryable) {
    const params: unknown[] = [id];
    const sets = setClause(input, PRODUCT_COLUMN, params);
    if (sets.length === 0) return true;
    const result = await query<{ id: string }>(
      `UPDATE products SET ${sets.join(', ')} WHERE id = $1 RETURNING id`,
      params,
      db,
    );
    return result.length > 0;
  },

  async delete(id: string, db?: Queryable) {
    const rows = await query<{ id: string }>(
      `DELETE FROM products WHERE id = $1 RETURNING id`,
      [id],
      db,
    );
    return rows.length > 0;
  },

  async hasOrders(productId: string, db?: Queryable) {
    const rows = await query(
      `SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1`,
      [productId],
      db,
    );
    return rows.length > 0;
  },

  async replaceImages(productId: string, images: ImageInput[], db: Queryable) {
    await query(`DELETE FROM product_images WHERE product_id = $1`, [productId], db);
    for (const [index, img] of images.entries()) {
      await query(
        `INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES ($1, $2, $3, $4)`,
        [productId, img.url, img.altText, index],
        db,
      );
    }
  },

  async insertVariant(productId: string, v: VariantInput, sortOrder: number, db: Queryable) {
    const rows = await query<{ id: string }>(
      `INSERT INTO product_variants (product_id, size_label, sku, price_override_paise, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        productId,
        v.sizeLabel,
        v.sku,
        v.priceOverridePaise ?? null,
        v.isActive,
        v.sortOrder ?? sortOrder,
      ],
      db,
    );
    const variantId = rows[0]!.id;
    await query(
      `INSERT INTO inventory (variant_id, quantity, low_stock_threshold) VALUES ($1, $2, $3)`,
      [variantId, v.quantity, v.lowStockThreshold],
      db,
    );
    return variantId;
  },

  async nextVariantSortOrder(productId: string, db?: Queryable) {
    const rows = await query<{ next: number }>(
      `SELECT COALESCE(max(sort_order) + 1, 0) AS next FROM product_variants WHERE product_id = $1`,
      [productId],
      db,
    );
    return rows[0]!.next;
  },

  async findVariantProductId(variantId: string, db?: Queryable) {
    const rows = await query<{ product_id: string }>(
      `SELECT product_id FROM product_variants WHERE id = $1`,
      [variantId],
      db,
    );
    return rows[0]?.product_id ?? null;
  },

  async updateVariant(variantId: string, input: UpdateVariantInput, db?: Queryable) {
    const params: unknown[] = [variantId];
    const sets = setClause(input, VARIANT_COLUMN, params);
    if (sets.length === 0) return;
    await query(`UPDATE product_variants SET ${sets.join(', ')} WHERE id = $1`, params, db);
  },

  async variantHasOrders(variantId: string, db?: Queryable) {
    const rows = await query(
      `SELECT 1 FROM order_items WHERE variant_id = $1 LIMIT 1`,
      [variantId],
      db,
    );
    return rows.length > 0;
  },

  async deleteVariant(variantId: string, db?: Queryable) {
    await query(`DELETE FROM product_variants WHERE id = $1`, [variantId], db);
  },
};
