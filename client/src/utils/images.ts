const UNSPLASH_HOST = 'images.unsplash.com';

/**
 * Sized image URL. Unsplash images are resized/compressed on their CDN via URL params;
 * other URLs (e.g. admin uploads in Phase 11) are returned unchanged.
 */
export function imageUrl(url: string, width: number) {
  try {
    const u = new URL(url);
    if (u.hostname !== UNSPLASH_HOST) return url;
    u.searchParams.set('w', String(width));
    u.searchParams.set('q', '80');
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    return u.toString();
  } catch {
    return url;
  }
}

/** `srcset` so the browser downloads only the size it needs. */
export function imageSrcSet(url: string, widths: number[] = [320, 480, 640, 960, 1280]) {
  if (!url.includes(UNSPLASH_HOST)) return undefined;
  return widths.map((w) => `${imageUrl(url, w)} ${w}w`).join(', ');
}
