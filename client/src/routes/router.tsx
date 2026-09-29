import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import { FullPageSpinner } from '../components/common/Spinner.tsx';
import AccountLayout from '../layouts/AccountLayout.tsx';
import RootLayout from '../layouts/RootLayout.tsx';
import StorefrontLayout from '../layouts/StorefrontLayout.tsx';
import AccountOverviewPage from '../pages/account/AccountOverviewPage.tsx';
import AddressesPage from '../pages/account/AddressesPage.tsx';
import OrderDetailPage from '../pages/account/OrderDetailPage.tsx';
import OrdersPage from '../pages/account/OrdersPage.tsx';
import LoginPage from '../pages/auth/LoginPage.tsx';
import RegisterPage from '../pages/auth/RegisterPage.tsx';
import CartPage from '../pages/cart/CartPage.tsx';
import CheckoutPage from '../pages/checkout/CheckoutPage.tsx';
import NotFoundPage from '../pages/errors/NotFoundPage.tsx';
import RouteErrorPage from '../pages/errors/RouteErrorPage.tsx';
import HomePage from '../pages/home/HomePage.tsx';
import ProductPage from '../pages/product/ProductPage.tsx';
import ProductsPage from '../pages/products/ProductsPage.tsx';
import WishlistPage from '../pages/wishlist/WishlistPage.tsx';

/** Code-split a route: the module's default export becomes the route component. */
const lazyRoute = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    errorElement: <RouteErrorPage standalone />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      // Storefront
      {
        Component: StorefrontLayout,
        children: [
          {
            // Pathless boundary: errors render inside the layout, keeping header + footer.
            errorElement: <RouteErrorPage />,
            children: [
              { index: true, Component: HomePage },
              { path: 'products', Component: ProductsPage },
              { path: 'products/:slug', Component: ProductPage },
              { path: 'cart', Component: CartPage },
              { path: 'wishlist', Component: WishlistPage },
              { path: 'checkout', Component: CheckoutPage },
              { path: 'login', Component: LoginPage },
              { path: 'register', Component: RegisterPage },
              {
                path: 'account',
                Component: AccountLayout,
                children: [
                  { index: true, Component: AccountOverviewPage },
                  { path: 'orders', Component: OrdersPage },
                  { path: 'orders/:orderNumber', Component: OrderDetailPage },
                  { path: 'addresses', Component: AddressesPage },
                ],
              },
              { path: '*', Component: NotFoundPage },
            ],
          },
        ],
      },

      // Admin — lazy-loaded chunk
      {
        path: 'admin',
        lazy: lazyRoute(() => import('../layouts/AdminLayout.tsx')),
        children: [
          {
            errorElement: <RouteErrorPage />,
            children: [
              {
                index: true,
                lazy: lazyRoute(() => import('../pages/admin/AdminDashboardPage.tsx')),
              },
              {
                path: 'products',
                lazy: lazyRoute(() => import('../pages/admin/AdminProductsPage.tsx')),
              },
              {
                path: 'categories',
                lazy: lazyRoute(() => import('../pages/admin/AdminCategoriesPage.tsx')),
              },
              {
                path: 'inventory',
                lazy: lazyRoute(() => import('../pages/admin/AdminInventoryPage.tsx')),
              },
              {
                path: 'orders',
                lazy: lazyRoute(() => import('../pages/admin/AdminOrdersPage.tsx')),
              },
              { path: 'users', lazy: lazyRoute(() => import('../pages/admin/AdminUsersPage.tsx')) },
              { path: '*', Component: NotFoundPage },
            ],
          },
        ],
      },
    ],
  },
]);
