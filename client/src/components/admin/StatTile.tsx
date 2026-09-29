import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Headline number (a stat tile, not a chart): label, hero value, supporting line. */
export function StatTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">{label}</p>
        <Icon aria-hidden className="size-4 text-ink-subtle" strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-xs text-ink-muted">{detail}</p>}
    </div>
  );
}
