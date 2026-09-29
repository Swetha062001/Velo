import type { ProductSort } from '../types/catalog.ts';

/**
 * Swatch colours for product colour families. These represent *product* colours
 * (data), not UI theme colours, so they live here rather than in theme.css.
 */
export const COLOR_SWATCHES: Record<string, string> = {
  white: '#f4f3ef',
  black: '#161616',
  grey: '#9a9a96',
  blue: '#2346a0',
  red: '#b3261e',
  green: '#3f5f32',
  beige: '#d8c7a8',
  pink: '#efb8c4',
  orange: '#e4692f',
  brown: '#8a5a3b',
};

export const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
];

/** Price bands in whole rupees (URL uses minPrice / maxPrice). */
export const PRICE_RANGES: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Under ₹3,000', max: 2999 },
  { label: '₹3,000 – ₹4,999', min: 3000, max: 4999 },
  { label: '₹5,000 – ₹7,999', min: 5000, max: 7999 },
  { label: '₹8,000 and above', min: 8000 },
];

export const GENDER_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
] as const;

export const PAGE_SIZE = 12;
