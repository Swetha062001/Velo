import { useId, type ComponentProps } from 'react';
import { cn } from '../../utils/cn.ts';

interface InputProps extends ComponentProps<'input'> {
  label: string;
  hint?: string;
  error?: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
}

export function Input({ label, hint, error, hideLabel, id, className, ...props }: InputProps) {
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
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'h-11 w-full rounded-md border bg-surface px-3.5 text-sm text-ink transition-colors',
          'placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-danger' : 'border-line-strong hover:border-ink-muted',
          className,
        )}
        {...props}
      />
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
