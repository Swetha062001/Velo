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
| 401    | `UNAUTHORIZED`        | Not signed in / session expired                 |
| 401    | `INVALID_CREDENTIALS` | Wrong email or password (sign-in only)          |
| 403    | `FORBIDDEN`           | Signed in but not allowed (e.g. non-admin)      |
| 404    | `NOT_FOUND`           | Unknown resource or route                       |
| 409    | `CONFLICT`            | Duplicate (e.g. email already registered)       |
| 413    | `PAYLOAD_TOO_LARGE`   | Body over 100 kb                                |
| 429    | `RATE_LIMITED`        | Too many requests                               |
| 500    | `INTERNAL_ERROR`      | Unexpected; includes `requestId` for log lookup |

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
