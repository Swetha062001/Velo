/** First focusable element on every page — lets keyboard users jump past navigation. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-inverse px-4 py-2 text-sm font-semibold text-inverse-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}
