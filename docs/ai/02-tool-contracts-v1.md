# 02 – MCP Migration Plan for Cove AI

*Last updated: 2025-11-30*
*Related: `01-current-capabilities.md`*

This document describes **how Cove AI will evolve** from a custom “agent + endpoints” setup into an architecture that:

* Treats recs, size/fit, cart, checkout, and orders as **formal tools**.
* Exposes those tools through a **Cove Commerce MCP server**.
* Later supports **code-execution agents** that orchestrate tools in a single step, instead of many chat-level tool calls. ([Michael Bargury][1])

The plan is **incremental**: we keep everything that works today and wrap it.

---

## 1. Quick MCP primer (only what Cove needs)

### 1.1 What MCP actually is

The **Model Context Protocol (MCP)** is an open standard for connecting LLM-based apps (“hosts”) to external systems via **MCP servers**. ([Model Context Protocol][2])

* An **MCP server** exposes:

  * **Tools** – operations the model can invoke (e.g. `cart.add`, `orders.get_status`). ([Model Context Protocol][3])
  * **Resources** – data objects exposed as context (e.g. catalog snapshots, size charts). ([modelcontextprotocol.info][4])
  * **Prompts** – reusable prompt templates (not urgent for Cove yet).

* An **MCP client** lives in the AI application (e.g. Cove AI core, Claude, ChatGPT) and:

  * lists tools & resources,
  * calls tools with structured JSON,
  * streams results back to the model. ([OpenAI Developers][5])

Think of MCP as a **standard tool API** so you *don’t* have to hand-roll yet another “functions” layer for every model vendor.

### 1.2 Code-execution with MCP (future phase)

Anthropic’s recent “code execution with MCP” work adds a **sandboxed code runtime** between the model and MCP tools: the model writes TypeScript/Python that calls MCP tools, and that code runs once, handling loops, joins, and big data locally. ([Michael Bargury][1])

Benefits (relevant later for Cove):

* Load tools **on demand** instead of stuffing all tool schemas into every prompt.
* Filter & aggregate **large catalog/cart/order data in code** before sending small summaries back to the model.
* Keep sensitive fields (PII, card fragments, etc.) out of the LLM context by doing tokenisation/de-tokenisation in the sandbox only. ([Michael Bargury][1])

We **do not** need to implement this immediately, but our tool design should be compatible with it.

---

## 2. Mapping MCP concepts to Cove

### 2.1 Roles in Cove

* **Host**:
  The *Cove AI core* service (your current `cove-ai-core` backend). It embeds the LLM client, keeps track of conversations, and decides when to call tools.

* **MCP client** (inside host):
  A library (Python or TS SDK) that connects to MCP servers and exposes tool calls to your agent code. Official SDKs exist for both Python and TypeScript, maintained in the `modelcontextprotocol` org. ([GitHub][6])

* **MCP servers**:

  1. **Cove Commerce MCP server** (primary in this doc)

     * Tools for: catalog search, recommendations, size/fit, cart, checkout, orders, emails.
  2. (Optional later) Separate servers for analytics, user activity logs, etc.

### 2.2 Where existing code fits

From `01-current-capabilities.md`:

| Current capability     | Today’s implementation                          | MCP future role                                            |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Recommendations        | `/ai/recs/suggest` + `recs.py` logic            | `recommend_products` tool on commerce server               |
| Size & fit advisor     | `/ai/fit/recommend` (separate microservice)     | `get_size_fit_advice` tool                                 |
| Cart add               | `/ai/agent/cart_add` → Django `/tools/cart.add` | `cart_add` tool (side-effect)                              |
| Get cart (implicit)    | Django cart serializer + UI fetch               | `cart_get` tool                                            |
| Orders / checkout      | Django endpoints (planned)                      | `checkout_start`, `order_create`, `order_get_status` tools |
| Emails (order/invoice) | Django mailer / Celery (planned)                | `email_send_order_confirmation` tool                       |

