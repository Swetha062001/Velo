import { z } from 'zod';
import { MAX_CART_LINES, MAX_QUANTITY_PER_ITEM } from '../../config/commerce.js';

const quantity = z.coerce
  .number()
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(MAX_QUANTITY_PER_ITEM, `You can add at most ${MAX_QUANTITY_PER_ITEM} of one item`);

const variantId = z.uuid('Invalid product variant');

/** Only the variant and quantity are accepted — prices always come from the database. */
export const cartLineInputSchema = z.object({ variantId, quantity });

export const addItemSchema = cartLineInputSchema;

export const updateItemSchema = z.object({ quantity });

export const itemIdParamSchema = z.object({ itemId: z.uuid('Invalid cart item') });

/** Guest cart (from the browser) — priced by the server via /cart/quote, or merged on sign-in. */
export const guestCartSchema = z.object({
  items: z.array(cartLineInputSchema).max(MAX_CART_LINES, 'Too many items in the cart'),
});

export type CartLineInput = z.infer<typeof cartLineInputSchema>;
export type GuestCartInput = z.infer<typeof guestCartSchema>;
