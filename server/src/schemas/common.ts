import { z } from 'zod';

/** Shared request schemas. Feature-specific schemas live in their module. */

export const idParamSchema = z.object({ id: z.uuid('Invalid id') });

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be lowercase letters, numbers and hyphens');

export const slugParamSchema = z.object({ slug: slugSchema });
