/** Every client URL in one place — never hardcode paths in components. */
export const paths = {
  home: '/',
  products: '/products',
  product: (slug: string) => `/products/${slug}`,
  cart: '/cart',
  wishlist: '/wishlist',
  checkout: '/checkout',
  checkoutSuccess: (orderNumber: string) => `/checkout/success/${orderNumber}`,
  login: '/login',
  register: '/register',

  account: '/account',
  accountOrders: '/account/orders',
  accountOrder: (orderNumber: string) => `/account/orders/${orderNumber}`,
  accountAddresses: '/account/addresses',

  admin: '/admin',
  adminProducts: '/admin/products',
  adminProductNew: '/admin/products/new',
  adminProduct: (id: string) => `/admin/products/${id}`,
  adminCategories: '/admin/categories',
  adminInventory: '/admin/inventory',
  adminOrders: '/admin/orders',
  adminOrder: (orderNumber: string) => `/admin/orders/${orderNumber}`,
  adminUsers: '/admin/users',
} as const;

/** Builds a product-listing URL with filters, e.g. productsUrl({ category: 'running' }). */
export function productsUrl(filters: Record<string, string> = {}) {
  const query = new URLSearchParams(filters).toString();
  return query ? `${paths.products}?${query}` : paths.products;
}
