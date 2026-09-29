import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { storage } from '../../../storage/index.js';
import { AppError } from '../../../utils/AppError.js';
import { detectImageType } from '../../../utils/imageType.js';
import { created } from '../../../utils/respond.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Files are held in memory only long enough to verify and store them. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5 },
}).single('file');

export const uploadQuerySchema = z.object({
  folder: z.enum(['products', 'categories']).default('products'),
});

export const uploadsController = {
  /** POST /admin/uploads/images — multipart field `file`. */
  async uploadImage(req: Request, res: Response) {
    if (!req.file) throw AppError.badRequest('Attach an image in the "file" field');

    const type = detectImageType(req.file.buffer);
    if (!type) {
      throw new AppError(400, 'UNSUPPORTED_FILE', 'Only JPEG, PNG or WebP images are allowed');
    }

    const { folder } = uploadQuerySchema.parse(req.query);
    const stored = await storage.save({
      data: req.file.buffer,
      contentType: type.contentType,
      extension: type.extension,
      folder,
    });

    created(res, {
      url: stored.url,
      key: stored.key,
      contentType: type.contentType,
      size: req.file.size,
    });
  },
};
