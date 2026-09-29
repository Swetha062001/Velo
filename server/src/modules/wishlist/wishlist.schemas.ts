import { z } from 'zod';

export const productIdSchema = z.uuid('Invalid product');

export const addToWishlistSchema = z.object({ productId: productIdSchema });

export const productIdParamSchema = z.object({ productId: productIdSchema });

export const moveToCartSchema = z.object({ variantId: z.uuid('Choose a size') });
