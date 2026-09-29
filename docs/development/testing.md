# Testing & QA

VELO is tested at three levels. Everything runs locally; no external services are needed.

| Level      | Tooling                               | Where                    | Command              |
| ---------- | ------------------------------------- | ------------------------ | -------------------- |
| API        | Vitest + Supertest, real PostgreSQL   | `server/tests/`          | `npm test -w server` |
| Client     | Vitest + Testing Library (jsdom)      | `client/src/**/*.test.*` | `npm test -w client` |
| End-to-end | Playwright (system Chrome) + axe-core | `e2e/`                   | `npm run test:e2e`   |

`npm test` runs the API and client suites. Coverage: `npm run test:coverage -w server`
(or `-w client`), HTML report in `coverage/`.

## Databases

Each level uses its own database, so tests never touch development data:

| Database    | Used by       | Reset                                                      |
| ----------- | ------------- | ---------------------------------------------------------- |
| `velo_dev`  | `npm run dev` | only by `npm run db:reset`                                 |
| `velo_test` | API tests     | schema rebuilt before every run (name must contain `test`) |
| `velo_e2e`  | Playwright    | reset + seeded before every run (name must contain `e2e`)  |

One-time setup for end-to-end tests: `createdb -O velo velo_e2e`.

## API tests (`server/tests/`)

Run against a real PostgreSQL database — transactions, constraints, locking and raw SQL are
exercised exactly as in the app. Highlights:

- **Money & orders** — server-side totals, price snapshots, idempotency (including two
  simultaneous submits), the last unit sold to only one of two customers, restock on cancel.
- **Security (`security.test.ts`)** — route lists are read from the routers, so every admin
  route is checked for 401 (signed out) and 403 (customer), and every customer route for 401;
  new routes are covered automatically. Also: IDOR (one customer reaching another's cart lines,
  addresses or orders), mass assignment (role/email via profile update), client-sent prices,
  forged/expired/wrong-issuer JWTs, SQL-injection and hostile input across query parameters,
  path traversal on `/uploads`, and no stack traces or SQL in error responses.
- **AI** — intent parsing, the rules fallback, hallucinated refs, invalid JSON, price claims in
  model text, prompt injection, and both HTTP providers against a stubbed `fetch`.

## Client tests

Logic and components with the highest risk: open-redirect protection (`safeRedirect`), the API
client, guest-cart sanitising of tampered `localStorage`, the theme store, the merge notice,
assistant filters, the login form (validation, accessible errors, server errors) and route
guards. Pages as a whole are covered by the end-to-end suite rather than unit tests.

## End-to-end tests (`e2e/`)

`npm run test:e2e` starts an API on :5002 and the client on :5174 against `velo_e2e`, with the
AI in deterministic smart-search mode. Report: `npm run test:e2e:report`.

- **shopping** — guest browses, adds a size, is sent to sign-up at checkout, orders; an admin
  processes and ships it; the customer sees "Shipped". Runs at desktop and phone size.
- **access** — redirects for guests, 403 page and API refusal for customers, no off-site
  redirects after sign-in, httpOnly session cookie.
- **assistant** — recommendations are real products within the budget.
- **a11y** — axe-core WCAG 2.1 A/AA scan of 7 pages in light and dark themes; fails on serious
  or critical issues.
- **keyboard** — skip link, focus trapping and Escape in dialogs, choosing a size and adding to
  the bag without a mouse.

## Phase 14 QA findings (fixed)

| Finding                                                                                       | Fix                                                                                     |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A NUL character (`\u0000`) in any text input caused a 500 (PostgreSQL rejects it)             | Error handler maps PostgreSQL "invalid character" errors to `400 INVALID_CHARACTERS`    |
| `?redirect=/%09/evil.com` passed the open-redirect check (browsers strip tabs → `//evil.com`) | `safeRedirect` parses the value like the browser and requires the same origin           |
| Colour contrast below WCAG AA: old prices and captions (3.3:1), SALE badge (4.4:1)            | `ink-subtle` and `accent-soft` tokens adjusted to ≥ 4.5:1 on every surface, both themes |
| Clicking "Create an account" right after the sign-in page loaded did nothing                  | Auth forms validate on submit, not on blur of the auto-focused field (no layout jump)   |

## Manual checks (before a release)

- Assistant with the real local model (`AI_PROVIDER=ollama`): a vague request, a follow-up,
  and a prompt-injection attempt.
- Image upload in the admin product editor (drag-and-drop, reorder, delete).
- Screen reader pass (VoiceOver: <kbd>Cmd</kbd>+<kbd>F5</kbd>) of product → bag → checkout.
