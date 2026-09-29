import { Suspense } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { ErrorState } from '../components/common/ErrorState.tsx';
import { FullPageSpinner } from '../components/common/Spinner.tsx';
import { useCurrentUser } from '../hooks/useAuth.ts';
import ForbiddenPage from '../pages/errors/ForbiddenPage.tsx';
import { homeFor, loginUrl, safeRedirect } from '../utils/redirect.ts';

/*
 * Route guards are a UX layer only: they decide what to render. Every protected API
 * endpoint enforces authentication and roles on the server.
 */

function useSession() {
  const query = useCurrentUser();
  const status = query.isPending ? 'loading' : query.isError ? 'error' : 'ready';
  return { status, user: query.data ?? null, retry: () => query.refetch() } as const;
}

/** Signed-in users only; others are sent to sign-in and returned here afterwards. */
export function RequireAuth() {
  const { status, user, retry } = useSession();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'error') return <ErrorState onRetry={retry} />;
  if (!user) return <Navigate to={loginUrl(location.pathname + location.search)} replace />;
  return <Outlet />;
}

/** Admins only. Signed-out users go to sign-in; signed-in non-admins see a 403 page. */
export function RequireAdmin() {
  const { status, user, retry } = useSession();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'error') return <ErrorState onRetry={retry} />;
  if (!user) return <Navigate to={loginUrl(location.pathname + location.search)} replace />;
  if (user.role !== 'ADMIN') return <ForbiddenPage />;
  return (
    // The admin layout is lazy-loaded; show a spinner while its chunk downloads.
    <Suspense fallback={<FullPageSpinner />}>
      <Outlet />
    </Suspense>
  );
}

/** Sign-in / register: already signed-in users are sent on to where they were going. */
export function GuestOnly() {
  const { status, user } = useSession();
  const [params] = useSearchParams();

  if (status === 'loading') return <FullPageSpinner />;
  if (user)
    return <Navigate to={safeRedirect(params.get('redirect'), homeFor(user.role))} replace />;
  return <Outlet />;
}
