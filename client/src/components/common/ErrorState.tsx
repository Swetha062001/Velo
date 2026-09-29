import { TriangleAlert } from 'lucide-react';
import { Button } from './Button.tsx';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this content. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-16 text-center">
      <span className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert aria-hidden className="size-6" strokeWidth={1.5} />
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