The key idea:

> We **don’t** rewrite recommendation logic, fit logic, or cart logic.
> We **wrap** them with stable tool contracts that an MCP server can expose.

---

## 3. Migration phases (no breaking changes)

### Phase 0 – Freeze & reference current behaviour

**Goal**: Treat `01-current-capabilities.md` as the source of truth for how the system behaves *today*.

Actions:

1. Keep `01-current-capabilities.md` updated when you change:

   * endpoints,
   * request/response shapes,
   * agent routing logic.
2. Flag any endpoint that you want to deprecate later (e.g. if we fold multiple filter endpoints into one tool).

*No new code needed; this is documentation discipline.*

---

### Phase 1 – Introduce a “Cove Commerce Tools” layer (no MCP yet)

**Goal**: Centralise business operations behind **pure functions** with clear schemas. These functions will later be “wrapped” by MCP.

Create something like:

* `cove_ai_tools/catalog.py`
* `cove_ai_tools/recommendations.py`
* `cove_ai_tools/size_fit.py`
* `cove_ai_tools/cart.py`
* `cove_ai_tools/checkout.py`
* `cove_ai_tools/orders.py`
* `cove_ai_tools/emails.py` (later)

Each file exports functions that match **tool-like** signatures.

Example (Python-ish):

```python
# cove_ai_tools/recommendations.py

from typing import List, Optional, TypedDict

class RecommendProductsInput(TypedDict, total=False):
    query: str
    anchor_slug: Optional[str]
    tier: Optional[str]
    type: Optional[str]
    budget_min: Optional[float]
    budget_max: Optional[float]
    color: Optional[str]
    size: Optional[str]
    gender: Optional[str]
    top_k: int

class RecommendProductItem(TypedDict):
    variantId: str
    slug: str
    name: str
    tier: str
    type: str
    color: str
    size: str
    price: float
    reason: str

class RecommendProductsOutput(TypedDict):
    items: List[RecommendProductItem]

async def recommend_products(params: RecommendProductsInput) -> RecommendProductsOutput:
    # Internally call your existing /ai/recs/suggest + recs.py logic
    ...
```

Do the same for:

* `get_size_fit_advice`
* `cart_add`
* `cart_get`

Then:

* **Update your agent/orchestrator** (`agent.py`, `orchestrator.py`) to call these functions instead of raw endpoints.
* Keep the old HTTP endpoints alive; internally they can also call the same functions.

✅ Outcome:

* All AI-facing behaviour is routed through a single **tools layer**.
* Nothing breaks; you’re just tidying the internal API so MCP can hook in later.

---

### Phase 2 – Implement the **Cove Commerce MCP server** around that layer

**Goal**: Expose your existing `cove_ai_tools` functions via an MCP server.

Using the official **Python SDK** for MCP servers (or TypeScript if you’d rather integrate with a Node layer), you implement something like `cove_mcp/commerce_server.py`. ([GitHub][6])

This server:

1. **Registers tools**:

   For each tool (e.g. `recommend_products`), you define:

   * `name`: e.g. `"cove.recommend_products"`
   * `description`: short natural language.
   * `inputSchema`: JSON schema matching `RecommendProductsInput`.
   * `outputSchema`: JSON schema matching `RecommendProductsOutput`.

   This follows MCP’s “tools” spec: each tool has a unique name and JSON schemas so the client/model know how to call it. ([Model Context Protocol][3])

2. **Implements `call_tool`**:

   When an MCP client calls `cove.recommend_products` with `args`, the server:

   * Validates `args` against `inputSchema`.
   * Calls `cove_ai_tools.recommendations.recommend_products(args)`.
   * Returns the result as the tool response.

3. **Optionally exposes resources**

   For read-only data that is often used as context (e.g. size charts, tier descriptions), you can also expose **resources**: URIs the host can fetch and inject into prompts when needed. ([modelcontextprotocol.info][4])

   Example resources:

   * `resource://cove/catalog/schema`
   * `resource://cove/size_charts/default`
   * `resource://cove/policies/returns`

