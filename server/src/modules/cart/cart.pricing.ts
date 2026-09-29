import {
  FREE_SHIPPING_THRESHOLD_PAISE,
  MAX_QUANTITY_PER_ITEM,
  SHIPPING_FEE_PAISE,
} from '../../config/commerce.js';
import { stockStatus } from '../products/products.service.js';
import type { ProductImage, StockStatus } from '../products/products.types.js';
import type { VariantSnapshotRow } from './cart.repository.js';

/** Why a line can't be bought as-is. Lines with an issue are excluded from totals. */
export type CartIssue = 'unavailable' | 'out_of_stock' | 'insufficient_stock';

export interface CartLine {
  /** Cart item id for signed-in carts; the variant id for guest quotes. */
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorway: string;
  sizeLabel: string;
  sku: string;
  image: ProductImage | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  /** Highest quantity the customer can choose right now (stock and per-item cap). */
  maxQuantity: number;
  stockStatus: StockStatus;
  issue: CartIssue | null;
}

export interface CartTotals {
  itemCount: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  freeShippingThresholdPaise: number;
  amountToFreeShippingPaise: number;
  hasIssues: boolean;
}

export interface Cart extends CartTotals {
  items: CartLine[];
}

/** Prices and validates one line from current catalogue data. */
export function evaluateLine(row: VariantSnapshotRow, quantity: number, id: string): CartLine {
  const available = row.purchasable ? Math.max(row.stock, 0) : 0;
  const issue: CartIssue | null = !row.purchasable
    ? 'unavailable'
    : available === 0
      ? 'out_of_stock'
      : quantity > available
        ? 'insufficient_stock'
        : null;

  return {
    id,
    variantId: row.variant_id,
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    colorway: row.colorway,
    sizeLabel: row.size_label,
    sku: row.sku,
    image: row.image,
    unitPricePaise: row.unit_price_paise,
    quantity,
    lineTotalPaise: row.unit_price_paise * quantity,
    maxQuantity: Math.min(available, MAX_QUANTITY_PER_ITEM),
    stockStatus: stockStatus({
      is_active: row.purchasable,
      quantity: row.stock,
      low_stock_threshold: row.low_stock_threshold,
    }),
    issue,
  };
}

export function shippingFor(subtotalPaise: number) {
  if (subtotalPaise === 0) return 0;
  return subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : SHIPPING_FEE_PAISE;
}

/** Totals over purchasable lines only — a line with an issue is never charged. */
export function computeTotals(lines: CartLine[]): CartTotals {
  const payable = lines.filter((l) => l.issue === null);
  const subtotalPaise = payable.reduce((sum, l) => sum + l.lineTotalPaise, 0);
  const shippingPaise = shippingFor(subtotalPaise);

  return {
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    freeShippingThresholdPaise: FREE_SHIPPING_THRESHOLD_PAISE,
    amountToFreeShippingPaise:
      subtotalPaise > 0 && subtotalPaise < FREE_SHIPPING_THRESHOLD_PAISE
        ? FREE_SHIPPING_THRESHOLD_PAISE - subtotalPaise
        : 0,
    hasIssues: lines.some((l) => l.issue !== null),
  };
}

export function buildCart(lines: CartLine[]): Cart {
  return { items: lines, ...computeTotals(lines) };
}
