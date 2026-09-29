import { useEffect, useState } from 'react';
import { env } from './config/env.ts';

type ApiStatus = 'checking' | 'online' | 'offline';

// Temporary Phase 1 screen: confirms the theme and client↔server wiring.
// Replaced by the router + storefront layout in Phase 2.
export default function App() {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${env.apiBaseUrl}/health`, { signal: controller.signal, credentials: 'include' })
      .then((res) => setStatus(res.ok ? 'online' : 'offline'))
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setStatus('offline');
      });
    return () => controller.abort();
  }, []);

  const badge = {
    checking: 'bg-surface-muted text-ink-muted',
    online: 'bg-success-soft text-success',
    offline: 'bg-danger-soft text-danger',
  }[status];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="font-display text-2xl font-black tracking-tighter [font-stretch:115%]">
            VELO<span className="text-accent">.</span>
          </span>
          <span
            role="status"
            className={`rounded-sm px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${badge}`}
          >
            API {status}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
        <p className="mb-4 text-sm font-medium tracking-[0.2em] text-ink-muted uppercase">
          Phase 1 — Foundation
        </p>
        <h1 className="max-w-4xl text-5xl leading-[0.95] font-extrabold [font-stretch:110%] sm:text-7xl lg:text-8xl">
          Engineered for motion.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">
          Premium sneakers, minimal by design. The storefront is under construction.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md bg-inverse px-6 py-3 text-sm font-semibold text-inverse-fg transition-colors duration-200 ease-velo hover:bg-accent"
          >
            Shop the collection
          </button>
          <button
            type="button"
            className="rounded-md border border-line-strong px-6 py-3 text-sm font-semibold transition-colors duration-200 ease-velo hover:border-ink"
          >
            Ask the AI stylist
          </button>
        </div>

        <ul aria-label="Theme palette" className="mt-16 flex flex-wrap gap-2">
          {[
            'bg-canvas',
            'bg-surface',
            'bg-surface-muted',
            'bg-inverse',
            'bg-ink-muted',
            'bg-accent',
            'bg-success',
            'bg-warning',
            'bg-danger',
          ].map((c) => (
            <li key={c} title={c} className={`size-8 rounded-sm border border-line ${c}`} />
          ))}
        </ul>
      </main>
    </div>
  );
}
