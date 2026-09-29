import { ArrowDown, ArrowUp, Link2, Trash2 } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import type { AdminImage } from '../../../types/admin.ts';
import { Button } from '../../common/Button.tsx';
import { Input } from '../../common/Input.tsx';
import { ProductImage } from '../../product/ProductImage.tsx';
import { ImageDropzone } from '../ImageDropzone.tsx';

const MAX_IMAGES = 10;

interface ImagesEditorProps {
  images: AdminImage[];
  /** A state setter, so sequential uploads can append with functional updates. */
  onChange: Dispatch<SetStateAction<AdminImage[]>>;
  /** Suggested alt text for new images (e.g. "VELO Aero One in Ember Orange"). */
  defaultAlt?: string;
}

const isHttpsUrl = (v: string) => {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Ordered image list (first = primary). Add images by uploading (drag & drop / browse) or by
 * https URL. Alt text is editable per image and required.
 */
export function ImagesEditor({ images, onChange, defaultAlt = '' }: ImagesEditorProps) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState<string>();

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };
  const update = (index: number, altText: string) =>
    onChange(images.map((img, i) => (i === index ? { ...img, altText } : img)));

  const suggestAlt = (n: number) => {
    const base = defaultAlt.trim() || 'Product image';
    return n === 0 ? base : `${base}, view ${n + 1}`;
  };

  function addUrl() {
    if (!isHttpsUrl(url.trim())) return setError('Enter a valid https:// image URL');
    if (images.length >= MAX_IMAGES) return setError(`Up to ${MAX_IMAGES} images per product`);
    onChange([...images, { url: url.trim(), altText: alt.trim() || suggestAlt(images.length) }]);
    setUrl('');
    setAlt('');
    setError(undefined);
  }

  const missingAlt = images.some((i) => !i.altText.trim());

  return (
    <div className="space-y-5">
      {images.length > 0 && (
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
                className="size-16 shrink-0 rounded-sm bg-surface-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  {i === 0 && <span className="font-semibold text-accent uppercase">Primary</span>}
                  <span className="truncate text-ink-subtle">{img.url.split('/').pop()}</span>
                </div>
                <label className="sr-only" htmlFor={`alt-${i}`}>
                  Alt text for image {i + 1}
                </label>
                <input
                  id={`alt-${i}`}
                  value={img.altText}
                  onChange={(e) => update(i, e.target.value)}
                  placeholder="Describe the image (alt text)"
                  maxLength={200}
                  aria-invalid={!img.altText.trim() || undefined}
                  className="h-9 w-full rounded-sm border border-line-strong bg-surface px-2 text-sm aria-[invalid=true]:border-danger"
                />
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
      {missingAlt && (
        <p role="alert" className="text-xs font-medium text-danger">
          Every image needs alt text for screen-reader users.
        </p>
      )}

      {images.length < MAX_IMAGES ? (
        <ImageDropzone
          maxFiles={MAX_IMAGES - images.length}
          // Functional update: several files finish one after another, each must see the
          // list including the previous upload.
          onUploaded={(uploadedUrl) =>
            onChange((current) => [
              ...current,
              { url: uploadedUrl, altText: suggestAlt(current.length) },
            ])
          }
        />
      ) : (
        <p className="text-xs text-ink-muted">Maximum of {MAX_IMAGES} images reached.</p>
      )}

      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          <Link2 aria-hidden className="size-4" /> Or add an image by URL
        </summary>
        <div className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            label="Image URL"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input
            label="Alt text"
            placeholder={suggestAlt(images.length)}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
          <Button variant="secondary" onClick={addUrl}>
            Add
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </details>
    </div>
  );
}
