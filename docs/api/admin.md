# Admin API — `/admin/*`

Every endpoint requires an authenticated **ADMIN**: `401 UNAUTHORIZED` when signed out,
`403 FORBIDDEN` for customers. The role is re-read from the database on each request, so
promotions/demotions apply immediately. Money is in paise.

List endpoints accept `page` / `limit` and return `meta: { page, limit, total, totalPages }`.

## Dashboard

### `GET /admin/stats`

```json
{
  "data": {
    "revenuePaise": 799900,
    "orderCount": 1,
    "customerCount": 1,
    "products": { "active": 19, "draft": 1, "archived": 0 },
    "ordersByStatus": {
      "CONFIRMED": 1,
      "PROCESSING": 0,
      "SHIPPED": 0,
      "DELIVERED": 0,
      "CANCELLED": 0
    },
    "revenueByDay": [{ "day": "2026-09-30", "revenuePaise": 799900, "orders": 1 }],
    "lowStock": {
      "total": 19,
      "items": [
        {
          "variantId": "…",
          "productId": "…",
          "productName": "…",
          "colorway": "…",
          "sizeLabel": "UK 9",
          "sku": "…",
          "quantity": 0,
          "lowStockThreshold": 5
        }
      ]
    },
    "recentOrders": [
      {
        "orderNumber": "VELO-2026-000001",
        "status": "CONFIRMED",
        "totalPaise": 799900,
        "placedAt": "…",
        "customerName": "…"
      }
    ]
  }
}
```

Revenue excludes cancelled orders. `revenueByDay` covers the last 14 days in India time
(Asia/Kolkata), zero-filled. Low stock = active sizes of live products at or below their threshold.

## Uploads

### `POST /admin/uploads/images?folder=products|categories`

`multipart/form-data` with one file in the field **`file`**. Rate limit: 100 / 15 min.

- Accepted: **JPEG, PNG, WebP**, up to **5 MB**. The type is detected from the file's bytes —
  the filename and browser MIME type are ignored, so a renamed script is rejected.
- Stored under a random UUID name (user filenames never touch disk) and served from
  `/uploads/<folder>/<uuid>.<ext>` with long-lived immutable caching, `nosniff`, a
  `default-src 'none'` CSP and `Cross-Origin-Resource-Policy: cross-origin`.

**201**

```json
{
  "data": {
    "url": "http://localhost:5001/uploads/products/5b4a….jpg",
    "key": "products/5b4a….jpg",
    "contentType": "image/jpeg",
    "size": 48213
  }
}
```

Save the returned `url` on a product (`PUT /admin/products/:id/images`) or category
(`imageUrl`). Image fields accept either these upload URLs or external `https://` URLs.

When an image is removed from a product/category (or the product/category is deleted), its
uploaded file is deleted — unless another product or category still uses it.

**Errors** — `400 UNSUPPORTED_FILE` (not JPEG/PNG/WebP), `400 INVALID_UPLOAD` (missing or
wrong field), `413 FILE_TOO_LARGE`.

## Products

