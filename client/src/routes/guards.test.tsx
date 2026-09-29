import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { authKeys } from '../hooks/useAuth.ts';
import type { User } from '../types/user.ts';
import { RequireAdmin, RequireAuth } from './guards.tsx';

function renderAt(path: string, user: User | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(authKeys.me, user);
  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>Login page</p> },
      {
        element: <RequireAuth />,
        children: [{ path: '/account', element: <p>Account page</p> }],
      },
      {
        element: <RequireAdmin />,
        children: [{ path: '/admin', element: <p>Admin page</p> }],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const customer = { id: 'u', name: 'C', email: 'c@x.test', role: 'USER' } as User;
const admin = { ...customer, role: 'ADMIN' } as User;

describe('route guards (UX only — the API enforces access)', () => {
  it('sends signed-out visitors to sign-in with a return path', async () => {
    const router = renderAt('/account', null);
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?redirect=%2Faccount');
  });

  it('shows a 403 page to customers on admin routes', async () => {
    renderAt('/admin', customer);
    expect(
      await screen.findByRole('heading', { name: 'This area is for admins only.' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
  });

  it('lets admins and signed-in users through', async () => {
    renderAt('/admin', admin);
    expect(await screen.findByText('Admin page')).toBeInTheDocument();
  });
});
