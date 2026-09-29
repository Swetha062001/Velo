import { Search } from 'lucide-react';
import { useState, type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes } from 'react';
import type { ProductStatus } from '../../types/admin.ts';
import { cn } from '../../utils/cn.ts';
import { Badge, type BadgeTone } from '../common/Badge.tsx';
import { DocumentTitle } from '../common/DocumentTitle.tsx';

/** Admin page wrapper: title, optional description and actions, then content. */
export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-8 sm:px-8 lg:py-10">
      <DocumentTitle title={`${title} · Admin`} />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/**
 * Horizontally scrollable on small screens; rows separated by hairlines.
 * `compact` drops the minimum width for small tables inside dashboard panels.
 */
export function Table({
  children,
  label,
  compact = false,
}: {
  children: ReactNode;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className={cn('w-full text-left text-sm', !compact && 'min-w-[640px]')}>
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-line bg-surface-muted/60 px-4 py-3 text-xs font-semibold tracking-wide text-ink-muted uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-line px-4 py-3 align-middle', className)} {...props} />;
}

/** Search box that applies on Enter (remount with key={value} to sync from the URL). */
export function AdminSearch({
  value,
  onSearch,
  placeholder,
}: {
  value?: string;
  onSearch: (q: string | undefined) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value ?? '');
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text.trim() || undefined);
      }}
      className="relative w-full sm:w-72"
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-10 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-sm hover:border-ink-muted"
      />
    </form>
  );
}

/** Segmented filter (e.g. All / Draft / Active). */
export function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T | undefined; label: string }>;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-1 rounded-md bg-surface-muted p-1"
    >
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  DRAFT: { label: 'Draft', tone: 'neutral' },
  ARCHIVED: { label: 'Archived', tone: 'warning' },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const s = PRODUCT_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Section card used inside admin forms/detail pages. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface p-6', className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-base font-semibold tracking-normal">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
