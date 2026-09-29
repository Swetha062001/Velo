import { describe, expect, it } from 'vitest';
import { discountPercent, formatPrice, formatRupees } from './money.ts';

describe('money', () => {
  it('formats paise as whole rupees with Indian grouping', () => {
    expect(formatPrice(549900)).toBe('₹5,499');
    expect(formatPrice(12345600)).toBe('₹1,23,456');
    expect(formatRupees(6000)).toBe('₹6,000');
  });

  it('computes a discount only when compare-at is higher', () => {
    expect(discountPercent(799900, 899900)).toBe(11);
    expect(discountPercent(799900, 799900)).toBeNull();
    expect(discountPercent(799900, 599900)).toBeNull();
    expect(discountPercent(799900, null)).toBeNull();
  });
});
