import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SaveFileInput, StorageProvider, StoredFile } from './StorageProvider.js';

/** Keys this provider issues: "<folder>/<uuid>.<ext>". Anything else is rejected. */
const KEY_PATTERN = /^[a-z]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const UPLOADS_ROUTE = '/uploads';

/**
 * Stores files on the local filesystem and serves them from `${publicBaseUrl}/uploads/…`
 * (see app.ts). Filenames are random UUIDs — user-supplied names never touch the disk.
 */
export class LocalDiskStorage implements StorageProvider {
  private readonly root: string;
  private readonly urlPrefix: string;

  constructor(rootDir: string, publicBaseUrl: string) {
    this.root = path.resolve(rootDir);
    this.urlPrefix = `${publicBaseUrl}${UPLOADS_ROUTE}/`;
  }

  get rootDir() {
    return this.root;
  }

  /** Absolute path for a valid key, guaranteed to be inside the upload root. */
  private pathFor(key: string) {
    if (!KEY_PATTERN.test(key)) throw new Error(`Invalid storage key: ${key}`);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Storage key escapes root');
    return full;
  }

  async save({ data, extension, folder }: SaveFileInput): Promise<StoredFile> {
    const key = `${folder}/${randomUUID()}.${extension}`;
    const full = this.pathFor(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { flag: 'wx' }); // never overwrite
    return { key, url: this.urlPrefix + key };
  }

  async delete(key: string) {
    try {
      await unlink(this.pathFor(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  keyFromUrl(url: string) {
    if (!url.startsWith(this.urlPrefix)) return null;
    const key = url.slice(this.urlPrefix.length);
    return KEY_PATTERN.test(key) ? key : null;
  }
}
