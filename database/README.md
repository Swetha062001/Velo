# VELO database

PostgreSQL schema, migrations and seed data. Everything runs against a **local** PostgreSQL
server — no cloud database is required.

```
database/
├── migrations/   Plain SQL, applied in filename order (0001_…, 0002_…)
└── seeds/        Demo catalogue data (JSON), loaded by `npm run db:seed`
```

The runner scripts live in `server/src/db/` because they reuse the server's config and
password hashing.

## 1. Requirements

- PostgreSQL **13 or newer** (developed on 18). No extensions are required.
- On macOS with Homebrew:

  ```bash
  brew install postgresql@18
  brew services start postgresql@18
  ```

Check it is running:

```bash
psql -d postgres -c "select version();"
```

## 2. Create the database user and databases (one time)

```bash
psql -d postgres -c "CREATE ROLE velo WITH LOGIN PASSWORD 'velo_dev_password';"
psql -d postgres -c "CREATE DATABASE velo_dev OWNER velo;"
psql -d postgres -c "CREATE DATABASE velo_test OWNER velo;"
psql -d postgres -c "CREATE DATABASE velo_e2e OWNER velo;"
```

| Database    | Used by                                                               |
| ----------- | --------------------------------------------------------------------- |
| `velo_dev`  | The app during local development                                      |
| `velo_test` | The automated test suite (rebuilt on every `npm test` run)            |
| `velo_e2e`  | End-to-end browser tests (reset + seeded on every `npm run test:e2e`) |

`velo` is a regular (non-superuser) role that owns only these databases; it cannot create new ones.
`velo_dev_password` is a **development-only** password.

## 3. Environment variables

In `server/.env` (copied from `server/.env.example`):

| Variable            | Example                                                      | Purpose                 |
| ------------------- | ------------------------------------------------------------ | ----------------------- |
| `DATABASE_URL`      | `postgres://velo:velo_dev_password@localhost:5432/velo_dev`  | App + `db:*` commands   |
| `TEST_DATABASE_URL` | `postgres://velo:velo_dev_password@localhost:5432/velo_test` | Tests + `db:reset:test` |

Format: `postgres://USER:PASSWORD@HOST:PORT/DATABASE`. Both are secrets in any real
environment — never commit `server/.env`.

## 4. Commands

Run from the project root:

| Command                 | What it does                                                             |
| ----------------------- | ------------------------------------------------------------------------ |
| `npm run db:migrate`    | Apply pending migrations to `velo_dev`                                   |
| `npm run db:status`     | List migrations: `applied`, `pending`, `modified` or `missing-file`      |
| `npm run db:seed`       | Load demo data into an **empty** database (refuses if data exists)       |
| `npm run db:reset`      | **Deletes everything** in `velo_dev`, re-runs all migrations, then seeds |
| `npm run db:reset:test` | Same as reset, against `velo_test`                                       |

First-time setup:

```bash
npm run db:migrate
npm run db:seed
```

Start over at any time (all local data is lost):

```bash
npm run db:reset
```

`db:seed` and `db:reset` refuse to run when `NODE_ENV=production`.

## 5. Migrations

- Files are named `NNNN_description.sql` (4-digit, lowercase, underscores) and run in order.
- Each file runs inside its own transaction — a failing migration leaves no partial changes.
- Applied migrations are recorded in `schema_migrations` with a SHA-256 checksum.
- **Never edit a migration that has been applied.** The runner detects the checksum change and
  stops. Add a new migration (`0002_…sql`) instead. In local development only, `db:reset` is the
  escape hatch.
- Migrations are forward-only (no "down" scripts); `db:reset` rebuilds from scratch locally.
- Only standard PostgreSQL is used, so the same files run on Supabase later.

## 6. Seed data

`npm run db:seed` loads:

- **5 categories:** Running, Lifestyle, Training, Basketball, Slides & Sandals
- **20 fictional VELO products** (19 active, 1 draft) with original descriptions, prices in INR,
  colour, colourway, material, gender and tags
- **2–3 images per product** and a cover image per category (Unsplash URLs)
- **6 UK sizes per product** (SKU per size) with deterministic stock — some sizes are low or sold
  out on purpose so stock handling is visible
- **2 development accounts** and a default address for the customer

Edit `seeds/categories.json` / `seeds/products.json` to change the catalogue. Prices are in whole
rupees there (`priceInr`) and stored as paise. The files are validated before anything is inserted.

Each product has 2–3 image URLs (`images` in `products.json`) and each category a cover image
(`imageUrl`). They point at Unsplash; see the image credits in the root README.

### Development accounts

> ⚠️ **Local development only.** These accounts exist so you can sign in to a freshly seeded
> database. Never use these credentials in any real environment.

| Role  | Email              | Password         |
| ----- | ------------------ | ---------------- |
| Admin | `admin@velo.local` | `VeloAdmin#2026` |
| User  | `user@velo.local`  | `VeloUser#2026`  |

Passwords are stored as bcrypt hashes (cost 12), never in plain text.

## 7. Browsing the data

Any PostgreSQL client works (TablePlus, pgAdmin, DBeaver, `psql`):

```bash
psql "postgres://velo:velo_dev_password@localhost:5432/velo_dev"
```

Schema reference: [`docs/database/schema.md`](../docs/database/schema.md).

## Troubleshooting

| Problem                                                 | Fix                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| `ECONNREFUSED 127.0.0.1:5432`                           | PostgreSQL is not running: `brew services start postgresql@18` |
| `password authentication failed for user "velo"`        | Re-run step 2, or check the password in `DATABASE_URL`         |
| `database "velo_dev" does not exist`                    | Run the `CREATE DATABASE` commands in step 2                   |
| `Database already contains data`                        | Seed only runs on an empty DB — use `npm run db:reset`         |
| `Migration … was modified after it was applied`         | Undo the edit and add a new migration (or `db:reset` locally)  |
| Health endpoint returns 503 / footer "Database offline" | The API is running but cannot reach PostgreSQL — see first row |
