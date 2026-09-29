import { ChevronDown } from 'lucide-react';

interface QuantitySelectProps {
  value: number;
  max: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
  label: string;
}

/** Native select: accessible, mobile-friendly, and bounded by what can actually be bought. */
export function QuantitySelect({ value, max, onChange, disabled, label }: QuantitySelectProps) {
  // Keep the current value selectable even if stock has since dropped below it.
  const upper = Math.max(max, value, 1);

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 cursor-pointer appearance-none rounded-sm border border-line-strong bg-surface pr-8 pl-3 text-sm tabular-nums hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {Array.from({ length: upper }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n} disabled={n > max}>
            {n}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 size-3.5 text-ink-muted"
      />
    </label>
  );
}
