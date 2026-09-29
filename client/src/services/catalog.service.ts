import { api } from '../lib/apiClient.ts';
import type {
  Category,
  ProductDetail,
  ProductFacets,
  ProductFilters,
  ProductListMeta,
  ProductSummary,
} from '../types/catalog.ts';

export const catalogService = {
  async listProducts(filters: ProductFilters, signal?: AbortSignal) {
    const { data, meta } = await api.getWithMeta<ProductSummary[], ProductListMeta>('/products', {
      query: { ...filters },
      signal,
    });
    return { items: data, meta };
  },

  getProduct: (slug: string, signal?: AbortSignal) =>
    api.get<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { signal }),

  getFacets: (signal?: AbortSignal) => api.get<ProductFacets>('/products/facets', { signal }),

  listCategories: (signal?: AbortSignal) => api.get<Category[]>('/categories', { signal }),
};
