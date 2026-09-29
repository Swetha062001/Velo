import { Link } from 'react-router';
import { paths } from '../../routes/paths.ts';
import { cn } from '../../utils/cn.ts';

export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      to={paths.home}
      onClick={onClick}
      aria-label="VELO — home"
      className={cn(
        'font-display text-2xl font-black tracking-tighter [font-stretch:115%]',
        className,
      )}
    >
      VELO<span className="text-accent">.</span>
    </Link>
  );
}
