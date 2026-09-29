import { lazy } from 'react';

/*
 * Admin screens use React.lazy (not the router's `lazy`): React.lazy fetches a chunk only
 * when the component renders, so the RequireAdmin guard keeps non-admins from ever
 * downloading admin code. (Router `lazy` loads every matched route before rendering.)
 */
export const AdminLayout = lazy(() => import('../layouts/AdminLayout.tsx'));
export const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage.tsx'));
export const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage.tsx'));
export const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage.tsx'));
export const AdminInventoryPage = lazy(() => import('../pages/admin/AdminInventoryPage.tsx'));
export const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage.tsx'));
export const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage.tsx'));
