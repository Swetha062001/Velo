import { useApiHealth } from '../../hooks/useApiHealth.ts';
import { cn } from '../../utils/cn.ts';

/** Development-only API connectivity indicator (rendered in the footer). */
export function ApiStatus() {
  const { isPending, isError } = useApiHealth();
  const label = isPending ? 'Checking API' : isError ? 'API offline' : 'API online';

  return (
    <span role="status" className="inline-flex items-center gap-2 text-xs">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          isPending ? 'bg-inverse-fg/40' : isError ? 'bg-danger' : 'bg-success',
        )}
      />
      {label}
    </span>
  );
}
