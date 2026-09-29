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
import OrderConfirmationPage from '../pages/checkout/OrderConfirmationPage.tsx';
import NotFoundPage from '../pages/errors/NotFoundPage.tsx';
import RouteErrorPage from '../pages/errors/RouteErrorPage.tsx';
import HomePage from '../pages/home/HomePage.tsx';
import ProductPage from '../pages/product/ProductPage.tsx';
import ProductsPage from '../pages/products/ProductsPage.tsx';
import WishlistPage from '../pages/wishlist/WishlistPage.tsx';
import {
  AdminCategoriesPage,
  AdminDashboardPage,
  AdminInventoryPage,
  AdminLayout,
  AdminOrderDetailPage,
  AdminOrdersPage,
  AdminProductEditorPage,
  AdminProductsPage,
  AdminUsersPage,
} from './adminPages.ts';
import { GuestOnly, RequireAdmin, RequireAuth } from './guards.tsx';

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

              // Signed-out only
              {
                Component: GuestOnly,
                children: [
                  { path: 'login', Component: LoginPage },
                  { path: 'register', Component: RegisterPage },
                ],
              },

              // Signed-in only
              {
                Component: RequireAuth,
                children: [
                  { path: 'wishlist', Component: WishlistPage },
                  { path: 'checkout', Component: CheckoutPage },
                  { path: 'checkout/success/:orderNumber', Component: OrderConfirmationPage },
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
                ],
              },

              { path: '*', Component: NotFoundPage },
            ],
          },
        ],
      },

      // Admin — the guard renders first; admin chunks load only for admins
      {
        path: 'admin',
        Component: RequireAdmin,
        children: [
          {
            Component: AdminLayout,
            children: [
              {
                errorElement: <RouteErrorPage />,
                children: [
                  { index: true, Component: AdminDashboardPage },
                  { path: 'products', Component: AdminProductsPage },
                  { path: 'products/new', Component: AdminProductEditorPage },
                  { path: 'products/:id', Component: AdminProductEditorPage },
                  { path: 'categories', Component: AdminCategoriesPage },
                  { path: 'inventory', Component: AdminInventoryPage },
                  { path: 'orders', Component: AdminOrdersPage },
                  { path: 'orders/:orderNumber', Component: AdminOrderDetailPage },
                  { path: 'users', Component: AdminUsersPage },
                  { path: '*', Component: NotFoundPage },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