| Method   | URL                            | Body / query                                                      | Success                                                                                  |
| -------- | ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`    | `/admin/products`              | `q`, `status`, `categoryId`, `page`, `limit`                      | `200` list (all statuses) with `imageUrl`, `variantCount`, `totalStock`, `lowStockCount` |
| `POST`   | `/admin/products`              | Product fields + optional `images[]`, `variants[]`                | `201` product detail                                                                     |
| `GET`    | `/admin/products/:id`          | —                                                                 | `200` detail: fields, `images[]`, `variants[]` (with stock), `canDelete`                 |
| `PATCH`  | `/admin/products/:id`          | any product fields                                                | `200` detail                                                                             |
| `DELETE` | `/admin/products/:id`          | —                                                                 | `204`; `409 PRODUCT_HAS_ORDERS` if ever ordered (archive instead)                        |
| `PUT`    | `/admin/products/:id/images`   | `{ images: [{ url, altText }] }` (ordered, ≤ 10)                  | `200` detail                                                                             |
| `POST`   | `/admin/products/:id/variants` | variant fields                                                    | `201` detail                                                                             |
| `PATCH`  | `/admin/variants/:variantId`   | `sizeLabel`, `sku`, `priceOverridePaise`, `isActive`, `sortOrder` | `200` detail                                                                             |
| `DELETE` | `/admin/variants/:variantId`   | —                                                                 | `200` detail; `409 VARIANT_HAS_ORDERS` if ever ordered (deactivate instead)              |

**Product fields**

| Field                 | Rule                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| `categoryId`          | uuid of an existing category                                                        |
| `name`                | 1–120                                                                               |
| `slug`                | optional on create (generated from name + colourway); unique, `a-z0-9-`             |
| `colorway`            | 1–60 (display name, e.g. "Ember Orange")                                            |
| `color`               | one lowercase word — colour family used by filters and the AI                       |
| `gender`              | `MEN` \| `WOMEN` \| `UNISEX`                                                        |
| `description`         | 20–4000                                                                             |
| `material`            | ≤ 300, nullable                                                                     |
| `tags`                | ≤ 20 lowercase words/dashes                                                         |
| `pricePaise`          | ₹1 – ₹1,00,000                                                                      |
| `compareAtPricePaise` | nullable; must be greater than the price                                            |
| `status`              | `DRAFT` (default) \| `ACTIVE` \| `ARCHIVED` — only `ACTIVE` is visible in the store |
| `isFeatured`          | boolean                                                                             |

**Variant fields** — `sizeLabel` (1–20, unique per product), `sku` (3–40 `A-Z0-9-`, globally
unique), `priceOverridePaise` (nullable), `quantity` (≥ 0), `lowStockThreshold` (default 5),
`isActive` (default true). Images must be `https://` URLs with alt text.

**Errors** — `400 VALIDATION_ERROR` (field paths like `body.variants.0.sku`), `400` for a
compare-at price not above the price, `404 NOT_FOUND`, `409 CONFLICT` for a duplicate slug, SKU
or size.

## Categories

| Method   | URL                     | Body                                                                        | Success                                            |
| -------- | ----------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| `GET`    | `/admin/categories`     | —                                                                           | `200` all (incl. hidden) with `productCount`       |
| `POST`   | `/admin/categories`     | `name`, optional `slug`, `description`, `imageUrl`, `sortOrder`, `isActive` | `201`                                              |
| `PATCH`  | `/admin/categories/:id` | any of the above                                                            | `200`                                              |
| `DELETE` | `/admin/categories/:id` | —                                                                           | `204`; `409 CATEGORY_NOT_EMPTY` if it has products |

Hidden categories (`isActive: false`) and their products disappear from the storefront.

## Inventory

| Method  | URL                           | Body / query                                                                   | Success                             |
| ------- | ----------------------------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| `GET`   | `/admin/inventory`            | `filter` (`all` \| `low` \| `out`), `q` (product/SKU), `page`, `limit` (≤ 100) | `200` rows sorted most urgent first |
| `PATCH` | `/admin/inventory/:variantId` | `{ quantity?, lowStockThreshold? }` — absolute values                          | `200` row                           |

## Orders

| Method  | URL                                 | Body / query                                              | Success                                                  |
| ------- | ----------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `GET`   | `/admin/orders`                     | `status`, `q` (order no., name or email), `page`, `limit` | `200` list with `customer`                               |
| `GET`   | `/admin/orders/:orderNumber`        | —                                                         | `200` order + `customer` + `allowedTransitions`          |
| `PATCH` | `/admin/orders/:orderNumber/status` | `{ status }`                                              | `200`; `409 INVALID_TRANSITION` (with `details.allowed`) |

**Allowed transitions**

| From         | To                        |
| ------------ | ------------------------- |
| `CONFIRMED`  | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | `SHIPPED`, `CANCELLED`    |
| `SHIPPED`    | `DELIVERED`               |
| `DELIVERED`  | — (final)                 |
| `CANCELLED`  | — (final)                 |

Cancelling returns stock and refunds paid orders. Delivering a cash-on-delivery order marks it
`PAID`.

## Users

| Method  | URL                     | Body / query                              | Success                                                                       |
| ------- | ----------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| `GET`   | `/admin/users`          | `q` (name/email), `role`, `page`, `limit` | `200` with `orderCount`, `totalSpentPaise` (excluding cancelled)              |
| `PATCH` | `/admin/users/:id/role` | `{ role: "USER" \| "ADMIN" }`             | `200`; `409 CANNOT_CHANGE_OWN_ROLE` for yourself (so an admin always remains) |
