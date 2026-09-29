import { ImagePlus } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import { adminService } from '../../services/admin.service.ts';
import { cn } from '../../utils/cn.ts';
import { errorMessage } from '../../utils/forms.ts';
import { Spinner } from '../common/Spinner.tsx';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

interface ImageDropzoneProps {
  onUploaded: (url: string, file: File) => void;
  folder?: 'products' | 'categories';
  multiple?: boolean;
  /** Remaining slots; extra files are rejected with a message. */
  maxFiles?: number;
  compact?: boolean;
}

/**
 * Drag-and-drop or click-to-browse image upload. Files are checked here for type and size
 * (instant feedback) and verified again by the server from their bytes.
 */
export function ImageDropzone({
  onUploaded,
  folder = 'products',
  multiple = true,
  maxFiles = 10,
  compact = false,
}: ImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list];
    const problems: string[] = [];
    if (files.length > maxFiles)
      problems.push(`You can add ${maxFiles} more image${maxFiles === 1 ? '' : 's'}.`);

    const valid = files.slice(0, maxFiles).filter((f) => {
      if (!ACCEPTED.includes(f.type)) problems.push(`${f.name}: use JPEG, PNG or WebP.`);
      else if (f.size > MAX_BYTES) problems.push(`${f.name}: larger than 5 MB.`);
      else return true;
      return false;
    });

    setErrors(problems);
    setUploading((n) => n + valid.length);
    // Sequential keeps the resulting image order the same as the selection order.
    for (const file of valid) {
      try {
        const { url } = await adminService.uploadImage(file, folder);
        onUploaded(url, file);
      } catch (err) {
        setErrors((e) => [...e, `${file.name}: ${errorMessage(err)}`]);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed text-center transition-colors',
          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
          compact ? 'px-4 py-4' : 'px-6 py-8',
          dragging ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-ink-muted',
        )}
      >
        {uploading > 0 ? (
          <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner size="sm" /> Uploading {uploading} image{uploading === 1 ? '' : 's'}…
          </span>
        ) : (
          <>
            <ImagePlus aria-hidden className="size-6 text-ink-muted" strokeWidth={1.5} />
            <span className="text-sm">
              <span className="font-semibold">Upload {multiple ? 'images' : 'an image'}</span>
              <span className="text-ink-muted"> or drag and drop</span>
            </span>
            <span className="text-xs text-ink-subtle">JPEG, PNG or WebP · up to 5 MB</span>
          </>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple={multiple}
          disabled={uploading > 0}
          onChange={(e) => void handleFiles(e.target.files)}
          className="sr-only"
        />
      </label>
      {errors.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5 text-xs font-medium text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
