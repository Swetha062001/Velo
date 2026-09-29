import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../utils/cn.ts';

interface InputProps extends ComponentProps<'input'> {
  label: string;
  hint?: string;
  error?: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
  /** Element rendered inside the right edge of the field (e.g. a show-password button). */
  trailing?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  hideLabel,
  trailing,
  id,
  className,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={cn('text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'h-11 w-full rounded-md border bg-surface px-3.5 text-sm text-ink transition-colors',
            'placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:opacity-60',
            'read-only:bg-surface-muted read-only:text-ink-muted',
            error ? 'border-danger' : 'border-line-strong hover:border-ink-muted',
            trailing ? 'pr-11' : null,
            className,
          )}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
