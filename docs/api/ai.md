# AI assistant API — `/ai/*`

Public (no sign-in). Runs on a **free, open model on your machine** via [Ollama](https://ollama.com)
by default; with no model available it answers in **smart search mode** (deterministic rules),
so the endpoint never fails because of the AI.

## How an answer is produced

1. **Understand** — deterministic rules extract the explicit constraints from the shopper's words:
   budget (`under 5k`, `between 4000 and 7000`, `around 6000`), gender (`for my sister`),
   colours (with synonyms: navy → blue), category, UK size. Only for vague requests
   (fewer than two constraints) is the model asked for a **category and descriptive keywords**.
   The model can never set price, colour, gender or size — small models invent them.
2. **Retrieve** — the server queries the catalogue itself (visible, in-stock products only).
   The model never touches the database. If nothing matches, constraints are relaxed in order
   size → colour → category → gender, and the budget only as a last resort; `relaxed` reports
   what was dropped and the reply says so.
3. **Rank** — deterministic scoring (keyword hits in tags / name / description, colour, category).
4. **Choose** — the top 12 are sent to the model as a numbered list (`P1…P12`); it returns up to
   four refs with short reasons. Output is schema-validated and **fact-checked**: unknown or
   duplicate refs are dropped; text with prices, offers ("free", "sale", "%"), internal refs, names
   of unpicked products, or the wrong colour is replaced with copy built from database facts.
5. **Respond** — every name, price, image and stock state comes from the database row.

Any provider error, timeout or invalid output falls back to steps 3–5 without the model.

## `POST /ai/assistant`

Rate limit: 40 requests / 15 minutes per IP (`429 RATE_LIMITED`).

| Field     | Type                                            | Notes                                                           |
| --------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `message` | string, 2–500 chars                             | Required                                                        |
| `history` | `[{ role: 'user' \| 'assistant', content }]`    | Optional, ≤ 6 turns, ≤ 800 chars each                           |
| `context` | partial `appliedFilters` from a previous answer | Optional; short follow-ups ("any cheaper?", "in black") keep it |

```json
{ "message": "any in black?", "context": { "category": "running", "maxPriceInr": 6000 } }
```

`200`

```json
{
  "data": {
    "reply": "Here is a pick for black running shoes under ₹6,000.",
    "recommendations": [
      {
        "product": {
          "id": "…",
          "slug": "velo-pulse-runner-midnight-black",
          "name": "VELO Pulse Runner",
          "pricePaise": 549900,
          "inStock": true,
          "…": "ProductSummary"
        },
        "reason": "Tonal black colourway that hides dust, with a cushioned daily-trainer ride."
      }
    ],
    "appliedFilters": {
      "keywords": [],
      "category": "running",
      "gender": null,
      "colors": ["black"],
      "minPriceInr": null,
      "maxPriceInr": 6000,
      "size": null
    },
    "relaxed": [],
    "source": "ai",
    "provider": "ollama"
  }
}
```

- `source` — `ai` when the model chose the products, `rules` for the deterministic fallback.
- `relaxed` — any of `size`, `colour`, `category`, `gender`, `price`.
- `400 VALIDATION_ERROR` for a missing/too long message or oversized history.

## `GET /ai/status`

```json
{ "data": { "provider": "ollama", "model": "qwen2.5:3b", "available": true } }
```

For Ollama, `available` checks that the server responds and the model is pulled (1.5 s timeout).
`mock` is always `available: false` (smart search mode).

## Providers

Code: `server/src/modules/ai/{providers,prompts,schemas,services}`. Every provider implements
`AIProvider.generateJson({ messages, schema })` and must return schema-valid data or throw.

| `AI_PROVIDER` | Backend                                                             | Default model / URL                          |
| ------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| `ollama`      | Local Ollama, native `/api/chat` with JSON-schema output            | `qwen2.5:3b` at `http://localhost:11434`     |
| `openai`      | Any OpenAI-compatible `/chat/completions` (LM Studio, vLLM, hosted) | `gpt-4o-mini` at `https://api.openai.com/v1` |
| `mock`        | No model — always uses the rules fallback (tests, CI)               | —                                            |
