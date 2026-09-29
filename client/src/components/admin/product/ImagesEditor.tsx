import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AdminImage } from '../../../types/admin.ts';
import { Button } from '../../common/Button.tsx';
import { Input } from '../../common/Input.tsx';
import { ProductImage } from '../../product/ProductImage.tsx';

interface ImagesEditorProps {
  images: AdminImage[];
  onChange: (images: AdminImage[]) => void;
}

const isHttpsUrl = (v: string) => {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Ordered image list (first image = primary). Images are https URLs for now;
 * uploading files arrives in Phase 11.
 */
export function ImagesEditor({ images, onChange }: ImagesEditorProps) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState<string>();

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  function add() {
    if (!isHttpsUrl(url.trim())) return setError('Enter a valid https:// image URL');
    if (!alt.trim()) return setError('Describe the image for screen readers (alt text)');
    if (images.length >= 10) return setError('Up to 10 images per product');
    onChange([...images, { url: url.trim(), altText: alt.trim() }]);
    setUrl('');
    setAlt('');
    setError(undefined);
  }

  return (
    <div className="space-y-5">
      {images.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-muted">
          No images yet. The first image is used on product cards.
        </p>
      ) : (
        <ol className="space-y-2">
          {images.map((img, i) => (
            <li
              key={img.url + i}
              className="flex items-center gap-3 rounded-md border border-line p-2"
            >
              <ProductImage
                src={img.url}
                alt=""
                width={120}
                className="size-14 shrink-0 rounded-sm bg-surface-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {i === 0 && (
                    <span className="mr-2 text-xs font-semibold text-accent uppercase">
                      Primary
                    </span>
                  )}
                  {img.altText}
                </p>
                <p className="truncate text-xs text-ink-subtle">{img.url}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label={`Move image ${i + 1} up`}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === images.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label={`Move image ${i + 1} down`}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                  aria-label={`Remove image ${i + 1}`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          label="Image URL"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Input
          label="Alt text"
          placeholder="VELO Aero One, side view"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />
        <Button variant="secondary" onClick={add}>
          <Plus aria-hidden className="size-4" /> Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
