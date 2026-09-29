# VELO API

Base URL (local): `http://localhost:5001/api/v1`

| Area                    | Doc                        |
| ----------------------- | -------------------------- |
| Health                  | [below](#health)           |
| Authentication, profile | [auth.md](auth.md)         |
| Products, categories    | [catalog.md](catalog.md)   |
| Cart                    | [cart.md](cart.md)         |
| Wishlist                | [wishlist.md](wishlist.md) |
| Orders                  | [orders.md](orders.md)     |
| Admin                   | [admin.md](admin.md)       |
| AI assistant            | [ai.md](ai.md)             |

## Conventions

**Success** — `{ "data": ..., "meta"?: { ... } }`

**Error** — `{ "error": { "code": "...", "message": "...", "details"?: [...] } }`

| Status | `code`                | Meaning                                         |
| ------ | --------------------- | ----------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | `details: [{ path: "body.email", message }]`    |
| 400    | `INVALID_JSON`        | Malformed JSON body                             |
| 400    | `INVALID_CHARACTERS`  | Text the database can't store (e.g. a NUL byte) |
| 401    | `UNAUTHORIZED`        | Not signed in / session expired                 |
| 401    | `INVALID_CREDENTIALS` | Wrong email or password (sign-in only)          |
| 403    | `FORBIDDEN`           | Signed in but not allowed (e.g. non-admin)      |
| 404    | `NOT_FOUND`           | Unknown resource or route                       |
| 409    | `CONFLICT`            | Duplicate (e.g. email already registered)       |
| 413    | `PAYLOAD_TOO_LARGE`   | Body over 100 kb                                |
| 429    | `RATE_LIMITED`        | Too many requests                               |
| 500    | `INTERNAL_ERROR`      | Unexpected; includes `requestId` for log lookup |

**Domain errors** — returned by specific endpoints so the client can react precisely:

| Status | `code`                                              | Where            | Meaning                                                      |
| ------ | --------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| 409    | `UNAVAILABLE`, `OUT_OF_STOCK`, `INSUFFICIENT_STOCK` | cart             | The size can't be bought, or not in that quantity            |
| 409    | `QUANTITY_LIMIT`, `CART_FULL`                       | cart             | More than 10 of a size, or more than 20 lines                |
| 409    | `WISHLIST_FULL`                                     | wishlist         | Wishlist limit reached                                       |
| 409    | `ADDRESS_LIMIT`                                     | addresses        | Saved-address limit reached                                  |
| 409    | `CART_EMPTY`, `CART_HAS_ISSUES`                     | orders           | Nothing to order, or lines need attention first              |
| 409    | `PRICE_CHANGED`                                     | orders           | Total differs from `expectedTotalPaise`; show the new total  |
| 402    | `PAYMENT_DECLINED`                                  | orders           | Simulated decline; nothing was created                       |
| 409    | `NOT_CANCELLABLE`                                   | orders           | Order has moved past `CONFIRMED`                             |
| 409    | `INVALID_TRANSITION`                                | admin orders     | Status change not allowed (e.g. shipped → processing)        |
| 409    | `PRODUCT_HAS_ORDERS`, `VARIANT_HAS_ORDERS`          | admin products   | Has been ordered — archive or deactivate instead of deleting |
| 409    | `CATEGORY_NOT_EMPTY`                                | admin categories | Move or delete its products first                            |
| 409    | `CANNOT_CHANGE_OWN_ROLE`                            | admin users      | Admins can't change their own role                           |
| 400    | `UNSUPPORTED_FILE`, `INVALID_UPLOAD`                | admin uploads    | Not a JPEG/PNG/WebP (checked by content), or no file sent    |
| 413    | `FILE_TOO_LARGE`                                    | admin uploads    | Image over 5 MB                                              |

**Authentication** — an httpOnly `velo_session` cookie set by sign-in/register. Browsers send it
automatically; clients must use `credentials: 'include'`. No `Authorization` header is used.

**Headers** — every response has `X-Request-Id`; API responses are `Cache-Control: no-store`;
rate-limit state is in `RateLimit` / `RateLimit-Policy`.

**Money** — integers in paise (`549900` = ₹5,499).

## Health

### `GET /health`

Auth: none

`200` — API and database are up:

```json
{
  "data": {
    "status": "ok",
    "environment": "development",
    "database": "up",
    "uptimeSeconds": 42,
    "timestamp": "2026-09-29T14:43:41.285Z"
  }
}
```

`503` — API is running but the database is unreachable (`"status": "degraded"`, `"database": "down"`).
