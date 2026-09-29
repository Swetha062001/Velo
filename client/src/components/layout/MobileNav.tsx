import { Moon, Sun, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { accountNav, storefrontNav } from '../../config/navigation.ts';
import { useCurrentUser } from '../../hooks/useAuth.ts';
import { SignOutButton } from '../auth/SignOutButton.tsx';
import { paths } from '../../routes/paths.ts';
import { useTheme } from '../../store/theme.ts';
import { Logo } from './Logo.tsx';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Slide-in navigation drawer built on the native <dialog> element:
 * focus trapping, Esc-to-close and inert background come from the browser.
 */
export function MobileNav({ open, onClose }: MobileNavProps) {
  const dark = useTheme((s) => s.resolved === 'dark');
  const toggleTheme = useTheme((s) => s.toggle);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data: user } = useCurrentUser();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const linkClass =
    'block py-3 text-2xl font-bold font-display tracking-tight hover:text-accent transition-colors';

  return (
    <dialog
      ref={dialogRef}
      id="mobile-nav"
      aria-label="Main menu"
      onClose={onClose}
      // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 h-dvh max-h-none w-[min(22rem,85vw)] max-w-none bg-canvas p-0 text-ink backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <Logo onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-muted"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 py-6">
          <ul>
            <li>
              <Link to={paths.products} onClick={onClose} className={linkClass}>
                Shop all
              </Link>
            </li>
            {storefrontNav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} onClick={onClose} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mt-8 space-y-1 border-t border-line pt-6">
            {user ? (
              <>
                <li className="pb-2 text-xs text-ink-subtle">Signed in as {user.email}</li>
                {user.role === 'ADMIN' && (
                  <li>
                    <Link
                      to={paths.admin}
                      onClick={onClose}
                      className="block py-2 text-sm font-semibold text-accent"
                    >
                      Admin dashboard
                    </Link>
                  </li>
                )}
                {[...accountNav, { label: 'Wishlist', to: paths.wishlist }].map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onClose}
                      className="block py-2 text-sm text-ink-muted hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <SignOutButton onDone={onClose} className="py-2 text-ink-muted hover:text-ink" />
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    to={paths.login}
                    onClick={onClose}
                    className="block py-2 text-sm font-semibold"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    to={paths.register}
                    onClick={onClose}
                    className="block py-2 text-sm text-ink-muted hover:text-ink"
                  >
                    Create account
                  </Link>
                </li>
              </>
            )}
          </ul>

          <div className="mt-8 border-t border-line pt-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 py-2 text-sm text-ink-muted hover:text-ink"
            >
              {dark ? (
                <Sun aria-hidden className="size-4" />
              ) : (
                <Moon aria-hidden className="size-4" />
              )}
              {dark ? 'Light theme' : 'Dark theme'}
            </button>
          </div>
        </nav>
      </div>
    </dialog>
  );
}
