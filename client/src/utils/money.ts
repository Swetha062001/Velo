const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** 549900 → "₹5,499". All prices arrive from the API in paise. */
export function formatPrice(paise: number) {
  return inr.format(paise / 100);
}

/** Whole-rupee amount → "₹5,000" (used for filter labels). */
export function formatRupees(rupees: number) {
  return inr.format(rupees);
}

export function discountPercent(pricePaise: number, compareAtPaise: number | null) {
  if (!compareAtPaise || compareAtPaise <= pricePaise) return null;
  return Math.round((1 - pricePaise / compareAtPaise) * 100);
}
