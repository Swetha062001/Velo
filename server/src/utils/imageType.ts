export interface DetectedImage {
  extension: 'jpg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

/**
 * Identifies an image by its magic bytes. The filename and the browser-supplied MIME type are
 * never trusted — a renamed script or HTML file is rejected here.
 */
export function detectImageType(buf: Buffer): DetectedImage | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: 'png', contentType: 'image/png' };
  }
  // RIFF....WEBP
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  return null;
}
