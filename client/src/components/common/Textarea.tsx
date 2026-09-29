import { useId, type ComponentProps } from 'react';
import { cn } from '../../utils/cn.ts';

interface TextareaProps extends ComponentProps<'textarea'> {
  label: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, id, className, rows = 4, ...props }: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'w-full rounded-md border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle',
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
