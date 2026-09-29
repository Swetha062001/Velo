export interface StoredFile {
  /** Provider-relative key, e.g. "products/9f1c….webp". */
  key: string;
  /** Public URL to store in the database and render in the browser. */
  url: string;
}

export interface SaveFileInput {
  data: Buffer;
  contentType: string;
  extension: string;
  /** Logical folder, e.g. "products" or "categories". */
  folder: string;
}

/**
 * Where uploaded files live. The app only talks to this interface, so moving from local disk
 * to S3 / Supabase Storage / a CDN is a new implementation — no changes to routes or services.
 */
export interface StorageProvider {
  save(file: SaveFileInput): Promise<StoredFile>;
  /** Idempotent: deleting a missing file is not an error. */
  delete(key: string): Promise<void>;
  /** The key for a URL this provider issued, or null for any other URL. */
  keyFromUrl(url: string): string | null;
}
