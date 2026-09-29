import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { SignOutButton } from '../components/auth/SignOutButton.tsx';
import { SkipLink } from '../components/layout/SkipLink.tsx';
import { FullPageSpinner } from '../components/common/Spinner.tsx';
import { adminNav } from '../config/navigation.ts';
import { useCurrentUser } from '../hooks/useAuth.ts';
import { paths } from '../routes/paths.ts';
import { cn } from '../utils/cn.ts';

/**
 * Admin shell — lazy-loaded behind RequireAdmin, so non-admins never download admin code.
 * Rendered only for admins (RequireAdmin); the server enforces the same rule on /admin APIs.
 */
export default function AdminLayout() {
  const { data: user } = useCurrentUser();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <SkipLink />

      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center justify-between px-5">
          <Link
            to={paths.admin}
            className="font-display text-xl font-black tracking-tighter [font-stretch:115%]"
          >
            VELO<span className="text-accent">.</span>
            <span className="ml-2 align-middle font-sans text-[0.65rem] font-semibold tracking-[0.18em] text-ink-muted uppercase">
              Admin
            </span>
          </Link>
          <Link
            to={paths.home}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink lg:hidden"
          >
            <ArrowLeft aria-hidden className="size-3.5" /> Store
          </Link>
        </div>

        <nav aria-label="Admin">
          <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
            {adminNav.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === paths.admin}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-inverse text-inverse-fg'
                        : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                    )
                  }
                >
                  {Icon && <Icon aria-hidden className="size-4" strokeWidth={1.75} />}
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 hidden w-60 space-y-1 border-t border-line p-3 lg:block">
          {user && (
            <p className="truncate px-3 pb-1 text-xs text-ink-subtle" title={user.email}>
              {user.email}
            </p>
          )}
          <Link
            to={paths.home}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <ArrowLeft aria-hidden className="size-4" /> Back to store
          </Link>
          <SignOutButton className="w-full rounded-md px-3 py-2.5 text-ink-muted hover:bg-surface-muted hover:text-ink" />
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="min-w-0 focus:outline-none">
        {/* Pages are lazy too: keep the sidebar visible while a page chunk loads. */}
        <Suspense fallback={<FullPageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
