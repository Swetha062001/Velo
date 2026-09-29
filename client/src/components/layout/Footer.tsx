import { Link } from 'react-router';
import { accountNav, storefrontNav } from '../../config/navigation.ts';
import { useCurrentUser } from '../../hooks/useAuth.ts';
import { paths } from '../../routes/paths.ts';
import { ThemePicker } from '../common/ThemeToggle.tsx';
import { ApiStatus } from './ApiStatus.tsx';
import { Container } from './Container.tsx';

const shopColumn = {
  heading: 'Shop',
  links: [{ label: 'Shop all', to: paths.products }, ...storefrontNav],
};

function accountColumn(signedIn: boolean) {
  return {
    heading: 'Account',
    links: [
      signedIn ? { label: 'My account', to: paths.account } : { label: 'Sign in', to: paths.login },
      ...accountNav.slice(1),
      { label: 'Wishlist', to: paths.wishlist },
      { label: 'Cart', to: paths.cart },
    ],
  };
}

export function Footer() {
  const { data: user } = useCurrentUser();
  const columns = [shopColumn, accountColumn(Boolean(user))];

  return (
    <footer className="mt-24 bg-band text-band-fg">
      <Container className="grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-display text-4xl font-black tracking-tighter [font-stretch:115%]">
            VELO<span className="text-accent">.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm text-band-fg/70">
            Premium sneakers engineered for motion. Minimal design, considered materials, made for
            every day.
          </p>
        </div>

        {columns.map((col) => (
          <nav key={col.heading} aria-label={col.heading} className="md:col-span-3">
            <h2 className="font-sans text-xs font-semibold tracking-[0.18em] text-band-fg/60 uppercase">
              {col.heading}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-band-fg/85 transition-colors hover:text-band-fg"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <div className="border-t border-band-fg/15">
        <Container className="flex flex-col gap-3 py-6 text-xs text-band-fg/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VELO. A fictional brand — portfolio project.</p>
          <div className="flex flex-wrap items-center gap-4">
            {import.meta.env.DEV && <ApiStatus />}
            <ThemePicker />
          </div>
        </Container>
      </div>
    </footer>
  );
}
