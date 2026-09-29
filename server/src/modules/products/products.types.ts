export type Gender = 'MEN' | 'WOMEN' | 'UNISEX';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductImage {
  url: string;
  alt: string;
}

export interface CategoryRef {
  slug: string;
  name: string;
}

/** Compact product used in listings, grids and "related" rails. */
export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  colorway: string;
  color: string;
  gender: Gender;
  category: CategoryRef;
  pricePaise: number;
  compareAtPricePaise: number | null;
  isFeatured: boolean;
  inStock: boolean;
  /** Up to two images: the primary, and one for the hover state. */
  images: ProductImage[];
}

export interface ProductVariant {
  id: string;
  sizeLabel: string;
  sku: string;
  /** Effective price for this size (override or product price). */
  pricePaise: number;
  stockStatus: StockStatus;
}

export interface ProductDetail extends Omit<ProductSummary, 'images'> {
  description: string;
  material: string | null;
  brand: string;
  tags: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  /** Other colourways of the same model. */
  colorways: Array<
    Pick<ProductSummary, 'slug' | 'colorway' | 'color'> & { image: ProductImage | null }
  >;
  related: ProductSummary[];
}

export interface ProductFacets {
  colors: Array<{ value: string; count: number }>;
  sizes: string[];
  genders: Array<{ value: Gender; count: number }>;
  priceRange: { minPaise: number; maxPaise: number };
}
