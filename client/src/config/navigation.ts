import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Package,
  Receipt,
  Tags,
  CircleUser,
  Users,
} from 'lucide-react';
import { paths, productsUrl } from '../routes/paths.ts';

export interface NavItem {
  label: string;
  to: string;
  icon?: LucideIcon;
}

/**
 * Storefront category shortcuts. Slugs match the categories seeded in Phase 4;
 * in Phase 6 the full category list is loaded from the API.
 */
export const storefrontNav: NavItem[] = [
  { label: 'New arrivals', to: productsUrl({ sort: 'newest' }) },
  { label: 'Men', to: productsUrl({ gender: 'men' }) },
  { label: 'Women', to: productsUrl({ gender: 'women' }) },
  { label: 'Running', to: productsUrl({ category: 'running' }) },
  { label: 'Lifestyle', to: productsUrl({ category: 'lifestyle' }) },
];

export const accountNav: NavItem[] = [
  { label: 'Overview', to: paths.account, icon: CircleUser },
  { label: 'Orders', to: paths.accountOrders, icon: Receipt },
  { label: 'Addresses', to: paths.accountAddresses, icon: MapPin },
];

export const adminNav: NavItem[] = [
  { label: 'Dashboard', to: paths.admin, icon: LayoutDashboard },
  { label: 'Products', to: paths.adminProducts, icon: Package },
  { label: 'Categories', to: paths.adminCategories, icon: Tags },
  { label: 'Inventory', to: paths.adminInventory, icon: Boxes },
  { label: 'Orders', to: paths.adminOrders, icon: ClipboardList },
  { label: 'Users', to: paths.adminUsers, icon: Users },
];
