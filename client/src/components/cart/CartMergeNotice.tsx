import { X } from 'lucide-react';
import { useUi } from '../../store/ui.ts';
import { Alert } from '../common/Alert.tsx';

/** One-time notice after sign-in when the guest bag couldn't be moved exactly as it was. */
export function CartMergeNotice({ className }: { className?: string }) {
  const notice = useUi((s) => s.cartNotice);
  const dismiss = useUi((s) => s.setCartNotice);
  if (!notice) return null;
  return (
    <Alert className={className}>
      <div className="flex items-start gap-3">
        <p className="flex-1">{notice}</p>
        <button
          type="button"
          onClick={() => dismiss(null)}
          aria-label="Dismiss"
          className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </Alert>
  );
}
