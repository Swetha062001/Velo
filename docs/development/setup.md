# Setup guide

Everything you need to run VELO on your own machine, from a fresh clone. Commands assume macOS
with [Homebrew](https://brew.sh); Linux works the same with your package manager.

## 1. Prerequisites

| Tool       | Version                       | Check            | Install (macOS)                                                   |
| ---------- | ----------------------------- | ---------------- | ----------------------------------------------------------------- |
| Node.js    | ≥ 22.22 (developed on 26)     | `node -v`        | `brew install node`                                               |
| npm        | ≥ 10                          | `npm -v`         | comes with Node                                                   |
| PostgreSQL | ≥ 13 (developed on 18)        | `psql --version` | `brew install postgresql@18 && brew services start postgresql@18` |
| Chrome     | any recent (end-to-end tests) | —                | [google.com/chrome](https://www.google.com/chrome/)               |
| Ollama     | optional (AI assistant)       | `ollama -v`      | see [step 6](#6-optional-local-ai-model)                          |

## 2. Install dependencies

```bash
cd velo
npm install
```

One install covers both workspaces (`client/`, `server/`).

## 3. Create the database user and databases

```bash
psql -d postgres -c "CREATE ROLE velo WITH LOGIN PASSWORD 'velo_dev_password';"
createdb -O velo velo_dev     # the app
createdb -O velo velo_test    # API tests (rebuilt on every run)
createdb -O velo velo_e2e     # end-to-end tests (reset on every run)
```

These credentials are for local development only. Details and alternatives (a different user or
password, a custom port): [`database/README.md`](../../database/README.md).

## 4. Configure environment files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Then set a real session secret in `server/.env`:

```bash
openssl rand -base64 48      # paste the output as JWT_SECRET=...
```

The server refuses to start with the placeholder value. Every variable is described in
[Environment variables](#environment-variables) below.

## 5. Create the schema, load demo data, run

```bash
npm run db:migrate     # create tables
npm run db:seed        # 5 categories, 20 products, 120 sizes, 2 accounts
npm run dev            # API on :5001 and client on :5173, both in watch mode
```

Open **http://localhost:5173**. The footer shows **API online** in development when the client can
reach the server.

| Account  | Email              | Password         |
| -------- | ------------------ | ---------------- |
| Admin    | `admin@velo.local` | `VeloAdmin#2026` |
| Customer | `user@velo.local`  | `VeloUser#2026`  |

Admins land on `/admin` after signing in. Payments are simulated; no card details are collected.

## 6. (Optional) Local AI model

The assistant works without any model ("Smart search mode"). To use a free, open model running on
your machine:

```bash
brew install ollama
brew services start ollama
ollama pull qwen2.5:3b          # ~1.9 GB, one time
```

In `server/.env` set `AI_PROVIDER=ollama` (and optionally `AI_MODEL=qwen2.5:3b`), then restart
`npm run dev`. The assistant panel shows **Local AI · qwen2.5:3b** when the model is reachable.
Larger models (`qwen2.5:7b`, `llama3.1:8b`) give better wording and take longer.

To remove it later: `brew services stop ollama && brew uninstall ollama && rm -rf ~/.ollama`.

## 7. Verify

```bash
npm run typecheck && npm run lint
npm test                 # API + client
npm run test:e2e         # browser tests; starts its own servers on :5002 / :5174
```

See [testing.md](testing.md) for what each suite covers.

## Environment variables

Real `.env` files are git-ignored; only the `.env.example` files are committed. The server
validates its variables at startup and exits with a clear message if any are missing or invalid.

### `server/.env`

| Variable            | Purpose                                                                    | Default / example                                            | Secret  |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| `PORT`              | Port the API listens on                                                    | `5001`                                                       | No      |
| `NODE_ENV`          | `development` \| `test` \| `production`                                    | `development`                                                | No      |
| `CORS_ORIGIN`       | Exact client origin allowed to call the API with cookies                   | `http://localhost:5173`                                      | No      |
| `DATABASE_URL`      | PostgreSQL connection for the app and `db:*` commands                      | `postgres://velo:velo_dev_password@localhost:5432/velo_dev`  | **Yes** |
| `TEST_DATABASE_URL` | Database for the API tests (wiped on every run)                            | `postgres://velo:velo_dev_password@localhost:5432/velo_test` | **Yes** |
| `JWT_SECRET`        | Signs session tokens; ≥ 32 random characters                               | output of `openssl rand -base64 48`                          | **Yes** |
| `UPLOAD_DIR`        | Folder for uploaded images (relative to `server/` or absolute)             | `uploads`                                                    | No      |
| `PUBLIC_SERVER_URL` | Public origin of the API, used in image URLs                               | `http://localhost:PORT`                                      | No      |
| `AI_PROVIDER`       | `mock` (rules only) \| `ollama` (local model) \| `openai` (compatible API) | `mock`                                                       | No      |
| `AI_MODEL`          | Model name                                                                 | `qwen2.5:3b` (Ollama)                                        | No      |
| `AI_BASE_URL`       | Provider URL                                                               | `http://localhost:11434` (Ollama)                            | No      |
| `AI_API_KEY`        | Only for hosted OpenAI-compatible providers; server-side only              | —                                                            | **Yes** |
| `AI_TIMEOUT_MS`     | Per-call model timeout (1,000–120,000)                                     | `30000`                                                      | No      |

### `client/.env`

| Variable            | Purpose             | Example                        |
| ------------------- | ------------------- | ------------------------------ |
| `VITE_API_BASE_URL` | Base URL of the API | `http://localhost:5001/api/v1` |

Everything in the client is public, because it ships to the browser. **Never put secrets in
`client/.env`.**

## Troubleshooting

| Symptom                                                            | Cause and fix                                                                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Footer says **API offline**                                        | Only the client is running. Start both with `npm run dev` from the repo root (not inside `client/`).                                                          |
| Server exits: `JWT_SECRET … placeholder`                           | Replace it with the output of `openssl rand -base64 48`.                                                                                                      |
| `role "velo" does not exist` / `database … does not exist`         | Run the commands in [step 3](#3-create-the-database-user-and-databases).                                                                                      |
| `relation "products" does not exist`                               | Run `npm run db:migrate`, then `npm run db:seed`.                                                                                                             |
| Port 5000 or 5001 already in use                                   | On macOS, AirPlay Receiver uses 5000, which is why the API uses 5001. To change it, set `PORT` in `server/.env` **and** `VITE_API_BASE_URL` in `client/.env`. |
| Requests fail with a CORS error after changing ports               | `CORS_ORIGIN` must exactly match the client URL, including the port.                                                                                          |
| Assistant shows **Smart search mode** with Ollama installed        | Ollama isn't running or the model isn't pulled: `brew services start ollama`, then `ollama pull qwen2.5:3b`. Also check `AI_PROVIDER=ollama`.                 |
| `npm run test:e2e` fails with `database "velo_e2e" does not exist` | `createdb -O velo velo_e2e`.                                                                                                                                  |
| Start over with fresh demo data                                    | `npm run db:reset` (drops and recreates everything in `velo_dev`).                                                                                            |
