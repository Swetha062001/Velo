# Addresses & orders API

All endpoints require authentication (`401 UNAUTHORIZED` otherwise) and only ever touch the
signed-in user's own data — another user's address or order behaves as `404 NOT_FOUND`.

## Addresses — `/users/me/addresses`

**Address object**

```json
{
  "id": "…",
  "fullName": "Asha Rao",
  "phone": "+91 9876543210",
  "line1": "12 MG Road",
  "line2": "Near Metro",
  "city": "Bengaluru",
  "state": "Karnataka",
  "postalCode": "560001",
  "country": "IN",
  "isDefault": true
}
```

**Field rules** (shipping is India-only)

| Field        | Rule                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `fullName`   | 1–100 chars                                                                                         |
| `phone`      | Indian mobile: 10 digits starting 6–9; `+91`/`0`/spaces/dashes accepted; stored as `+91 XXXXXXXXXX` |
| `line1`      | 1–200 chars                                                                                         |
| `line2`      | optional, ≤ 200                                                                                     |
| `city`       | 1–100 chars                                                                                         |
| `state`      | one of the 36 Indian states / UTs                                                                   |
| `postalCode` | 6-digit PIN code, not starting with 0                                                               |
| `isDefault`  | optional boolean                                                                                    |

| Method   | URL                       | Body                 | Success                           | Notes                                                                                               |
| -------- | ------------------------- | -------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET`    | `/users/me/addresses`     | —                    | `200` `Address[]` (default first) |                                                                                                     |
| `POST`   | `/users/me/addresses`     | Address fields       | `201` `Address`                   | First address is always default; `isDefault: true` moves the default. `409 ADDRESS_LIMIT` after 10. |
| `PATCH`  | `/users/me/addresses/:id` | Any subset of fields | `200` `Address`                   | `{ "isDefault": true }` makes it the default.                                                       |
| `DELETE` | `/users/me/addresses/:id` | —                    | `204`                             | Deleting the default promotes the newest remaining address.                                         |

Errors: `400 VALIDATION_ERROR` (field paths like `body.postalCode`), `404 NOT_FOUND`.

---

## Orders — `/orders`

### Order object

```json
{
  "id": "…",
  "orderNumber": "VELO-2026-000123",
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "paymentMethod": "MOCK_CARD",
  "placedAt": "2026-09-30T10:12:44.000Z",
  "shippingAddress": {
    "fullName": "…",
    "phone": "…",
    "line1": "…",
    "line2": null,
    "city": "…",
    "state": "…",
    "postalCode": "…",
    "country": "IN"
  },
  "items": [
    {
      "id": "…",
      "productSlug": "velo-street-core-chalk-white",
      "productName": "VELO Street Core",
      "colorway": "Chalk White",
      "sizeLabel": "UK 8",
      "sku": "VELO-STCR-WHT-08",
      "imageUrl": "https://images.unsplash.com/photo-…",
      "unitPricePaise": 399900,
      "quantity": 1,
      "lineTotalPaise": 399900
    }
  ],
  "itemCount": 1,
  "subtotalPaise": 399900,
  "shippingPaise": 0,
  "totalPaise": 399900,
  "canCancel": true
}
```

Items and address are **snapshots** taken when the order was placed. Later catalogue or address
changes never alter an existing order.

| `status`     | Meaning                           |
| ------------ | --------------------------------- |
| `CONFIRMED`  | Placed; customer may still cancel |
| `PROCESSING` | Being prepared (admin, Phase 10)  |
| `SHIPPED`    | On its way                        |
| `DELIVERED`  | Delivered                         |
| `CANCELLED`  | Cancelled; stock returned         |

`paymentStatus`: `PAID` (simulated card/UPI), `PENDING` (cash on delivery), `REFUNDED` (cancelled after payment), `FAILED`.

### `POST /orders` — place an order from the bag

Rate limit: 30 / 15 min / IP.

**Body**

| Field                | Type                               | Notes                                                     |
| -------------------- | ---------------------------------- | --------------------------------------------------------- |
| `addressId`          | uuid                               | One of your addresses                                     |
| `idempotencyKey`     | uuid                               | Generate once per checkout and reuse on retry             |
| `paymentMethod`      | `MOCK_CARD` \| `MOCK_UPI` \| `COD` | No payment details are ever sent                          |
| `expectedTotalPaise` | integer, optional                  | The total the shopper saw; mismatch → `409 PRICE_CHANGED` |
| `simulateDecline`    | boolean, optional                  | Demo: exercises the decline path                          |

Prices, totals and stock are always taken from the database — client-sent amounts are ignored.

**What happens (one transaction)** — lock the cart → lock the stock rows (fixed order, no
deadlocks) → re-price every line → validate → insert order + item/address snapshots → decrement
stock (never below zero) → clear the cart. Any failure rolls everything back.

**Responses**

- `201` Order object — new order
- `200` Order object — **replay** of an `idempotencyKey` already used (no second order, no second stock deduction)

| Status | `code`             | When                                                              |
| ------ | ------------------ | ----------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Bad body                                                          |
| 402    | `PAYMENT_DECLINED` | `simulateDecline: true` — nothing is created                      |
| 404    | `NOT_FOUND`        | Address isn't yours / doesn't exist                               |
| 409    | `CART_EMPTY`       | Nothing in the bag                                                |
| 409    | `CART_HAS_ISSUES`  | A line is sold out / unavailable / over stock — `details.items[]` |
| 409    | `PRICE_CHANGED`    | Server total ≠ `expectedTotalPaise` — `details.totalPaise`        |

### `GET /orders`

Query: `page` (default 1), `limit` (1–48, default 12). Newest first.

**200** — `data`: order summaries (Order object without `items`/`shippingAddress`/`canCancel`,
plus `previewImages: string[]` — up to 3), `meta`: `{ page, limit, total, totalPages }`.

### `GET /orders/:orderNumber`

**200** — Order object. **Errors** — `400` malformed number, `404` not found / not yours.

### `POST /orders/:orderNumber/cancel`

Allowed only while `CONFIRMED`. Returns every line's quantity to stock and sets
`paymentStatus` to `REFUNDED` if it was `PAID`.

**200** — updated Order object. **Errors** — `404`, `409 NOT_CANCELLABLE` (already processing,
shipped, delivered or cancelled).
