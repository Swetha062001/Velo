import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../../store/theme.ts';
import { cn } from '../../utils/cn.ts';

/** Icon button that flips light ↔ dark (header, admin). `className` sets its display. */
export function ThemeToggle({ className = 'inline-flex' }: { className?: string }) {
  const resolved = useTheme((s) => s.resolved);
  const toggle = useTheme((s) => s.toggle);
  const dark = resolved === 'dark';
  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className={cn(
        'size-10 items-center justify-center rounded-md transition-colors hover:bg-surface-muted',
        className,
      )}
    >
      <Icon aria-hidden className="size-5" strokeWidth={1.75} />
    </button>
  );
}

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/** Three-way picker, including "follow my device" (footer). Styled for the dark footer band. */
export function ThemePicker() {
  const preference = useTheme((s) => s.preference);
  const setPreference = useTheme((s) => s.setPreference);
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Theme</legend>
      <div className="inline-flex rounded-full border border-band-fg/20 p-0.5">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            title={label}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
              preference === value ? 'bg-band-fg text-band' : 'text-band-fg/70 hover:text-band-fg',
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={preference === value}
              onChange={() => setPreference(value)}
              className="sr-only"
            />
            <Icon aria-hidden className="size-3.5" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
