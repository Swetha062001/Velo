import { Outlet, ScrollRestoration } from 'react-router';

/** Top-level route: shared by storefront and admin. */
export default function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
