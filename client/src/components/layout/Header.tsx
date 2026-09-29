import type { LucideIcon } from 'lucide-react';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { storefrontNav } from '../../config/navigation.ts';
import { useCurrentUser } from '../../hooks/useAuth.ts';
import { useCart } from '../../hooks/useCart.ts';
import { paths } from '../../routes/paths.ts';
import { cn } from '../../utils/cn.ts';
import { Container } from './Container.tsx';
import { Logo } from './Logo.tsx';
import { MobileNav } from './MobileNav.tsx';
import { SearchDialog } from './SearchDialog.tsx';

function IconLink({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-surface-muted"
    >
      <Icon aria-hidden className="size-5" strokeWidth={1.75} />
    </Link>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const { cart } = useCart();
  const bagCount = cart?.itemCount ?? 0;
  const currentUrl = location.pathname + location.search;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <Container className="flex h-16 items-center gap-4">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          className="-ml-2 inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-muted lg:hidden"
        >
          <Menu aria-hidden className="size-5" />
        </button>

        <Logo />

        <nav aria-label="Main" className="ml-8 hidden lg:block">
          <ul className="flex items-center gap-7">
            {storefrontNav.map((item) => {
              const active = currentUrl === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative py-2 text-sm font-medium transition-colors hover:text-ink',
                      'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:bg-accent after:transition-transform after:duration-200',
                      active
                        ? 'text-ink after:scale-x-100'
                        : 'text-ink-muted after:scale-x-0 hover:after:scale-x-100',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          {user?.role === 'ADMIN' && (
            <Link
              to={paths.admin}
              className="mr-2 hidden rounded-xs bg-accent-soft px-2 py-1 text-xs font-semibold tracking-wide text-accent uppercase transition-colors hover:bg-accent hover:text-accent-fg sm:inline-block"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search products"
            title="Search products"
            aria-haspopup="dialog"
            className="inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-surface-muted"
          >
            <Search aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
          <span className="hidden sm:contents">
            <IconLink to={paths.wishlist} label="Wishlist" icon={Heart} />
          </span>
          <IconLink
            to={user ? paths.account : paths.login}
            label={user ? `Account — ${user.name}` : 'Sign in'}
            icon={User}
          />
          <Link
            to={paths.cart}
            aria-label={bagCount ? `Bag, ${bagCount} ${bagCount === 1 ? 'item' : 'items'}` : 'Bag'}
            title="Bag"
            className="relative inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-surface-muted"
          >
            <ShoppingBag aria-hidden className="size-5" strokeWidth={1.75} />
            {bagCount > 0 && (
              <span
                aria-hidden
                className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] leading-none font-bold text-accent-fg tabular-nums"
              >
                {bagCount > 99 ? '99+' : bagCount}
              </span>
            )}
          </Link>
        </div>
      </Container>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
