# VELO

AI-powered full-stack ecommerce platform for a fictional premium sneaker brand.

> **Status:** Phase 8 — wishlist. This README grows with each phase; the complete
> version (API overview, AI architecture, testing, troubleshooting) lands in Phase 15.

## Technology stack

| Layer    | Tech                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| Client   | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, Zustand, React Hook Form, Zod, Lucide |
| Server   | Node.js, Express 5, TypeScript, Zod, Helmet, CORS, express-rate-limit, jsonwebtoken, cookie-parser               |
| Database | PostgreSQL 13+ (local), node-postgres (`pg`), plain SQL migrations, bcryptjs                                     |
| Tooling  | npm workspaces, ESLint (flat config), Prettier, tsx, concurrently, Vitest, Supertest                             |

## Prerequisites

- **Node.js ≥ 22.22** (developed on Node 26) and npm ≥ 10
- **PostgreSQL 13+** running locally (developed on 18) — see [`database/README.md`](database/README.md)

## Installation

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

## Database setup

Full guide: [`database/README.md`](database/README.md). Short version:

```bash
psql -d postgres -c "CREATE ROLE velo WITH LOGIN PASSWORD 'velo_dev_password';"
psql -d postgres -c "CREATE DATABASE velo_dev OWNER velo;"
psql -d postgres -c "CREATE DATABASE velo_test OWNER velo;"
npm run db:migrate
npm run db:seed
```

Development accounts (local only — never use elsewhere):

| Role  | Email              | Password         |
| ----- | ------------------ | ---------------- |
| Admin | `admin@velo.local` | `VeloAdmin#2026` |
| User  | `user@velo.local`  | `VeloUser#2026`  |

## Running locally

```bash
npm run dev
```

| App    | URL                                 |
| ------ | ----------------------------------- |
| Client | http://localhost:5173               |
| API    | http://localhost:5001/api/v1        |
| Health | http://localhost:5001/api/v1/health |

> **Why 5001 and not 5000?** On macOS, AirPlay Receiver (ControlCenter) listens on port 5000.
> The port is configurable via `PORT` in `server/.env` — keep `VITE_API_BASE_URL` in sync.

## Development commands

| Command              | What it does                                     |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start client and server together (watch mode)    |
| `npm run dev:client` | Start only the Vite client                       |
| `npm run dev:server` | Start only the API                               |
| `npm run build`      | Production build of both workspaces              |
| `npm run typecheck`  | TypeScript check across both workspaces          |
| `npm run lint`       | ESLint over the whole repo                       |
| `npm test`           | Run the test suites (server: Vitest + Supertest) |
| `npm run format`     | Format with Prettier                             |
| `npm run db:migrate` | Apply pending database migrations                |
| `npm run db:status`  | Show migration status                            |
| `npm run db:seed`    | Load demo data into an empty database            |
| `npm run db:reset`   | Drop, re-migrate and re-seed the dev database    |

## Environment variables

Real `.env` files are git-ignored. Only the `.env.example` files are committed.

### `server/.env`

| Variable            | Purpose                                               | Example                                                      | Secret  | Where to obtain                                   |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------ | ------- | ------------------------------------------------- |
| `PORT`              | Port the API listens on                               | `5001`                                                       | No      | Choose any free port                              |
| `NODE_ENV`          | Runtime mode: `development` \| `test` \| `production` | `development`                                                | No      | —                                                 |
| `CORS_ORIGIN`       | Exact frontend origin allowed to call the API         | `http://localhost:5173`                                      | No      | The client dev URL                                |
| `DATABASE_URL`      | PostgreSQL connection for the app and `db:*` commands | `postgres://velo:velo_dev_password@localhost:5432/velo_dev`  | **Yes** | Created in [database setup](database/README.md)   |
| `TEST_DATABASE_URL` | Separate database for tests; wiped on every test run  | `postgres://velo:velo_dev_password@localhost:5432/velo_test` | **Yes** | Created in [database setup](database/README.md)   |
| `JWT_SECRET`        | Signs session tokens. Min 32 random characters        | output of `openssl rand -base64 48`                          | **Yes** | Generate locally; never reuse across environments |

The server validates these at startup and exits with a clear message if any are invalid.

### `client/.env`

