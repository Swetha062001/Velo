# Catalogue API — products & categories

All endpoints are public (no authentication). Only `ACTIVE` products in active categories are
ever returned; drafts and archived products behave as if they don't exist (404).

Money is in **paise**. Price _filters_ in the query string are whole **rupees** for readable URLs.

---

## `GET /products`

List, search, filter, sort and paginate products.

**Query parameters** (all optional; empty values are ignored)

| Param      | Type / values                                                        | Example             | Notes                                                                                         |
| ---------- | -------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| `q`        | text, ≤ 100 chars                                                    | `q=white everyday`  | Prefix search over name, colourway, colour, material, description and tags. Words are AND-ed. |
| `category` | category slug                                                        | `category=running`  |                                                                                               |
| `gender`   | `men` \| `women` \| `unisex`                                         | `gender=women`      | `men` / `women` include unisex styles                                                         |
| `color`    | comma-separated colour families                                      | `color=white,black` | OR within the list                                                                            |
| `size`     | comma-separated UK sizes                                             | `size=9,10`         | Only matches products **in stock** in one of those sizes                                      |
| `minPrice` | integer rupees                                                       | `minPrice=3000`     |                                                                                               |
| `maxPrice` | integer rupees                                                       | `maxPrice=5000`     | Must be ≥ `minPrice`                                                                          |
| `featured` | `true`                                                               | `featured=true`     |                                                                                               |
| `inStock`  | `true`                                                               | `inStock=true`      | At least one size in stock                                                                    |
| `sort`     | `featured` \| `newest` \| `price-low` \| `price-high` \| `relevance` | `sort=price-low`    | Default: `relevance` when `q` is set, else `featured`                                         |
| `page`     | integer ≥ 1                                                          | `page=2`            | Default 1                                                                                     |
| `limit`    | 1–48                                                                 | `limit=12`          | Default 12                                                                                    |

Example: `/products?category=running&maxPrice=5000&size=9&sort=price-low`

**200**

```json
{
  "data": [
    {
      "id": "…",
      "slug": "velo-pulse-runner-triple-white",
      "name": "VELO Pulse Runner",
      "colorway": "Triple White",
      "color": "white",
      "gender": "UNISEX",
      "category": { "slug": "running", "name": "Running" },
      "pricePaise": 549900,
      "compareAtPricePaise": null,
      "isFeatured": true,
      "inStock": true,
      "images": [
        {
          "url": "https://images.unsplash.com/photo-…",
          "alt": "VELO Pulse Runner in Triple White, view 1"
        }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 19, "totalPages": 2, "sort": "featured" }
}
```

`images` holds at most two entries (primary + hover). A page past the end returns `data: []`
with the real `total`.

**Errors** — `400 VALIDATION_ERROR` (e.g. `query.limit`, `query.sort`, `query.size.0`, `query.maxPrice`).

---

## `GET /products/:slug`

**200** — everything in a list item, plus:

| Field                                      | Description                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `description`, `material`, `brand`, `tags` | Product copy                                                               |
| `images`                                   | All images, in display order                                               |
| `variants`                                 | `[{ id, sizeLabel: "UK 9", sku, pricePaise, stockStatus }]`                |
| `colorways`                                | Other colourways of the same model: `[{ slug, colorway, color, image }]`   |
| `related`                                  | Up to 4 products from the same category (different model), list-item shape |

`stockStatus` is `in_stock`, `low_stock` (at or below the admin threshold) or `out_of_stock`.
Exact stock quantities are never exposed publicly. `pricePaise` on a variant is the effective
price for that size.

**Errors** — `400` invalid slug format · `404 NOT_FOUND` unknown, draft or archived product.

---

## `GET /products/facets`

Values for building filter UI (based on visible products).

```json
{
  "data": {
    "colors": [
      { "value": "black", "count": 5 },
      { "value": "white", "count": 5 }
    ],
    "sizes": ["UK 3", "UK 4", "…", "UK 11"],
    "genders": [
      { "value": "MEN", "count": 6 },
      { "value": "WOMEN", "count": 4 },
      { "value": "UNISEX", "count": 9 }
    ],
    "priceRange": { "minPaise": 149900, "maxPaise": 949900 }
  }
}
```

---

## `GET /categories`

Active categories in display order, with the number of active products.

```json
{
  "data": [
    {
      "id": "…",
      "name": "Running",
      "slug": "running",
      "description": "Responsive cushioning…",
      "imageUrl": "https://images.unsplash.com/photo-…",
      "productCount": 5
    }
  ]
}
```

## `GET /categories/:slug`

One category (same shape). **Errors** — `404 NOT_FOUND`.
