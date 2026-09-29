import { AppError } from '../../utils/AppError.js';
import { paginationMeta, toOffset } from '../../utils/pagination.js';
import {
  productsRepository,
  type ProductFilters,
  type ProductSummaryRow,
  type VariantRow,
} from './products.repository.js';
import type { ListProductsQuery } from './products.schemas.js';
import type {
  Gender,
  ProductDetail,
  ProductFacets,
  ProductSummary,
  ProductVariant,
  StockStatus,
} from './products.types.js';

const RELATED_LIMIT = 4;
const MAX_SEARCH_TERMS = 8;

/**
 * Free text → safe prefix tsquery. "aero one" → "aero:* & one:*".
 * Only [a-z0-9] survive, so users can't inject tsquery operators.
 */
export function toPrefixTsQuery(q: string | undefined) {
  if (!q) return undefined;
  const terms = q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TERMS);
  return terms.length ? terms.map((t) => `${t}:*`).join(' & ') : undefined;
}

/** "Men" includes unisex styles, likewise "Women". */
const GENDER_FILTER: Record<NonNullable<ListProductsQuery['gender']>, Gender[]> = {
  men: ['MEN', 'UNISEX'],
  women: ['WOMEN', 'UNISEX'],
  unisex: ['UNISEX'],
};

export function stockStatus(
  v: Pick<VariantRow, 'is_active' | 'quantity' | 'low_stock_threshold'>,
): StockStatus {
  if (!v.is_active || v.quantity <= 0) return 'out_of_stock';
  if (v.quantity <= v.low_stock_threshold) return 'low_stock';
  return 'in_stock';
}

export function toSummary(row: ProductSummaryRow): ProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    colorway: row.colorway,
    color: row.color,
    gender: row.gender,
    category: { slug: row.category_slug, name: row.category_name },
    pricePaise: row.price_paise,
    compareAtPricePaise: row.compare_at_price_paise,
    isFeatured: row.is_featured,
    inStock: row.in_stock,
    images: row.images,
  };
}

function toVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    sizeLabel: row.size_label,
    sku: row.sku,
    pricePaise: row.price_paise,
    stockStatus: stockStatus(row),
  };
}

export const productsService = {
  async list(query: ListProductsQuery) {
    const tsQuery = toPrefixTsQuery(query.q);
    const sort = query.sort ?? (tsQuery ? 'relevance' : 'featured');

    const filters: ProductFilters = {
      tsQuery,
      category: query.category,
      genders: query.gender ? GENDER_FILTER[query.gender] : undefined,
      colors: query.color,
      sizeLabels: query.size?.map((s) => `UK ${s}`),
      minPricePaise: query.minPrice !== undefined ? query.minPrice * 100 : undefined,
      maxPricePaise: query.maxPrice !== undefined ? query.maxPrice * 100 : undefined,
      featured: query.featured,
      inStock: query.inStock,
      sort,
      limit: query.limit,
      offset: toOffset(query),
    };

    const { rows, total } = await productsRepository.list(filters);
    return { items: rows.map(toSummary), meta: { ...paginationMeta(query, total), sort } };
  },

  async getBySlug(slug: string): Promise<ProductDetail> {
    const product = await productsRepository.findVisibleBySlug(slug);
    if (!product) throw AppError.notFound('Product not found');

    const [images, variants, colorways, related] = await Promise.all([
      productsRepository.findImages(product.id),
      productsRepository.findVariants(product.id),
      productsRepository.findColorways(product.name, product.id),
      productsRepository.findRelated(product.category_slug, product.name, RELATED_LIMIT),
    ]);

    const variantDtos = variants.map(toVariant);

    return {
      ...toSummary(product),
      inStock: variantDtos.some((v) => v.stockStatus !== 'out_of_stock'),
      description: product.description,
      material: product.material,
      brand: product.brand,
      tags: product.tags,
      images,
      variants: variantDtos,
      colorways,
      related: related.map(toSummary),
    };
  },

  facets(): Promise<ProductFacets> {
    return productsRepository.facets();
  },
};
