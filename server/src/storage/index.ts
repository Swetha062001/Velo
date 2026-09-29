import { env } from '../config/env.js';
import { LocalDiskStorage } from './LocalDiskStorage.js';
import type { StorageProvider } from './StorageProvider.js';

export type { StorageProvider, StoredFile } from './StorageProvider.js';
export { UPLOADS_ROUTE } from './LocalDiskStorage.js';

/**
 * The active storage provider. Local disk for development; a cloud provider (S3, Supabase
 * Storage) would be selected here at deployment time.
 */
export const localStorage = new LocalDiskStorage(env.UPLOAD_DIR, env.PUBLIC_SERVER_URL);
export const storage: StorageProvider = localStorage;
