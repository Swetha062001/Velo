import { withTransaction } from '../../../db/index.js';
import { AppError } from '../../../utils/AppError.js';
import { mapConstraintError } from '../../../utils/dbErrors.js';
import { paginationMeta, toOffset } from '../../../utils/pagination.js';
import {
  adminProductsRepository as repo,
  type AdminProductRow,
  type AdminVariantRow,
} from './products.admin.repository.js';
import type {
  CreateProductInput,
  ImageInput,
  ListAdminProductsQuery,
  UpdateProductInput,
  UpdateVariantInput,
  VariantInput,
} from './products.admin.schemas.js';

const CONSTRAINT_MESSAGES: Record<string, string> = {
  products_slug_key: 'Another product already uses this slug',
  product_variants_sku_key: 'This SKU is already in use',
  product_variants_product_id_size_label_key: 'This product already has that size',
  products_category_id_fkey: 'Category not found',
  products_check: 'Compare-at price must be higher than the price',
  products_compare_at_price_paise_check: 'Compare-at price must be higher than the price',
};

/** "VELO Aero One" + "Ember Orange" → "velo-aero-one-ember-orange". */
export function slugify(...parts: string[]) {
  return parts
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

const toVariantDto = (v: AdminVariantRow) => ({
  id: v.id,
  sizeLabel: v.size_label,
  sku: v.sku,
  priceOverridePaise: v.price_override_paise,
  isActive: v.is_active,
  sortOrder: v.sort_order,
  quantity: v.quantity,
  lowStockThreshold: v.low_stock_threshold,
});

const toProductDto = (p: AdminProductRow) => ({
  id: p.id,
  categoryId: p.category_id,
  categoryName: p.category_name,
  name: p.name,
  slug: p.slug,
  description: p.description,
  material: p.material,
  gender: p.gender,
  color: p.color,
  colorway: p.colorway,
  tags: p.tags,
  pricePaise: p.price_paise,
  compareAtPricePaise: p.compare_at_price_paise,
  status: p.status,
  isFeatured: p.is_featured,
  createdAt: p.created_at.toISOString(),
  updatedAt: p.updated_at.toISOString(),
});

async function loadDetail(id: string) {
  const product = await repo.findById(id);
  if (!product) throw AppError.notFound('Product not found');
  const [images, variants, hasOrders] = await Promise.all([
    repo.findImages(id),
    repo.findVariants(id),
    repo.hasOrders(id),
  ]);
  return {
    ...toProductDto(product),
    images: images.map((i) => ({ id: i.id, url: i.url, altText: i.alt_text })),
    variants: variants.map(toVariantDto),
    /** Products that have been ordered can be archived but not deleted. */
    canDelete: !hasOrders,
  };
}

async function requireProduct(id: string) {
  if (!(await repo.findById(id))) throw AppError.notFound('Product not found');
}

export const adminProductsService = {
  async list(q: ListAdminProductsQuery) {
    const rows = await repo.list(q, q.limit, toOffset(q));
    return {
      items: rows.map((r) => ({
        ...toProductDto(r),
        imageUrl: r.image_url,
        variantCount: r.variant_count,
        totalStock: r.total_stock,
        lowStockCount: r.low_stock_count,
      })),
      meta: paginationMeta(q, rows[0]?.total_count ?? 0),
    };
  },

  get: loadDetail,

  /** Creates the product with its images and sizes in one transaction. */
  async create(input: CreateProductInput) {
    const slug = input.slug ?? slugify(input.name, input.colorway);
    try {
      const id = await withTransaction(async (client) => {
        const productId = await repo.insert(
          {
            ...input,
            slug,
            material: input.material ?? null,
            compareAtPricePaise: input.compareAtPricePaise ?? null,
          },
          client,
        );
        await repo.replaceImages(productId, input.images, client);
        for (const [index, variant] of input.variants.entries()) {
          await repo.insertVariant(productId, variant, index, client);
        }
        return productId;
      });
      return loadDetail(id);
    } catch (err) {
      mapConstraintError(err, CONSTRAINT_MESSAGES);
    }
  },

  async update(id: string, input: UpdateProductInput) {
    try {
      if (!(await repo.update(id, input))) throw AppError.notFound('Product not found');
    } catch (err) {
      if (err instanceof AppError) throw err;
      mapConstraintError(err, CONSTRAINT_MESSAGES);
    }
    return loadDetail(id);
  },

  /** Hard delete only for never-ordered products; everything else should be archived. */
  async remove(id: string) {
    await requireProduct(id);
    if (await repo.hasOrders(id)) {
      throw new AppError(
        409,
        'PRODUCT_HAS_ORDERS',
        'This product has been ordered and can’t be deleted. Archive it instead.',
      );
    }
    await repo.delete(id);
  },

  async replaceImages(id: string, images: ImageInput[]) {
    await requireProduct(id);
    await withTransaction((client) => repo.replaceImages(id, images, client));
    return loadDetail(id);
  },

  async addVariant(productId: string, input: VariantInput) {
    await requireProduct(productId);
    try {
      await withTransaction(async (client) => {
        const sortOrder = await repo.nextVariantSortOrder(productId, client);
        await repo.insertVariant(productId, input, sortOrder, client);
      });
    } catch (err) {
      mapConstraintError(err, CONSTRAINT_MESSAGES);
    }
    return loadDetail(productId);
  },

  async updateVariant(variantId: string, input: UpdateVariantInput) {
    const productId = await repo.findVariantProductId(variantId);
    if (!productId) throw AppError.notFound('Size not found');
    try {
      await repo.updateVariant(variantId, input);
    } catch (err) {
      mapConstraintError(err, CONSTRAINT_MESSAGES);
    }
    return loadDetail(productId);
  },

  /** Deleting a size removes it from carts; ordered sizes must be deactivated instead. */
  async removeVariant(variantId: string) {
    const productId = await repo.findVariantProductId(variantId);
    if (!productId) throw AppError.notFound('Size not found');
    if (await repo.variantHasOrders(variantId)) {
      throw new AppError(
        409,
        'VARIANT_HAS_ORDERS',
        'This size has been ordered and can’t be deleted. Deactivate it instead.',
      );
    }
    await repo.deleteVariant(variantId);
    return loadDetail(productId);
  },
};
