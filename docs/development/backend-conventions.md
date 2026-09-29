# Backend conventions

How every VELO API feature is structured. Follow this for each new module.

## Layers

```
Route  →  Controller  →  Service  →  Repository  →  PostgreSQL
```

| Layer          | File              | Responsibility                                                                       | Must NOT                                   |
| -------------- | ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| **Route**      | `x.routes.ts`     | URL + method, middleware chain (`authenticate`, `requireRole`, `validate`, limiters) | contain logic                              |
| **Controller** | `x.controller.ts` | Read validated input from `req`, call a service, send a response via `utils/respond` | touch the database, contain business rules |
| **Service**    | `x.service.ts`    | Business rules: pricing, stock checks, permissions on data, transactions             | know about `req`/`res`                     |
| **Repository** | `x.repository.ts` | Parameterised SQL only; maps rows to typed objects                                   | contain business rules                     |
| **Schemas**    | `x.schemas.ts`    | Zod schemas for params / query / body                                                | —                                          |

Small modules may skip a layer that would be empty (e.g. `health` has no repository yet).

## Module layout

```
server/src/modules/<feature>/
├── <feature>.routes.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
└── <feature>.schemas.ts
```

Register the router in `server/src/routes.ts`. Shared-only code lives outside modules:
`config/`, `middleware/`, `utils/`, `schemas/common.ts`, `types/`.

## Responses

- Success: `{ "data": ..., "meta"?: {...} }` — always via `ok()`, `created()`, `noContent()`.
- Error: `{ "error": { "code", "message", "details"? } }` — produced **only** by
  `middleware/errorHandler.ts`. Throw `AppError.*` from services; never `res.status(4xx)` by hand.
- Unexpected errors return a generic 500 with `requestId`; the full error is logged server-side.

| Status | Code                | When                       |
| ------ | ------------------- | -------------------------- |
| 400    | `VALIDATION_ERROR`  | Input failed a Zod schema  |
| 400    | `INVALID_JSON`      | Malformed JSON body        |
| 401    | `UNAUTHORIZED`      | Not signed in              |
| 403    | `FORBIDDEN`         | Signed in, not allowed     |
| 404    | `NOT_FOUND`         | Missing resource or route  |
| 409    | `CONFLICT`          | Duplicate / state conflict |
| 413    | `PAYLOAD_TOO_LARGE` | Body over 100 kb           |
| 429    | `RATE_LIMITED`      | Rate limit exceeded        |
| 500    | `INTERNAL_ERROR`    | Anything unexpected        |

## Validation

```ts
router.get('/', validate({ query: listProductsQuerySchema }), controller.list);
```

`validate()` checks params, query and body together, reports every issue at once, and replaces
them with the **parsed** values (trimmed, coerced, defaulted, unknown keys stripped). Type the
controller with `Request<Params, unknown, Body, Query>` using `z.infer<>`.

Unknown body keys are stripped — a client can never smuggle in `price`, `role` or `total`.

## Async errors

Express 5 forwards rejected promises to the error handler, so handlers can be plain
`async` functions — no `asyncHandler` wrapper or `try/catch` just to call `next(err)`.

## Logging

Use `utils/logger.ts` (`logger.info/warn/error`), never `console.log`. Every request is logged
with its `requestId`, which is also returned in the `X-Request-Id` header.

## Tests

`server/tests/*.test.ts` with Vitest + Supertest. Run `npm test`.

- Tests use a fixed environment from `server/vitest.config.ts`; only `TEST_DATABASE_URL` is read
  from `server/.env`.
- Before the suite, `tests/globalSetup.ts` drops and re-migrates the test database (it refuses to
  touch a database whose name doesn't contain `test`).
- Files run sequentially because they share one database. Use `tests/helpers/db.ts`:
  `truncateAll()` for a clean slate, `inRollback()` for tests that must leave no data behind.

## Database access

- Repositories use `query()` from `src/db/index.ts` with **parameterised** SQL (`$1, $2 …`).
  Never build SQL by string-concatenating input.
- Multi-step writes (e.g. placing an order) use `withTransaction()` in the service; repository
  functions accept an optional `Queryable` so they can join that transaction.
- Money is integer paise end to end.
