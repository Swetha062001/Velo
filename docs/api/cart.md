# Cart API

The server is the only source of prices and totals. Clients send **variant ids and quantities
only**; any other field (e.g. `price`) is stripped by validation. Carts never store prices, so the
current catalogue price is always used — the price is frozen only when an order is placed (Phase 9).

## Rules

| Rule                | Value                                                    |
| ------------------- | -------------------------------------------------------- |
| Free shipping       | Subtotal **≥ ₹2,999** (`299900` paise)                   |
| Shipping below that | ₹99 (`9900`)                                             |
| Quantity per line   | 1–10                                                     |
| Distinct lines      | ≤ 20                                                     |
| Stock               | Checked on every add/update; not reserved until checkout |

## Cart object

Returned by every endpoint below.

```json
{
  "data": {
    "items": [
      {
        "id": "…cart item id (guest quote: the variant id)…",
        "variantId": "…",
        "productId": "…",
        "slug": "velo-drift-slide-onyx-black",
        "name": "VELO Drift Slide",
        "colorway": "Onyx Black",
        "sizeLabel": "UK 6",
        "sku": "VELO-DRFT-BLK-06",
        "image": { "url": "https://images.unsplash.com/photo-…", "alt": "…" },
        "unitPricePaise": 149900,
        "quantity": 2,
        "lineTotalPaise": 299800,
        "maxQuantity": 10,
        "stockStatus": "in_stock",
        "issue": null
      }
    ],
    "itemCount": 2,
    "subtotalPaise": 299800,
    "shippingPaise": 9900,
    "totalPaise": 309700,
    "freeShippingThresholdPaise": 299900,
    "amountToFreeShippingPaise": 100,
    "hasIssues": false
  }
}
```

`issue` flags a line that can't be bought as-is — it is **excluded from all totals**:

| `issue`              | Meaning                                                         |
| -------------------- | --------------------------------------------------------------- |
| `unavailable`        | Product/variant/category no longer active                       |
| `out_of_stock`       | Size sold out                                                   |
| `insufficient_stock` | Fewer in stock than the quantity (`maxQuantity` shows how many) |

`maxQuantity` = min(stock, 10).

---

## `POST /cart/quote` — price a guest cart

Auth: none. Nothing is stored. Used for signed-out shoppers whose bag lives in the browser.

**Body** — `{ "items": [{ "variantId": uuid, "quantity": 1–10 }] }` (≤ 20 items; duplicates are combined)

**200** — Cart object plus `unavailableVariantIds: string[]` (ids that don't exist).

**Errors** — `400 VALIDATION_ERROR` (e.g. `body.items.0.quantity`).

---

The endpoints below require authentication (`401 UNAUTHORIZED` otherwise) and only ever act on
the signed-in user's own cart.

## `GET /cart`

**200** — the user's cart (created empty on first access).

## `POST /cart/items` — add

**Body** — `{ "variantId": uuid, "quantity": 1–10 }`. Adds to any existing quantity of the same size.

**200** — updated cart.

| Status | `code`               | When                                                     |
| ------ | -------------------- | -------------------------------------------------------- |
| 404    | `NOT_FOUND`          | Unknown variant                                          |
| 409    | `UNAVAILABLE`        | Product not active                                       |
| 409    | `OUT_OF_STOCK`       | Size sold out                                            |
| 409    | `INSUFFICIENT_STOCK` | Resulting quantity > stock — `details.available` = stock |
| 409    | `QUANTITY_LIMIT`     | Resulting quantity > 10                                  |
| 409    | `CART_FULL`          | Would exceed 20 lines                                    |

## `PATCH /cart/items/:itemId` — set quantity

**Body** — `{ "quantity": 1–10 }` (absolute). **200** — updated cart.
**Errors** — `404` item not in _your_ cart · same `409` codes as add.

## `DELETE /cart/items/:itemId`

**200** — updated cart. **Errors** — `404` item not in your cart.

## `DELETE /cart`

Empties the cart. **200** — empty cart.

## `POST /cart/merge` — after sign-in

Moves a guest bag into the account cart.

**Body** — same as `/cart/quote`.

Quantities are added to existing lines and clamped to stock and the 10-per-item cap. Unknown,
unavailable and sold-out variants are skipped. **200** — merged cart, plus a report of what had
to change (line counts), which the client turns into a notice on the bag and checkout:

```json
{ "data": { "items": [ … ] }, "meta": { "merge": { "reduced": 1, "unavailable": 1, "cartFull": 0 } } }
```

- `reduced` — quantity lowered to stock or the 10-per-item cap
- `unavailable` — unknown, unpublished or sold-out variant, skipped
- `cartFull` — skipped because the bag already has 20 lines
