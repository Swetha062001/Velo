# VELO

AI-powered full-stack ecommerce platform for a fictional premium sneaker brand.

> **Status:** Phase 1 — project foundation. This README grows with each phase; the complete
> version (API overview, AI architecture, testing, troubleshooting) lands in Phase 15.

## Technology stack

| Layer    | Tech                                                              |
| -------- | ----------------------------------------------------------------- |
| Client   | React 19, TypeScript, Vite, Tailwind CSS v4                       |
| Server   | Node.js, Express 5, TypeScript, Zod, Helmet, CORS                 |
| Database | PostgreSQL (local) — added in Phase 4                             |
| Tooling  | npm workspaces, ESLint (flat config), Prettier, tsx, concurrently |

## Prerequisites

- **Node.js ≥ 22.22** (developed on Node 26) and npm ≥ 10
- **PostgreSQL** (needed from Phase 4 onwards)

## Installation

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

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

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Start client and server together (watch mode) |
| `npm run dev:client` | Start only the Vite client                    |
| `npm run dev:server` | Start only the API                            |
| `npm run build`      | Production build of both workspaces           |
| `npm run typecheck`  | TypeScript check across both workspaces       |
| `npm run lint`       | ESLint over the whole repo                    |
| `npm run format`     | Format with Prettier                          |

## Environment variables

Real `.env` files are git-ignored. Only the `.env.example` files are committed.

### `server/.env`

| Variable      | Purpose                                               | Example                 | Secret | Where to obtain      |
| ------------- | ----------------------------------------------------- | ----------------------- | ------ | -------------------- |
| `PORT`        | Port the API listens on                               | `5001`                  | No     | Choose any free port |
| `NODE_ENV`    | Runtime mode: `development` \| `test` \| `production` | `development`           | No     | —                    |
| `CORS_ORIGIN` | Exact frontend origin allowed to call the API         | `http://localhost:5173` | No     | The client dev URL   |

The server validates these at startup and exits with a clear message if any are invalid.

### `client/.env`

| Variable            | Purpose             | Example                        | Secret                                                               |
| ------------------- | ------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL of the API | `http://localhost:5001/api/v1` | **No — everything in the client is public. Never put secrets here.** |

Further variables (database, auth, AI) are added and documented in the phase that introduces them.

## Theme

All colours, fonts and radii live in **`client/src/styles/theme.css`**. Components use semantic
utilities only — `bg-canvas`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-line`,
`bg-accent`, `bg-inverse`, `text-danger`, etc. Tailwind's default palette is intentionally reset, so
off-brand classes such as `bg-blue-500` do not exist. A dark palette is already defined behind
`<html data-theme="dark">`.

## Project structure

```
velo/
├── client/          React + Vite storefront and admin
├── server/          Express API (feature modules under src/modules)
├── eslint.config.js Shared lint config
└── package.json     npm workspaces + root scripts
```

`database/` and `docs/` are added in the phases that populate them.

## Deployment

Not yet — VELO currently runs fully locally. Deployment will be documented after the local
application is complete and tested.
