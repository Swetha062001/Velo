import { query } from '../../../db/index.js';
import { storage } from '../../../storage/index.js';
import { logger } from '../../../utils/logger.js';

/**
 * Deletes uploaded files for URLs that are no longer referenced by any product image or
 * category. External URLs (e.g. Unsplash) are ignored. Failures are logged, never thrown —
 * a leftover file must not fail the admin's save.
 */
export async function deleteUnreferencedUploads(urls: string[]) {
  const owned = [...new Set(urls)].filter((u) => storage.keyFromUrl(u) !== null);
  if (owned.length === 0) return;

  const rows = await query<{ url: string }>(
    `SELECT url FROM product_images WHERE url = ANY($1::text[])
     UNION SELECT image_url FROM categories WHERE image_url = ANY($1::text[])`,
    [owned],
  );
  const stillUsed = new Set(rows.map((r) => r.url));

  for (const url of owned) {
    if (stillUsed.has(url)) continue;
    try {
      await storage.delete(storage.keyFromUrl(url)!);
    } catch (err) {
      logger.warn('Could not delete uploaded file', { url, err });
    }
  }
}
