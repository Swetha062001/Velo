import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLogout } from '../../hooks/useAuth.ts';
import { paths } from '../../routes/paths.ts';
import { cn } from '../../utils/cn.ts';

export function SignOutButton({ className, onDone }: { className?: string; onDone?: () => void }) {
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      disabled={logout.isPending}
      onClick={() =>
        logout.mutate(undefined, {
          onSettled: () => {
            onDone?.();
            navigate(paths.home, { replace: true });
          },
        })
      }
      className={cn(
        'flex items-center gap-3 text-sm font-medium transition-colors disabled:opacity-50',
        className,
      )}
    >
      <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
      {logout.isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
