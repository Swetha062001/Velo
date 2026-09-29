import { NavLink, Outlet } from 'react-router';
import { SignOutButton } from '../components/auth/SignOutButton.tsx';
import { Container } from '../components/layout/Container.tsx';
import { accountNav } from '../config/navigation.ts';
import { paths } from '../routes/paths.ts';
import { cn } from '../utils/cn.ts';

/** Account area: side navigation on desktop, horizontal tabs on mobile. */
export default function AccountLayout() {
  return (
    <Container className="py-10 sm:py-14">
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">My account</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[14rem_1fr] lg:gap-12">
        <nav aria-label="Account">
          <ul className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 lg:mx-0 lg:flex-col lg:border-0 lg:px-0">
            {accountNav.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === paths.account}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-md lg:border-b-0',
                      isActive
                        ? 'border-accent text-ink lg:bg-surface-muted'
                        : 'border-transparent text-ink-muted hover:text-ink',
                    )
                  }
                >
                  {Icon && <Icon aria-hidden className="size-4" strokeWidth={1.75} />}
                  {label}
                </NavLink>
              </li>
            ))}
            <li className="lg:mt-4 lg:border-t lg:border-line lg:pt-4">
              <SignOutButton className="px-3 py-3 whitespace-nowrap text-ink-muted hover:text-ink" />
            </li>
          </ul>
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
