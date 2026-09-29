import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      {Icon && (
        <span className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
          <Icon aria-hidden className="size-6" strokeWidth={1.5} />
        </span>
      )}
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