At the end of Phase 2 you have:

* The same behaviour as before for your current app.
* **PLUS** a working `Cove Commerce MCP server` that can be:

  * used by your own agent (via an MCP client),
  * reused later by other LLM hosts that support MCP.

---

### Phase 3 – Extend tools to cover checkout, orders, and emails

**Goal**: Turn future commerce flows into tools instead of ad-hoc endpoints.

Once Phase 1–2 are stable, we add tools on top of your existing or planned Django endpoints.

Recommended tools (names are indicative; final names should be namespaced):

1. **Cart tools**

   * `cove.cart_get`
   * `cove.cart_add`
   * `cove.cart_update_item`
   * `cove.cart_clear`

2. **Checkout & payment tools**

   * `cove.checkout_start`

     * Validates cart, computes totals, creates a `checkout_id` linked to a Stripe session.
   * `cove.checkout_get_status`

     * Returns `pending_payment`, `paid`, `failed`, etc.

   Stripe itself likely remains a separate integration in Django; the MCP tool just wraps your backend logic.

3. **Orders tools**

   * `cove.order_create_from_checkout`

     * Called once Stripe confirms payment: creates **Order** and **OrderItems**, links to user/guest.
   * `cove.order_get_status`

     * Returns order status + tracking data (if you add that later).
   * `cove.order_get_history`

     * Returns a user’s previous purchases (for recommendations / size defaults).

4. **Emails tools**

   * `cove.email_send_order_confirmation`
   * `cove.email_send_invoice`
   * These tools wrap your Django mailer / Celery jobs and return a simple “queued/sent” status.

All new tools follow the same pattern:

* Well-defined JSON input/output.
* Implementation calls **existing Django APIs or ORM logic**.
* Registered in the same `Cove Commerce MCP server`.

✅ Outcome:

* Everything your agent does on the commerce side is expressible as MCP tools.
* Future hosts (Claude Desktop, OpenAI apps, internal dev tools) can reuse the same MCP server to interact with Cove’s commerce backend.

---

### Phase 4 – (Optional, later) Add **code-execution** orchestration

**Goal**: Let your agent generate **code** (TS/Python) that uses MCP tools to execute multi-step workflows efficiently.

Conceptually:

1. Add a **sandboxed code runtime** to `cove-ai-core` (e.g. Node.js with time & memory limits).
2. Mount your MCP client into that runtime (e.g. as TS functions like `cove.recommendProducts`, `cove.cartAdd`, `cove.checkoutStart`).
3. Change the agent prompt for complex tasks:

   * Instead of “call these tools one by one”, the model generates a script that:

     * queries products,
     * filters/aggregates locally,
     * updates cart,
     * kicks off checkout.

This mirrors Anthropic’s “code execution with MCP” pattern, which shows large token savings and speedups by handling complex logic in one code execution step rather than many round-trip tool calls. ([Michael Bargury][1])

You don’t need to commit to a specific language yet; just keep tool contracts and server design compatible with this.

---

## 4. Tool definitions we’ll standardise first

These are the **core tools** we should define and stabilise ASAP, because they map directly to current behaviour.

You don’t have to implement MCP tomorrow, but these contracts should be treated as “public API” in your code.

### 4.1 `cove.recommend_products`

* **Purpose**: return a list of recommended product variants for discovery and cart flows.

* **Inputs** (subset of what you already use in `recs.py`):

  ```jsonc
  {
    "query": "optional free-text query",
    "anchor_slug": "optional groupSlug",
    "tier": "optional tier",
    "type": "optional type",
    "budget_min": 0,
    "budget_max": 50,
    "color": "optional color name",
    "size": "optional size key",
    "gender": "optional gender",
    "top_k": 8
  }
  ```

