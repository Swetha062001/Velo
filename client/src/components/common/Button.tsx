import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { cn } from '../../utils/cn.ts';
import { buttonStyles, type ButtonStyleProps } from './buttonStyles.ts';
import { Spinner } from './Spinner.tsx';

interface ButtonProps extends ComponentProps<'button'>, ButtonStyleProps {
  loading?: boolean;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleProps;

/** A router link styled as a button — use for navigation, never <Button onClick={navigate}>. */
export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonStyles({ variant, size, fullWidth }), className)} {...props} />;
}
