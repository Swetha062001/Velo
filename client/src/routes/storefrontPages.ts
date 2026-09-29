import { lazy } from 'react';

/*
 * Storefront pages are code-split so the first visit downloads only the shell and the home
 * page. Form libraries (react-hook-form, zod) live in the auth/checkout/account chunks.
 * React.lazy (not router `lazy`) keeps guarded pages from downloading for redirected visitors,
 * matching adminPages.ts.
 */
const products = () => import('../pages/products/ProductsPage.tsx');
const product = () => import('../pages/product/ProductPage.tsx');
const cart = () => import('../pages/cart/CartPage.tsx');

export const ProductsPage = lazy(products);
export const ProductPage = lazy(product);
export const CartPage = lazy(cart);
export const WishlistPage = lazy(() => import('../pages/wishlist/WishlistPage.tsx'));
export const LoginPage = lazy(() => import('../pages/auth/LoginPage.tsx'));
export const RegisterPage = lazy(() => import('../pages/auth/RegisterPage.tsx'));
export const CheckoutPage = lazy(() => import('../pages/checkout/CheckoutPage.tsx'));
export const OrderConfirmationPage = lazy(
  () => import('../pages/checkout/OrderConfirmationPage.tsx'),
);
export const AccountLayout = lazy(() => import('../layouts/AccountLayout.tsx'));
export const AccountOverviewPage = lazy(() => import('../pages/account/AccountOverviewPage.tsx'));
export const OrdersPage = lazy(() => import('../pages/account/OrdersPage.tsx'));
export const OrderDetailPage = lazy(() => import('../pages/account/OrderDetailPage.tsx'));
export const AddressesPage = lazy(() => import('../pages/account/AddressesPage.tsx'));

/** Warm the most-visited pages once the browser is idle, so first navigation is instant. */
export function prefetchCommonPages() {
  const run = () => void Promise.all([products(), product(), cart()]).catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 2000);
}
