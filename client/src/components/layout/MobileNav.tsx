import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { accountNav, storefrontNav } from '../../config/navigation.ts';
import { paths } from '../../routes/paths.ts';
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
  const dialogRef = useRef<HTMLDialogElement>(null);

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
          </ul>
        </nav>
      </div>
    </dialog>
  );
}
