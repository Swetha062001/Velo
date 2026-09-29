import type { ReactNode } from 'react';
import { DocumentTitle } from '../common/DocumentTitle.tsx';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Split layout for sign-in / register: form on the left, editorial panel on large screens. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto grid w-full max-w-7xl lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <DocumentTitle title={title} />

      <section className="flex items-center px-4 py-14 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 border-t border-line pt-6 text-sm text-ink-muted">{footer}</p>
        </div>
      </section>

      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-band p-12 text-band-fg lg:flex lg:flex-col lg:justify-end"
      >
        {/* Decorative watermark drawn in CSS, so it isn't text (for screen readers or contrast). */}
        <span className="pointer-events-none absolute -top-10 -right-10 font-display text-[18rem] leading-none font-black text-band-fg/[0.05] [font-stretch:125%] before:content-['V.']" />
        <p className="text-xs font-semibold tracking-[0.2em] text-band-fg/60 uppercase">Members</p>
        <p className="mt-4 max-w-md font-display text-4xl leading-tight font-extrabold [font-stretch:110%]">
          Your wishlist, orders and AI picks — in one place.
        </p>
        <ul className="mt-8 space-y-2 text-sm text-band-fg/70">
          <li>— Save favourites and move them to your cart</li>
          <li>— Track every order from checkout to delivery</li>
          <li>— Faster checkout with saved addresses</li>
        </ul>
      </aside>
    </div>
  );
}
