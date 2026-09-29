import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn.ts';

interface SearchFieldProps {
  initialValue?: string;
  onSearch: (q: string | undefined) => void;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Submits on Enter. Remount with `key={q}` to resync when the URL's `q` changes
 * (keeps local typing state without effects).
 */
export function SearchField({
  initialValue = '',
  onSearch,
  autoFocus,
  className,
}: SearchFieldProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim() || undefined);
      }}
      className={cn('relative', className)}
    >
      <label htmlFor="product-search" className="sr-only">
        Search products
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted"
      />
      <input
        id="product-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search sneakers, colours, materials…"
        autoFocus={autoFocus}
        autoComplete="off"
        maxLength={100}
        className="h-11 w-full rounded-md border border-line-strong bg-surface pr-10 pl-10 text-sm placeholder:text-ink-subtle hover:border-ink-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue('');
            onSearch(undefined);
          }}
          className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-ink-muted hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </form>
  );
}
