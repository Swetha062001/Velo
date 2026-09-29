import { useApiHealth } from '../../hooks/useApiHealth.ts';
import { ApiError } from '../../lib/apiClient.ts';
import { cn } from '../../utils/cn.ts';

/** Development-only API + database connectivity indicator (rendered in the footer). */
export function ApiStatus() {
  const { isPending, isError, error } = useApiHealth();

  // The API answers 503 when it is running but PostgreSQL is unreachable.
  const databaseDown = error instanceof ApiError && error.status === 503;
  const label = isPending
    ? 'Checking API'
    : databaseDown
      ? 'Database offline'
      : isError
        ? 'API offline'
        : 'API online';

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
