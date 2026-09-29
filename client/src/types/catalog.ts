export type Gender = 'MEN' | 'WOMEN' | 'UNISEX';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type ProductSort = 'featured' | 'newest' | 'price-low' | 'price-high' | 'relevance';

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  colorway: string;
  color: string;
  gender: Gender;
  category: { slug: string; name: string };
  pricePaise: number;
  compareAtPricePaise: number | null;
  isFeatured: boolean;
  inStock: boolean;
  images: ProductImage[];
}

export interface ProductVariant {
  id: string;
  sizeLabel: string;
  sku: string;
  pricePaise: number;
  stockStatus: StockStatus;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  material: string | null;
  brand: string;
  tags: string[];
  variants: ProductVariant[];
  colorways: Array<{ slug: string; colorway: string; color: string; image: ProductImage | null }>;
  related: ProductSummary[];
}

export interface ProductListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sort: ProductSort;
}

export interface ProductFacets {
  colors: Array<{ value: string; count: number }>;
  sizes: string[];
  genders: Array<{ value: Gender; count: number }>;
  priceRange: { minPaise: number; maxPaise: number };
}

/** Product-list filters exactly as they appear in the URL / API query. */
export interface ProductFilters {
  q?: string;
  category?: string;
  gender?: 'men' | 'women' | 'unisex';
  color?: string;
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: ProductSort;
  page?: string;
  featured?: 'true';
  limit?: string;
}
