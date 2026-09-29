import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { productsUrl } from '../../routes/paths.ts';
import { SearchField } from '../product/SearchField.tsx';
import { Container } from './Container.tsx';

const SUGGESTIONS = ['white sneakers', 'running', 'leather', 'high-top', 'slides'];

/** Top-anchored search overlay opened from the header. Native <dialog> handles focus + Esc. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const search = (q: string | undefined) => {
    onClose();
    navigate(q ? productsUrl({ q }) : productsUrl());
  };

  return (
    <dialog
      ref={ref}
      aria-label="Search products"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 w-full max-w-none bg-canvas p-0 text-ink backdrop:bg-black/40"
    >
      <Container className="py-6">
        {open && <SearchField autoFocus onSearch={search} />}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-muted">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => search(s)}
              className="rounded-full border border-line-strong px-3 py-1 text-xs hover:border-ink"
            >
              {s}
            </button>
          ))}
        </div>
      </Container>
    </dialog>
  );
}
