import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn.ts';

type AlertTone = 'danger' | 'success' | 'info';

const tones: Record<AlertTone, { box: string; icon: typeof Info }> = {
  danger: { box: 'border-danger/30 bg-danger-soft text-danger', icon: CircleAlert },
  success: { box: 'border-success/30 bg-success-soft text-success', icon: CircleCheck },
  info: { box: 'border-line bg-surface-muted text-ink', icon: Info },
};

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

/** Inline message. Errors are announced immediately (role=alert); others politely. */
export function Alert({ tone = 'info', children, className }: AlertProps) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-md border px-4 py-3 text-sm', box, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
