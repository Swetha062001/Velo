# Authentication & profile API

Sessions use a signed JWT stored in an **httpOnly** cookie named `velo_session`
(`SameSite=Lax`, `Path=/`, `Secure` in production, 7-day lifetime). JavaScript can never read it.

The server re-loads the user from the database on every authenticated request, so role changes
apply immediately and a bumped `token_version` (password change) revokes older sessions.

**User object** (returned by every endpoint below):

```json
{
  "id": "5b4a2c3e-8f1d-4e6a-9c7b-2d3e4f5a6b7c",
  "name": "Demo Customer",
  "email": "user@velo.local",
  "role": "USER",
  "createdAt": "2026-09-29T14:41:42.210Z"
}
```

Password hashes and token versions are never returned.

---

## `POST /auth/register`

Create an account and sign in.

|            |                           |
| ---------- | ------------------------- |
| Auth       | none                      |
| Rate limit | 20 requests / 15 min / IP |

**Body**

| Field      | Rules                                                         |
| ---------- | ------------------------------------------------------------- |
| `name`     | 2–100 characters (trimmed)                                    |
| `email`    | valid email, max 254 (trimmed, stored lowercase)              |
| `password` | 8+ characters, ≤ 72 bytes, at least one letter and one number |

Any other field (e.g. `role`) is ignored — new accounts are always `USER`.

**Responses**

- `201` `{ "data": { "user": User } }` + `Set-Cookie: velo_session=…`
- `400 VALIDATION_ERROR` — field errors in `details`
- `409 CONFLICT` — "An account with this email already exists" (case-insensitive)
- `429 RATE_LIMITED`

## `POST /auth/login`

|            |                                                                        |
| ---------- | ---------------------------------------------------------------------- |
| Auth       | none                                                                   |
| Rate limit | 10 **failed** attempts / 15 min / IP (successful sign-ins don't count) |

**Body** — `{ "email": string, "password": string }`

**Responses**

- `200` `{ "data": { "user": User } }` + `Set-Cookie: velo_session=…`
- `400 VALIDATION_ERROR`
- `401 INVALID_CREDENTIALS` — "Incorrect email or password". Identical for an unknown email and a
  wrong password (and takes the same time), so accounts can't be enumerated.
- `429 RATE_LIMITED`

## `POST /auth/logout`

|      |                   |
| ---- | ----------------- |
| Auth | none (idempotent) |

**Responses** — `204` + `Set-Cookie` that expires `velo_session`.

> Sign-out clears this browser's cookie. To end **all** sessions, change the password.

## `GET /auth/me`

The current session. Signed-out visitors get `user: null` rather than an error.

|      |          |
| ---- | -------- |
| Auth | optional |

**Responses**

- `200` `{ "data": { "user": User } }` — signed in
- `200` `{ "data": { "user": null } }` — no cookie, or an invalid/expired/revoked one (the dead
  cookie is cleared)

---

## `PATCH /users/me`

Update the display name.

|      |              |
| ---- | ------------ |
| Auth | **required** |

**Body** — `{ "name": string }` (2–100 characters, trimmed)

**Responses**

- `200` `{ "data": { "user": User } }`
- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

## `POST /users/me/password`

Change the password. **Signs out every other device**; this device receives a fresh cookie.

|            |                                  |
| ---------- | -------------------------------- |
| Auth       | **required**                     |
| Rate limit | 10 failed attempts / 15 min / IP |

**Body**

| Field             | Rules                                                |
| ----------------- | ---------------------------------------------------- |
| `currentPassword` | required                                             |
| `newPassword`     | same rules as registration; must differ from current |

**Responses**

- `200` `{ "data": { "user": User } }` + new `Set-Cookie`
- `400 VALIDATION_ERROR` — includes `{ path: "body.currentPassword", message: "Current password is incorrect" }`
- `401 UNAUTHORIZED`
- `429 RATE_LIMITED`

---

## Admin guard — `/admin/*`

Every admin endpoint (added in Phase 10) sits behind `authenticate` + `requireRole('ADMIN')`:

| Caller             | Result             |
| ------------------ | ------------------ |
| Signed out         | `401 UNAUTHORIZED` |
| Signed in, `USER`  | `403 FORBIDDEN`    |
| Signed in, `ADMIN` | allowed            |