| Variable            | Purpose             | Example                        | Secret                                                               |
| ------------------- | ------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL of the API | `http://localhost:5001/api/v1` | **No — everything in the client is public. Never put secrets here.** |

Further variables (AI, image storage) are added and documented in the phase that introduces them.

## Authentication

- Email + password accounts; passwords hashed with **bcrypt** (cost 12).
- Session = signed **JWT (HS256)** in an **httpOnly, SameSite=Lax** cookie named `velo_session`
  (7 days). JavaScript can't read it, and it isn't sent on cross-site form posts.
- Every authenticated request re-loads the user from the database, so **roles are never trusted
  from the token or the client**. Changing the password bumps `token_version`, revoking all other
  sessions.
- Roles: `USER`, `ADMIN`. Authorization is enforced on the server (`authenticate`,
  `requireRole('ADMIN')`). The client's route guards (`RequireAuth`, `RequireAdmin`,
  `GuestOnly`) only decide what to render.
- Sign-in failures return one generic message; failed attempts are rate-limited.

API reference: [`docs/api/`](docs/api/README.md).

## Cart, pricing & wishlist

- **Server-calculated everything.** Clients send variant ids and quantities; the API returns line
  prices, subtotal, shipping (free from ₹2,999, otherwise ₹99) and total. Carts never store prices.
- **Guest bag** — signed-out shoppers' bags live in `localStorage` (ids + quantities only, via a
  small Zustand store) and are priced with `POST /cart/quote`. On sign-in the bag is merged into
  the account cart (`POST /cart/merge`) and cleared.
- **Stock-aware** — every add/update is checked against inventory; lines that become sold out or
  exceed stock are flagged and excluded from totals until fixed. Stock is reserved only at checkout.

**Wishlist** — signed-in only. Hearts on product cards and pages save instantly (optimistic, rolled
back on failure). A guest who taps a heart signs in and the product is then saved automatically.
"Move to bag" asks for a size and uses the same stock rules as the cart.

Rules live in `server/src/config/commerce.ts`; pricing logic in `server/src/modules/cart/cart.pricing.ts`.

## Theme

All colours, fonts and radii live in **`client/src/styles/theme.css`**. Components use semantic
utilities only — `bg-canvas`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-line`,
`bg-accent`, `bg-inverse`, `text-danger`, etc. Tailwind's default palette is intentionally reset, so
off-brand classes such as `bg-blue-500` do not exist. A dark palette is already defined behind
`<html data-theme="dark">`.

Shared UI primitives live in `client/src/components/common/` — `Button` / `ButtonLink`, `Input`,
`Badge`, `Spinner`, `Skeleton`, `EmptyState`, `ErrorState`. Build new UI from these rather than
restyling raw elements.

## Frontend architecture

| Concern      | Location                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| Routes       | `client/src/routes/router.tsx` (admin is lazy-loaded); URLs in `routes/paths.ts` |
| Layouts      | `client/src/layouts/` — Root, Storefront, Account, Admin                         |
| API calls    | `client/src/lib/apiClient.ts` (fetch wrapper, cookies, typed `ApiError`)         |
| Server state | TanStack Query — `lib/queryClient.ts`; feature calls in `services/` + `hooks/`   |
| Navigation   | `client/src/config/navigation.ts`                                                |
| Page titles  | `<DocumentTitle>` — one per page (React 19 hoists `<title>`)                     |

## Project structure

```
velo/
├── client/          React + Vite storefront and admin
├── server/          Express API (feature modules under src/modules, tests under tests/)
├── database/        SQL migrations + seed data
├── docs/            Architecture and development docs
├── eslint.config.js Shared lint config
└── package.json     npm workspaces + root scripts
```

Backend structure and rules (layers, responses, errors, validation, logging) are documented in
[`docs/development/backend-conventions.md`](docs/development/backend-conventions.md). Database design: [`docs/database/schema.md`](docs/database/schema.md).

## Image credits

Demo product and category photography is loaded from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license). VELO is a fictional brand; some photos show
real third-party products and logos and are used purely as placeholder imagery for this portfolio
project. Replace them with original photography before any real use.

## Deployment

Not yet — VELO currently runs fully locally. Deployment will be documented after the local
application is complete and tested.
