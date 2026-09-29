import { ChevronDown } from 'lucide-react';
import { useId, type ComponentProps } from 'react';
import { cn } from '../../utils/cn.ts';

interface SelectProps extends ComponentProps<'select'> {
  label: string;
  error?: string;
  placeholder?: string;
  options: ReadonlyArray<string | { value: string; label: string }>;
}

/** Labelled native select matching <Input>: accessible and mobile-friendly. */
export function Select({
  label,
  error,
  placeholder,
  options,
  id,
  className,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-11 w-full cursor-pointer appearance-none rounded-md border bg-surface pr-10 pl-3.5 text-sm text-ink',
            error ? 'border-danger' : 'border-line-strong hover:border-ink-muted',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const { value, label: text } = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted"
        />
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