* **Outputs**:

  ```jsonc
  {
    "items": [
      {
        "variantId": "CUHD001",
        "slug": "hoodie-casual-fleece-59.99",
        "name": "Hoodie (Brushed Fleece)",
        "tier": "casual",
        "type": "hoodie",
        "color": "black",
        "size": "M",
        "price": 19.99,
        "reason": "Matches your query, color black, size M"
      }
    ]
  }
  ```

### 4.2 `cove.get_size_fit_advice`

* **Purpose**: map body metrics + fit preference + optional product type to a size recommendation.

* **Inputs**:

  ```jsonc
  {
    "height_cm": 175,
    "weight_kg": 70,
    "gender": "unisex",
    "fit_preference": "regular",
    "product_type": "hoodie",
    "slug": null
  }
  ```

* **Outputs**:

  ```jsonc
  {
    "size": "M",
    "confidence": 0.82,
    "notes": ["Slim build, regular fit = M is safest."]
  }
  ```

### 4.3 `cove.cart_add`

* **Purpose**: side-effectful add to cart (what `/ai/agent/cart_add` does today).

* **Inputs**:

  ```jsonc
  {
    "variantId": "CUHD001",
    "size": "M",
    "quantity": 1,
    "cartId": "optional-cart-id",
    "clerkUserId": "optional",
    "guestSessionId": "optional",
    "email": "optional",
    "idempotencyKey": "optional"
  }
  ```

* **Outputs**:

  ```jsonc
  {
    "ok": true,
    "message": "Item added to cart.",
    "cartId": "uuid",
    "cart": { /* full backend cart */ },
    "items": [
      {
        "variantId": "CUHD001",
        "size": "M",
        "quantity": 1,
        "price": 19.99
      }
    ]
  }
  ```

### 4.4 `cove.cart_get`

* **Purpose**: fetch the current user cart (for agent reasoning & UI).

* **Inputs**:

  ```jsonc
  {
    "cartId": "optional",
    "clerkUserId": "optional",
    "guestSessionId": "optional"
  }
  ```

* **Outputs** (mirrors your cart serializer):

  ```jsonc
  {
    "cartId": "uuid",
    "items": [
      {
        "variantId": "CUHD001",
        "size": "M",
        "quantity": 1,
        "price": 19.99,
        "name": "Hoodie (Brushed Fleece)",
        "tier": "casual",
        "type": "hoodie",
        "color": "black"
      }
    ],
    "total": 39.98,
    "currency": "EUR"
  }
  ```

These definitions are already extremely close to what your agent and Django do today; we’re just making them **explicit and stable**.

---

## 5. Security and ops considerations

Because MCP is **just a protocol**, security is up to you. Official docs and commentary highlight that you must handle auth and sensitive data yourself. ([IT Pro][7])

For Cove, that means:

* **Authentication**:

  * MCP server must validate tokens/session for each tool call (e.g. only allow `cart_add` with a valid `clerkUserId` or `guestSessionId`).
* **Authorization**:

  * Make sure tools like `order_get_history` can only see the calling user’s data.
* **Rate limiting & resource limits**:

  * Especially important once you add code-execution (phase 4).
* **Logging & observability**:

  * Log tool calls (name, args minus sensitive, duration, success/failure) for debugging agent behaviour.

---

## 6. Summary

We *don’t* need to rewrite Cove to “be MCP-native” overnight.

Instead:

1. **Phase 1** – wrap what exists today (recs, size/fit, cart-add) in a **tools layer** with clean function contracts.
2. **Phase 2** – expose that layer through a **Cove Commerce MCP server** using the official SDK.
3. **Phase 3** – expand tools to cover checkout, orders, and emails.
4. **Phase 4** – optionally add a **code-execution runtime** that orchestrates these tools efficiently.

This keeps everything we’ve already achieved, turns it into a **portable tools API**, and sets us up for more serious agentic behaviour (including with external hosts like Claude or OpenAI apps) without throwing away work.


