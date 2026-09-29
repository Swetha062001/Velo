import { cn } from '../../utils/cn.ts';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-inverse text-inverse-fg hover:bg-accent hover:text-accent-fg',
  accent: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'border border-line-strong text-ink hover:border-ink',
  ghost: 'text-ink hover:bg-surface-muted',
  danger: 'bg-danger text-canvas hover:opacity-90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base',
  icon: 'size-10',
};

/** Shared by <Button> and <ButtonLink> so links and buttons look identical. */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth,
}: ButtonStyleProps = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none',
    'transition-colors duration-200 ease-velo',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
  );
}
