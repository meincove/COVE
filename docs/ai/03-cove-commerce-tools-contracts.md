Nice, let’s lock this in as a proper spec file.

Here’s the full content for `docs/ai/03-cove-commerce-tools-contracts.md` based **exactly** on your current Pydantic models (`AgentIn/Out`, `AgentCartAddIn/Out`, `AgentItem`, commented `RecItem`), plus clearly marked “vNext” tools for checkout/orders/emails.

You can paste this directly into `docs/ai/03-cove-commerce-tools-contracts.md`.

---

# 03 – Cove Commerce Tools Contracts

*Last updated: 2025-11-30*
*Related: `01-current-capabilities.md`, `02-mcp-migration-plan.md`*

This document defines the **canonical tool contracts** for the Cove Commerce layer.

* These contracts are the **source of truth** for:

  * the internal `cove_ai_tools.*` functions,
  * the future **Cove Commerce MCP server**,
  * and any agent or code-execution environment that wants to call Cove tools.
* For now, the focus is on tools that already exist in some form:

  * Recommendations
  * Size & fit advice (shape based on current usage)
  * Cart add / cart get

Future tools (checkout, orders, emails) are specified as **vNext** and can be refined once the corresponding Django endpoints are final.

---

## 1. Naming & versioning

* All tools are namespaced as:
  `cove.<tool_name>` (e.g. `cove.recommend_products`).
* Input and output shapes are defined as **JSON objects**.
* Backwards-compatible changes:

  * You may **add optional fields**.
  * You must **not** change the meaning or type of existing fields.
* Breaking changes must bump an explicit version suffix (e.g. `cove.cart_add_v2`).

---

## 2. `cove.recommend_products`

### 2.1 Purpose

Return a ranked list of product variants that match a user’s browsing query and constraints.

This is the tool version of what `recs.py` + `/ai/recs/suggest` currently do, and what the agent wraps into `AgentItem` for `kind="recommendations"`.

### 2.2 Input: `RecommendProductsInput`

```jsonc
{
  "query": "black hoodie under 40",      // optional if anchor_slug present
  "anchor_slug": "hoodie-casual-fleece-59.99", // optional groupSlug for "similar to this"

  "tier": "casual",                      // optional; e.g. casual|originals|designer|limited
  "type": "hoodie",                      // optional; e.g. hoodie|tshirt|bomber
  "budget_min": 0,                       // optional
  "budget_max": 40,                      // optional
  "color": "black",                      // optional (color name, lowercase)
  "size": "M",                           // optional (size key: S|M|L|XL)
  "gender": "unisex",                    // optional; for future use

  "top_k": 8                             // required; number of results desired
}
```

**Notes / alignment with current code**

* `query` and `anchor_slug` map directly to the logic in `recs.py`:

  * if `anchor_slug` is present, the anchor product metadata is used as the base query;
  * otherwise `query` is used.
* `tier`, `type`, `color`, `size`, `budget_min`, `budget_max` correspond to the filter logic in `_matches_filters` and numeric filter parsing.
* `top_k` currently drives the `search_hybrid` / `search_keyword` top-k and final truncation.

All fields **except** `top_k` are optional.

### 2.3 Output: `RecommendProductsOutput`

```jsonc
{
  "items": [
    {
      "variantId": "CUHD001",                // meta.variantId if present
      "slug": "hoodie-casual-fleece-59.99",  // groupSlug / product slug
      "name": "Hoodie (Brushed Fleece)",     // product display name

      "tier": "casual",                      // e.g. casual|originals|designer|limited
      "type": "hoodie",                      // e.g. hoodie|tshirt|bomber
      "color": "black",                      // resolved color name (if any)
      "size": "M",                           // resolved or desired size, if applicable

      "price": 19.99,                        // base price (float)
      "score": 0.91,                         // final relevance score
      "reason": "Matches your query, color black, size M" // human-readable reason

      // (optional future fields)
      // "images": ["CUHD001-front.png", "CUHD001-back.png"],
      // "availability": { "S": 10, "M": 7, "L": 3, "XL": 20 }
    }
  ]
}
```

**Notes**

* This is essentially the union of `RecItem` (in `recs.py`) and `AgentItem` (in `agent.py`):

  * Both already have: `title/name`, `url`/`slug`, `score`, `reason`, `type`, `tier`, `color`, `size`, `variantId`.
