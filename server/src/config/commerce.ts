/**
 * Commerce rules. All amounts in paise. The server is the only place these are applied —
 * the client may display them but never calculates what the customer pays.
 */

/** Orders with a subtotal at or above ₹2,999 ship free. */
export const FREE_SHIPPING_THRESHOLD_PAISE = 299_900;

/** Flat shipping below the threshold: ₹99. */
export const SHIPPING_FEE_PAISE = 9_900;

/** Per-line quantity cap (matches the cart_items CHECK constraint). */
export const MAX_QUANTITY_PER_ITEM = 10;

/** Maximum distinct lines in one cart. */
export const MAX_CART_LINES = 20;
