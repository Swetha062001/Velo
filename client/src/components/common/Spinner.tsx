import { LoaderCircle } from 'lucide-react';
import { cn } from '../../utils/cn.ts';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** When set, the spinner is announced to screen readers. Omit inside buttons. */
  label?: string;
  className?: string;
}

const sizes = { sm: 'size-4', md: 'size-6', lg: 'size-10' };

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const icon = <LoaderCircle aria-hidden className={cn('animate-spin', sizes[size], className)} />;
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex items-center gap-2">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center text-ink-muted">
      <Spinner size="lg" label="Loading" />
    </div>
  );
}