* `name` is used instead of `title` to better match product naming elsewhere in the codebase.
* `score` is the final score (hybrid similarity + popularity + availability).
* `reason` is the user-facing explanation string currently built in recs.

---

## 3. `cove.get_size_fit_advice`

> **Status:** Shape based on current usage in `agent.py` (calls `/ai/fit/recommend`).
> Adjust if needed to match the actual fit service schema.

### 3.1 Purpose

Given body metrics, fit preference, and optionally product type/slug, return a recommended clothing size and supporting notes.

### 3.2 Input: `GetSizeFitAdviceInput`

```jsonc
{
  "height_cm": 175,              // optional, but strongly recommended
  "weight_kg": 70,               // optional, but strongly recommended

  "gender": "unisex",            // optional; e.g. male|female|unisex
  "fit_preference": "regular",   // optional; e.g. tight|regular|loose|oversized|slim

  "product_type": "hoodie",      // optional; e.g. hoodie|tshirt|bomber
  "slug": null                   // optional; product slug if advice is for a specific product
}
```

**Notes**

* `height_cm` and `weight_kg` are extracted by `_extract_body_metrics` in `agent.py`.
* `fit_preference` is inferred from text and/or the AI profile (`preferred_fit`).
* `product_type` is derived from parsed attributes (e.g. if user says “for this hoodie”).
* `slug` can be used later to provide product-specific advice (e.g. different fits per hoodie).

### 3.3 Output: `GetSizeFitAdviceOutput`

```jsonc
{
  "size": "M",                    // recommended size key
  "confidence": 0.82,             // 0–1 float

  "notes": [
    "Based on your height/weight and a regular fit preference, M is the safest option."
  ],

  // optional
  "warnings": [
    "If you prefer an oversize look, consider sizing up to L."
  ]
}
```

**Notes**

* `size` is the recommended size key (must be compatible with your catalog sizes: S/M/L/XL).
* `confidence` allows the agent / UI to phrase things cautiously when low.
* `notes` is an array of explanation strings for user-facing hints.
* `warnings` is optional; useful when the service detects edge cases (between sizes, unusual proportions).

---

## 4. `cove.cart_add`

### 4.1 Purpose

Add or increment a given product variant in the user’s cart.

This is the tool equivalent of `/ai/agent/cart_add` (and ultimately Django `/tools/cart.add`), driven today via `AgentCartAddIn` / `AgentCartAddOut`.

### 4.2 Input: `CartAddInput`

```jsonc
{
  "variantId": "CUHD001",        // required; unique variant identifier
  "size": "M",                   // required; size key
  "quantity": 1,                 // required; > 0

  "cartId": "optional-cart-id",  // optional; if omitted, backend may create a new cart
  "clerkUserId": "user_123",     // optional; if logged in
  "guestSessionId": "sess_456",  // optional; if guest
  "email": "user@example.com",   // optional; useful for later order/email flows

  "idempotencyKey": "uuid-xyz"   // optional; for safe retries
}
```

**Notes / alignment**

* This is exactly `AgentCartAddIn` from `agent.py`:

  * `variantId: str`
  * `size: str`
  * `quantity: int = 1`
  * `cartId`, `clerkUserId`, `guestSessionId`, `email`, `idempotencyKey` are all optional.
* **Idempotency**:

  * If provided, the backend should treat repeated calls with the same key as a no-op (return the same result), to guard against retry storms.

### 4.3 Output: `CartAddOutput`

```jsonc
{
  "ok": true,
  "message": "Item added to cart.",

  "cartId": "cart-uuid",         // convenience alias
  "cart": {
    // Full cart payload from backend (CartSerializer)
    "id": "cart-uuid",
    "items": [
      {
        "variantId": "CUHD001",
        "size": "M",
        "quantity": 2,
        "price": 19.99,
        "name": "Hoodie (Brushed Fleece)",
        "tier": "casual",
        "type": "hoodie",
        "color": "black",
        "subtotal": 39.98
      }
    ],
    "total": 39.98,
    "currency": "EUR"
  },

  "items": [
    // Simplified list of cart items, for frontend convenience
    {
      "variantId": "CUHD001",
      "size": "M",
      "quantity": 2,
      "price": 19.99,
      "name": "Hoodie (Brushed Fleece)",
      "tier": "casual",
      "type": "hoodie",
      "color": "black"
    }
  ]
}
```

**Notes / alignment**

