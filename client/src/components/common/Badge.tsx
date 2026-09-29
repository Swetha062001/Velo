import type { ReactNode } from 'react';
import { cn } from '../../utils/cn.ts';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-ink-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs px-2 py-0.5 text-xs font-medium tracking-wide uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
