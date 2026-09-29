# Wishlist API

Every endpoint requires authentication (`401 UNAUTHORIZED` otherwise) and acts only on the
signed-in user's own wishlist. A wishlist holds **products** (not sizes); a size is chosen when
moving an item to the bag.

## Wishlist object

Returned by every endpoint (newest first):

```json
{
  "data": {
    "items": [
      {
        "productId": "…",
        "addedAt": "2026-09-29T15:20:11.000Z",
        "available": true,
        "product": { "…": "same shape as a product list item (see catalog.md)" },
        "variants": [
          {
            "id": "…",
            "sizeLabel": "UK 8",
            "sku": "VELO-STCR-WHT-08",
            "pricePaise": 399900,
            "stockStatus": "in_stock"
          }
        ]
      }
    ],
    "count": 1
  }
}
```

- `available: false` — the product was archived or hidden after it was saved. It stays listed so
  the shopper can see what changed; `variants` is empty and it can't be moved to the bag.
- Stock is reported only as `stockStatus` (`in_stock` / `low_stock` / `out_of_stock`).

## `GET /wishlist`

**200** — Wishlist object.

## `POST /wishlist` — save a product

**Body** — `{ "productId": uuid }`. Idempotent: saving twice keeps one entry.

**200** — updated wishlist.

| Status | `code`             | When                               |
| ------ | ------------------ | ---------------------------------- |
| 400    | `VALIDATION_ERROR` | Invalid id                         |
| 404    | `NOT_FOUND`        | Unknown, draft or archived product |
| 409    | `WISHLIST_FULL`    | Already 100 saved products         |

## `DELETE /wishlist/:productId`

Idempotent. **200** — updated wishlist.

## `POST /wishlist/:productId/move-to-cart`

Adds one unit of the chosen size to the bag, then removes the product from the wishlist. Uses the
same stock and price rules as `POST /cart/items`; if the add fails, the wishlist is unchanged.

**Body** — `{ "variantId": uuid }` (must be a size of this product)

**200**

```json
{ "data": { "cart": { "…": "Cart object (see cart.md)" }, "wishlist": { "…": "Wishlist object" } } }
```

| Status | `code`                                                                                 | When                            |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------- |
| 400    | `BAD_REQUEST` (`details[0].path = "body.variantId"`)                                   | Size belongs to another product |
| 404    | `NOT_FOUND`                                                                            | Product isn't in your wishlist  |
| 409    | `OUT_OF_STOCK` / `INSUFFICIENT_STOCK` / `QUANTITY_LIMIT` / `UNAVAILABLE` / `CART_FULL` | Same as cart add                |
