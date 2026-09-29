import { AppError } from '../../utils/AppError.js';
import { categoriesRepository, type CategoryRow } from './categories.repository.js';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

const toDto = (row: CategoryRow): CategoryDto => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  imageUrl: row.image_url,
  productCount: row.product_count,
});

export const categoriesService = {
  async list() {
    return (await categoriesRepository.listActive()).map(toDto);
  },

  async getBySlug(slug: string) {
    const row = await categoriesRepository.findActiveBySlug(slug);
    if (!row) throw AppError.notFound('Category not found');
    return toDto(row);
  },
};
