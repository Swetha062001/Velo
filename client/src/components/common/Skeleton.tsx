import { cn } from '../../utils/cn.ts';

/** Placeholder block shown while content loads. Size it with className. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-sm bg-surface-muted', className)} />;
}
