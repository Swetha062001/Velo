# Key decisions

Short records of the choices that shape VELO: what was decided, why, and what it costs.

### 1. Money is stored as integer paise

- **Why:** floating-point rupees drift (`0.1 + 0.2`). Integers make totals exact, and the database can enforce `price_paise > 0`.
- **Cost:** values are formatted at the edge (`formatPrice(549900)` → `₹5,499`).

### 2. The server owns every price, total and stock decision

- **Why:** anything the browser sends can be edited. Carts store only ids and quantities; totals are recomputed on every read and again inside the order transaction.
- **Cost:** a round trip to show a guest's bag total (`POST /cart/quote`), which is cheap.

### 3. Raw SQL with node-postgres, not an ORM

- **Why:** checkout needs explicit transactions, `SELECT … FOR UPDATE` in a fixed order, and full-text search. Plain parameterised SQL keeps that visible and reviewable. Migrations are plain `.sql` files with a small checksummed runner.
- **Cost:** row-to-object mapping is written by hand in repositories.

### 4. Sessions in an httpOnly cookie, with the role reloaded on every request

- **Why:** scripts can't read an httpOnly cookie, so an XSS bug can't steal the session. Reloading the user means role changes and password-change revocation (`token_version`) take effect immediately.
- **Cost:** one indexed lookup per authenticated request.

### 5. Orders: one transaction, an idempotency key and snapshots

- **Why:** a double-click, a retry or two shoppers racing for the last pair must never produce a wrong or duplicate order. Snapshots keep order history accurate after catalogue changes.
- **Cost:** more columns on `order_items`, and some care in the service code.

### 6. Colour at product level, sizes as variants

- **Why:** each colourway has its own photos and page, and shoppers choose a size on that page. Stock lives per size in `inventory`.
- **Cost:** colourways of the same shoe are separate products, linked by name.

### 7. Guest bag in the browser, merged on sign-in

- **Why:** shoppers can build a bag without an account; nothing is written server-side until they sign in. Stored items are sanitised and always re-priced by the server.
- **Cost:** a merge step, which reports anything it had to cap so the shopper isn't surprised.

### 8. A local, open model for the assistant, with rules in charge

- **Why:** it's free, private and works offline (Ollama + `qwen2.5:3b`). Small models are unreliable with numbers and facts, so deterministic rules extract budget, colour, gender and size, the database does retrieval, and the model only interprets vague wording and picks from a numbered list. Everything it writes is fact-checked. Providers sit behind one interface, so a hosted model is a configuration change.
- **Cost:** replies take about 5–9 seconds on a laptop, and wording is simpler than a large hosted model's.

### 9. Admin screens are lazy-loaded behind the guard

- **Why:** customers never download admin code. `React.lazy` loads a chunk only when the component renders (after the role check); the router's `lazy` would preload every matched route.
- **Cost:** a short spinner the first time an admin opens a screen.

### 10. Design tokens, not ad-hoc colours

- **Why:** one theme file (`theme.css`) with semantic tokens gives a consistent brand, makes dark mode a token swap rather than a rewrite, and lets contrast be checked once. Tailwind's default palette is reset so off-brand classes don't exist.
- **Cost:** new colours need a token, which is the point.

### 11. Separate databases for dev, API tests and end-to-end tests

- **Why:** tests reset their database on every run and must never touch development data. The test runners refuse to start unless the database name contains `test` or `e2e`.
- **Cost:** a one-time `createdb` for each database.

### 12. Port 5001 for the API

- **Why:** on macOS, AirPlay Receiver listens on port 5000.
- **Cost:** none; `PORT` is configurable.