* Directly matches `AgentCartAddOut`:

  * `ok: bool`
  * `message: str`
  * `cart: Dict[str, Any]`
  * `cartId: Optional[str]`
  * `items: List[Dict[str, Any]]`
* On error (`ok = false`):

  * `message` should contain a user-readable error (e.g. “No more stock for size M.”).
  * `cart` may be omitted or carry the previous valid state.

Error example:

```jsonc
{
  "ok": false,
  "message": "No more stock for size M.",
  "cartId": "cart-uuid",
  "cart": { /* unchanged cart */ },
  "items": [ /* simplified items from unchanged cart */ ]
}
```

---

## 5. `cove.cart_get`

### 5.1 Purpose

Fetch the **current cart** for a given user or session, for both UI and agent reasoning.

### 5.2 Input: `CartGetInput`

```jsonc
{
  "cartId": "cart-uuid",         // optional but preferred if known
  "clerkUserId": "user_123",     // optional
  "guestSessionId": "sess_456"   // optional
}
```

**Rules**

* At least **one** identifier (`cartId`, `clerkUserId`, or `guestSessionId`) must be provided.
* If multiple are provided:

  * `cartId` takes precedence (direct lookup).
  * Otherwise, user/session-based lookup may be implemented (e.g. “active cart for this user”).

### 5.3 Output: `CartGetOutput`

```jsonc
{
  "ok": true,
  "message": "Cart fetched.",

  "cartId": "cart-uuid",
  "items": [
    {
      "variantId": "CUHD001",
      "size": "M",
      "quantity": 2,
      "price": 19.99,
      "name": "Hoodie (Brushed Fleece)",
      "tier": "casual",
      "type": "hoodie",
      "color": "black",
      "subtotal": 39.98
    }
  ],
  "total": 39.98,
  "currency": "EUR"
}
```

Error example:

```jsonc
{
  "ok": false,
  "message": "No active cart found for this session.",
  "cartId": null,
  "items": [],
  "total": 0,
  "currency": "EUR"
}
```

---

## 6. vNext Tools (Checkout / Orders / Emails)

> These are **not implemented yet**, but this section defines rough contracts so the MCP server and agents can be designed with them in mind.

### 6.1 `cove.checkout_start` (vNext)

**Purpose:** Freeze current cart into a checkout session (totals, taxes, Stripe session, etc.).

**Input:**

```jsonc
{
  "cartId": "cart-uuid",
  "clerkUserId": "user_123",
  "guestSessionId": "sess_456",
  "email": "user@example.com"
}
```

**Output:**

```jsonc
{
  "ok": true,
  "message": "Checkout started.",
  "checkoutId": "chk_123",
  "total": 79.97,
  "currency": "EUR",
  "stripeClientSecret": "secret_if_applicable"
}
```

---

### 6.2 `cove.order_create_from_checkout` (vNext)

**Purpose:** After successful payment, convert checkout into a persistent order.

**Input:**

```jsonc
{
  "checkoutId": "chk_123",
  "paymentStatus": "paid",                 // e.g. paid|failed|canceled
  "paymentProvider": "stripe",
  "paymentReference": "pi_abc123",         // Stripe payment intent ID
  "clerkUserId": "user_123",
  "guestSessionId": "sess_456",
  "email": "user@example.com"
}
```

**Output:**

```jsonc
{
  "ok": true,
  "message": "Order created.",
  "orderId": "ord_456",
  "orderNumber": "COVE-2025-000123",
  "total": 79.97,
  "currency": "EUR"
}
```

---

### 6.3 `cove.order_get_status` (vNext)

**Input:**

```jsonc
{
  "orderId": "ord_456",
  "clerkUserId": "user_123"    // for authorization
}
```

**Output:**

```jsonc
{
  "ok": true,
  "orderId": "ord_456",
  "status": "processing",      // e.g. processing|shipped|delivered|canceled
  "placedAt": "2025-11-30T12:34:56Z",
  "items": [
    { "variantId": "CUHD001", "size": "M", "quantity": 2, "price": 19.99 }
  ],
  "total": 39.98,
  "currency": "EUR"
}
```

---

### 6.4 `cove.email_send_order_confirmation` (vNext)

**Input:**

```jsonc
{
  "orderId": "ord_456",
  "email": "user@example.com"
}
```

**Output:**

```jsonc
{
  "ok": true,
  "message": "Order confirmation email queued."
}
```


