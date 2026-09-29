# Security

VELO treats the browser as untrusted. Prices, totals, stock, roles and AI output are decided or
checked on the server, and PostgreSQL constraints are the final guard. Each control below has an
automated test; the test files are named in the last column.

## Controls

| Threat                                            | Control                                                                                                                                                                                                                           | Proven by                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Customer reaches admin features                   | Every `/admin` route sits behind `authenticate` + `requireRole('ADMIN')`. The role is re-read from the database on each request, never taken from the token                                                                       | `security.test.ts` checks **every** admin route, enumerated from the router: 401 signed out, 403 customer |
| One customer reads or edits another's data (IDOR) | Every query is scoped to the signed-in user's id; a foreign id returns 404                                                                                                                                                        | `security.test.ts` (cart lines, addresses, orders), `orders.test.ts`                                      |
| Price or total tampering                          | Clients send only variant ids and quantities. Carts store no prices, and orders re-price inside a transaction with an `expectedTotalPaise` check                                                                                  | `security.test.ts`, `orders.test.ts`                                                                      |
| Overselling / race conditions                     | Inventory rows are locked in a fixed order inside the order transaction; an idempotency key stops duplicate orders                                                                                                                | `orders.test.ts` (last unit, double submit)                                                               |
| Mass assignment                                   | Zod schemas list the accepted fields and drop everything else; role changes are an admin-only endpoint                                                                                                                            | `security.test.ts`, `auth.test.ts`                                                                        |
| SQL injection                                     | Parameterised queries only; search input becomes a sanitised `tsquery`; no dynamic identifiers from input                                                                                                                         | `security.test.ts` (payload sweep across every filter, slug and admin search)                             |
| Session theft (XSS)                               | Session JWT in an **httpOnly, SameSite=Lax** cookie, so scripts can't read it; React escapes output; helmet sets security headers                                                                                                 | `auth.test.ts`, e2e `access.spec.ts`                                                                      |
| CSRF                                              | SameSite=Lax cookie, a strict CORS origin with credentials, and JSON-only APIs                                                                                                                                                    | `app.test.ts` (CORS)                                                                                      |
| Forged or stale sessions                          | HS256 pinned (rejects `alg: none`), issuer and audience checked, 7-day expiry; `token_version` revokes sessions on password change                                                                                                | `auth.test.ts`, `security.test.ts`                                                                        |
| Password attacks                                  | bcrypt (cost 12); one generic sign-in error; failed sign-ins and password changes rate-limited (10 per 15 min)                                                                                                                    | `auth.test.ts`                                                                                            |
| Brute force and abuse                             | Global per-IP limit plus stricter limits on sign-in, sign-up, uploads and the AI endpoint                                                                                                                                         | `rateLimit.test.ts`, `auth.test.ts`                                                                       |
| Open redirect after sign-in                       | `safeRedirect` parses `?redirect=` the way the browser does and requires the same origin                                                                                                                                          | `redirect.test.ts`, e2e `access.spec.ts`                                                                  |
| Malicious uploads                                 | Type detected from file bytes (JPEG, PNG, WebP), 5 MB cap, random UUID names, path-traversal guard; served with `nosniff` and CSP `default-src 'none'`                                                                            | `uploads.test.ts`, `security.test.ts`                                                                     |
| Tampered `localStorage`                           | The guest bag is sanitised on load (valid ids, 1–10 quantity, 20 lines) and priced by the server anyway                                                                                                                           | `guestCart.test.ts`                                                                                       |
| AI hallucination and prompt injection             | The model never queries the database, picks only from server-retrieved refs, and its text is rejected if it mentions prices, offers, internal refs, unpicked products or wrong colours; rules own budget, colour, gender and size | `ai.assistant.test.ts`, `ai.intent.test.ts`                                                               |
| Information leakage                               | Generic 500s with a request id; stack traces and SQL only in server logs; `x-powered-by` removed                                                                                                                                  | `security.test.ts`, `errorHandler.test.ts`                                                                |
| Invalid characters crash queries                  | PostgreSQL "invalid character" errors (for example a NUL byte) map to `400 INVALID_CHARACTERS`                                                                                                                                    | `security.test.ts`                                                                                        |

## Secrets

- Real `.env` files are git-ignored; only `.env.example` files with placeholders are committed.
- The server validates its environment at startup and refuses a missing, short or placeholder
  `JWT_SECRET`.
- The client has **no secrets**: only `VITE_API_BASE_URL`, which is public by design.
- The optional `AI_API_KEY` is server-side only and is never included in error messages (tested).
- The seeded accounts (`admin@velo.local`, `user@velo.local`) and the local database password
  are for local development only.

## Known limitations

These are acceptable for a local portfolio project and documented honestly:

- **Payments are simulated.** No card or UPI data is collected or processed.
- **Rate-limit counters are kept in memory** per process, which is correct for one local process.
- **No email flows**: there's no email verification or password reset by email.
- **Images are stored on local disk** behind the `StorageProvider` interface.
