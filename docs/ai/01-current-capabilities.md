
# 01 – Current Cove AI Capabilities

*Last updated: 2025-11-30*

This document describes **what Cove AI can do today**, how the pieces fit together, and what contracts the frontend / Django backend can rely on.

It covers:

* The **agent entrypoint** (`/ai/agent/query`)
* The **intent classifier** and query parsing
* **Recommendations** (`/ai/recs/suggest`)
* **Size & fit advisor** integration
* **Cart planning** and **cart add** “tool” endpoint
* **History-aware chat** + AI profile personalization
* High-level limitations and next steps (for MCP / tool-calling upgrade)

---

## 1. High-level Architecture

At a very high level:

* The **agent** is a **single HTTP entrypoint**:

  * `POST /ai/agent/query` → decides what to do with a user message and returns a structured response for the frontend. 
* The agent delegates to three main “capability modules”:

  * **RAG** (`/ai/rag/query`) for product / info answers
  * **Recommendations** (`/ai/recs/suggest`) for browsing + cart resolution 
  * **Size & fit** (`/ai/fit/recommend`) for “which size should I buy?”
* A thin **cart tool wrapper**:

  * `POST /ai/agent/cart_add` → calls Django `/tools/cart.add` and returns the updated cart. 
* **Intent classification** is done via `app.agent.orchestrator`, using an LLM+keywords hybrid. 
* Per-user **AI profile** + **chat history** are fetched from Django and used to bias filters + chat context. 

The important thing: **`/ai/agent/query` itself has no side-effects** (no DB writes, no cart mutations). It only returns **plans** (`cart_proposal`) and **content**; real actions happen through dedicated endpoints like `/ai/agent/cart_add`.

---

## 2. Agent Entry Point – `/ai/agent/query`

### 2.1 Request model – `AgentIn`

```jsonc
{
  "message": "user free text",
  "top_k": 6,                    // how many items for recs/RAG

  // Context for personalization / tools
  "cartId": "optional-cart-id",
  "clerkUserId": "optional-clerk-id",
  "guestSessionId": "optional-guest-id",
  "email": "optional@user.com",

  // History behavior
  "historyScope": "user"         // "user" | "none"
}
```

Key fields: 

* `message`: the user query (required).
* `cartId`, `clerkUserId`, `guestSessionId`, `email`:

  * used for **AI profile lookup**, **chat history** and **cart planning context**.
* `historyScope`:

  * `"user"` → fetch recent chat history from Django and feed it into the LLM.
  * `"none"` → treat this as a fresh, stateless turn.

---

### 2.2 Response model – `AgentOut`

`AgentOut.kind` signals which mode we are in: 

```ts
type AgentOutKind = "answer" | "recommendations" | "cart_proposal";
```

Full shape:

```jsonc
{
  "kind": "recommendations",
  "answer": "Here are some options that match what you asked for.",
  "citations": [{ /* RAG / fit citations, if any */ }],
  "items": [
    {
      "title": "Hoodie (Brushed Fleece)",
      "url": "/product/hoodie-casual-fleece-59.99",
      "slug": "hoodie-casual-fleece-59.99",
      "score": 0.87,
      "reason": "matches your query, color black, size M",
      "type": "hoodie",
      "tier": "casual",
      "color": "black",
      "size": "M",
      "variantId": "CUHD001"
    }
  ],
  "cart_payload": {
    // present only for `kind="cart_proposal"`
  },
  "debug_plan": {
    // internal routing info for debugging in dev
  }
}
```

Interpretation:

* `kind = "answer"`
  → plain text answer (from RAG, fit engine, or LLM chat).
* `kind = "recommendations"`
  → a **list of products** to render in the UI (e.g., cards the user can click).
* `kind = "cart_proposal"`
  → a **single recommended cart action** (see §5). The frontend should:

  * Show the natural language `answer` (like “Do you want me to add this black hoodie in size M?”).
  * Optionally show `items[0]` as the chosen product.
  * If user confirms, call **`/ai/agent/cart_add`** with `cart_payload`.

---

## 3. Intent Classification & Query Parsing

### 3.1 Intent classifier – `classify(message, attrs)`

Intent is handled by `app.agent.orchestrator.classify`. 

The classifier:

* Receives:

  * `message`: user text.
  * `attrs`: parsed attributes from RAG (`colors`, `types`, `sizes`).
* Uses an **LLM (LLMClient)** with a strict system prompt to output JSON:

```jsonc
{
  "kind": "discover",
  "has_price_filter": true
}
```

Supported `kind` values:

* `"discover"` – user wants to **browse products / see options**.
* `"lookup_product"` – asking about **properties/features/care** (not browsing).
* `"size_fit"` – “which size?”, “will M be too tight?”.
* `"policy"` – returns, shipping, delivery, payment, etc.
* `"history_meta"` – questions about previous conversations.
* `"generic"` – chit-chat or brand questions.
* `"unknown"` – fallback.

`has_price_filter` is `true` when the user mentions budget constraints (“under 40 euros”, “between 30 and 50”, etc.).

### 3.2 Attribute & filter parsing

Inside `agent_query`: 

* We open a **fresh DB connection** and call `_parse_query_attrs(conn, q)` (from `rag.py`) to extract:

  * `colors`
  * `types`
  * `sizes`
* We call `parse_numeric_filters(q)` → generic price band detection.
* `build_filters(attrs, numeric_filters)` merges everything into one `base_filters` dict.
* Then we call `_apply_profile_defaults_to_filters(base_filters, ai_profile)`:

  * Uses `AiUserProfile` (from Django) to **fill in missing** color / size:

    * `color` ← `preferred_colors[0]` (if present)
    * `size`  ← `preferred_size_top`
  * **Never overrides** explicit user filters.

The resulting `rec_filters` dict is used both for recommendations and cart proposals.

---

## 4. Recommendation Engine – `/ai/recs/suggest`

### 4.1 Endpoint contract

* **Route**: `POST /ai/recs/suggest` 
* **Input** (`RecsIn`):

```jsonc
{
  "anchor_slug": "hoodie-casual-fleece-59.99",  // optional "similar to this"
  "query": "black hoodie under 40",             // free text, optional if anchor present
  "filters": {
    "type": "hoodie",
    "tier": "casual",
    "color": "black",
    "size": "M",
    "price_min": 20.0,
    "price_max": 40.0
  },
  "top_k": 8
}
```

* **Output** (`RecsOut`):

```jsonc
{
  "items": [
    {
      "title": "Hoodie (Brushed Fleece)",
      "url": "/product/hoodie-casual-fleece-59.99",
      "slug": "hoodie-casual-fleece-59.99",
      "score": 0.91,
      "reason": "Matches your query, color black, size M",
      "type": "hoodie",
      "tier": "casual",
      "color": "black",
      "size": "M",
      "variantId": "CUHD001"
    }
  ]
}
```

### 4.2 Retrieval & scoring logic

Internals of `recs_suggest`: 

1. **Anchor variant resolution**

   * If `anchor_slug` is provided, `_get_product_meta(conn, anchor_slug)` reads a representative **variant doc** from `ai_core.docs` using `groupSlug` and (optionally) `preferred_color`.
   * Builds an anchor query text using `_build_anchor_query_text(meta)`.

2. **Query selection**

   * If an anchor meta is resolved → use anchor description.
   * Otherwise → use `query`.
   * If both empty → returns `items=[]`.

3. **Hybrid / keyword search**

   * If `DISABLE_EMBEDDING=true`: `search_keyword(...)`.
   * Else: `search_hybrid(...)`.
   * Both target `kind='product'` and fetch `top_k * 4` docs.

4. **Filter application**

   * Each candidate doc is enriched with meta from Postgres (if needed).
   * Hard filters (**type/tier/color/size/price**) are applied via `_matches_filters(meta)`:

     * `type` / `tier` must match exactly (lowercased).
     * `color` uses `meta.colorName`.
     * `size` requires `sizes[size_key]` to exist and be in stock.
     * Price must fall into `[price_min, price_max]` if given.

5. **Relaxing filters**

   * If no candidates remain but there were filters and **no price filter**, it “relaxes”:

     * Rebuilds candidates without type/tier/size/color constraints (still respects price if set).

6. **Variant & scoring**

   * `variantId` is read from `meta.variantId` if present (`_pick_variant_id`).
   * Scores:
     `final_score = 0.5 * sim_score + 0.3 * pop_score + 0.2 * avail_score`

     * `sim_score`: normalised search score.
     * `pop_score`: from `meta.popularity*` / `views` / `orders` heuristics. 
     * `avail_score`: from `_compute_availability_score(meta, desired_size)` using size stock.
   * Results sorted by `final_score` and truncated to `top_k`.

7. **Reason string**

   * Builds a human-readable reason like:

     * `"Matches your query, color black, size M"`

These `RecItem`s are then re-wrapped by the agent as `AgentItem` when needed.

---

## 5. Cart Planning & Cart Add “Tool”

### 5.1 Cart intent detection

`_looks_like_cart_add(msg)` is a **conservative heuristic**: 

* Triggers `wants_cart = True` only if:

  * Message mentions `cart` + verbs like “add / put / in my”.
  * Or contains verbs like “buy / purchase / order / checkout / I’ll take”.
  * Or patterns like “add this/that/one” combined with known product type words.

This is intentionally strict to **avoid accidental cart actions**.

### 5.2 `kind = "cart_proposal"` – planning only (no side effects)

Within `agent_query`, if `wants_cart` is true, the agent goes into **cart planning mode**. 

It follows three passes:

1. **Use last recommendations** (session memory)

   * `_SESSION_RECS` stores last recs per session key (`cartId`, `clerkUserId`, or `guestSessionId`).
   * For messages like “add the second hoodie to my cart”:

     * `_select_from_last_recs_via_llm(message, last_items, prev_user_message)` asks an LLM to return indices of the items the user means.
   * If **exactly one item** is resolved:

     * Agent builds a **single cart proposal**:

       * Chooses size: from `rec_filters.size` or item’s `size`.

       * Builds a natural language question:
         “Do you want me to add this black hoodie in size M to your cart?”

       * Constructs `cart_payload`:

         ```jsonc
         {
           "variantId": "CUHD001",
           "size": "M",
           "quantity": 1,
           "cartId": "...",
           "clerkUserId": "...",
           "guestSessionId": "...",
           "email": "..."
         }
         ```

       * Returns `AgentOut` with `kind="cart_proposal"` and this payload.
   * If **multiple items** resolve:

     * Returns `kind="recommendations"` with those items and a message asking the user to pick one.

2. **Structured product query → recs + proposal**

   * If no last recs help, but `is_structured_product_query(attrs)` says we have a clear product description:

     * Build a rec query via `build_rec_query(q, rec_filters)`.
     * Call `_call_recs_suggest(...)`.
     * Take top item and build a **single cart proposal** (same pattern as above).

3. **Fallback**

   * If we still can’t resolve an item:

     * Returns `kind="answer"` with:
       “I’m not sure which item you want me to add… please click a specific product or say ‘add the black hoodie in size M’.”

**Important:** in all cases above, **no cart is actually modified**. The agent only returns a **plan**.

### 5.3 Cart execution – `/ai/agent/cart_add`

This is the part that is closest to a **“tool”** right now. 

* **Route**: `POST /ai/agent/cart_add`
* **Input** (`AgentCartAddIn`):

```jsonc
{
  "variantId": "CUHD001",
  "size": "M",
  "quantity": 1,
  "cartId": "optional-cart-id",
  "clerkUserId": "optional-clerk-id",
  "guestSessionId": "optional-guest-id",
  "email": "optional@user.com",
  "idempotencyKey": "optional-key"
}
```

* The function:

  * Forwards payload to Django at `/tools/cart.add`.
  * Adds `Idempotency-Key` header if provided.
  * Parses Django’s cart JSON (CartSerializer).
  * Extracts `cartId` + `items` for convenience.

* **Output** (`AgentCartAddOut`):

```jsonc
{
  "ok": true,
  "message": "Item added to cart.",
  "cart": { /* full cart serializer JSON from Django */ },
  "cartId": "uuid",
  "items": [ /* simplified list of cart items */ ]
}
```

* On non-2xx:

  * `ok = false`
  * `message` either generic or `data.error` from Django (e.g. “No more stock”).

This endpoint is exactly what we’ll later formalise as an **MCP tool**: it’s a **side-effectful operation** with a clear JSON contract and no LLM logic inside.

---

## 6. Size & Fit Advisor Integration

When `intent_kind == "size_fit"` and we’re **not** in cart mode: 

1. `_extract_body_metrics(msg)` searches for `height_cm` and `weight_kg` patterns:

   * e.g. `"175cm and 70kg"`, `"height 180 cm, weight 85 kg"`.
2. `_infer_fit_preference(msg)` maps phrases to one of:

   * `"tight" | "regular" | "loose" | "slim" | "oversized"`
   * Fallback: `"regular"`.
3. If no explicit preference in text and AI profile exists:

   * Use `profile.preferred_fit` as fallback.
4. Build `payload` to `/ai/fit/recommend`:

```jsonc
{
  "gender": null,
  "height_cm": 175,
  "weight_kg": 70,
  "fit_preference": "slim",
  "product_type": "hoodie",   // if parsed from attrs
  "slug": null
}
```

5. On success, expect response like:

```jsonc
{
  "size": "M",
  "confidence": 0.82,
  "notes": ["..."],
  "citations": []
}
```

6. Agent returns:

* `kind="answer"`
* A natural language recommendation such as:
  “I’d recommend size M (confidence ~82%). …”

If fit call fails or we can’t parse metrics → falls back to recs/RAG/chat.

---

## 7. History-Aware Chat & AI Profile

### 7.1 AI profile

`_load_ai_profile(clerk_user_id)` calls Django:

* `GET /ai_profiles/profile.get?clerkUserId=...` 
* Behaves as:

  * `200` → returns profile JSON.
  * `404` → means “no profile yet” (normal for new users).
  * Other codes / exceptions → logged, treated as `None`.

Profile is used to:

* Bias rec filters (preferred color/size).
* Bias size/fit preference (preferred_fit).

### 7.2 Chat history

`_fetch_history_for_llm(clerkUserId, guestSessionId, limit=20)`:

* Calls Django: `GET /ai_profiles/history/?...`
* Expects a JSON with `"messages": [...]` and converts them into OpenAI-style messages via `_history_to_llm_messages(...)`. 

There are special rules in the system prompt:

* Don’t hallucinate policies / stock / shipping.
* Don’t invent past topics; only use actual history.
* Treat first turn differently vs multi-turn.
* Smalltalk mode for very short generic messages (short, friendly, minimal mention of capabilities).

### 7.3 When do we use chat LLM vs RAG?

In the fallback section of `agent_query`: 

* `use_llm_chat = intent_kind in ("generic", "policy", "history_meta", "unknown")`
* If `use_llm_chat` and not in cart/recs mode:

  * Call `_call_llm_with_history(...)` → history-aware chat answer.
* Otherwise:

  * Call `_call_rag(q, top_k)` → product/knowledge answer via RAG.

So RAG is primarily used for **product / info lookups**, while chat LLM covers broader conversation & policy questions (but still with the safety constraints from the system prompt).

---

## 8. What We Have Achieved So Far (Summary)

**Today, Cove AI already supports:**

1. **Context-aware product recommendations**

   * Anchor-based (“similar to this product”).
   * Filter-aware (type, tier, color, size, price).
   * Stock-aware + popularity-aware scoring.
   * Integrated with the agent for “discover” flows.

2. **Size & fit advice**

   * Parses height/weight from free text.
   * Infers fit preference, with AI-profile fallback.
   * Integrates with a dedicated fit micro-service.

3. **Cart-add planning**

   * Detects strong buy/cart intent.
   * Reuses last recommendations + LLM selection to resolve “this one / second hoodie”.
   * Builds safe `cart_proposal` payloads for the frontend to confirm.

4. **Cart-add execution**

   * `POST /ai/agent/cart_add` as a focused tool wrapper around Django’s `/tools/cart.add`.

5. **Personalization & history**

   * AI profile → default color/size/fit.
   * Chat history → better natural conversations (with strict guardrails).
   * Per-session in-memory recs store → multi-turn flows like “add the second one”.

6. **Robust intent routing**

   * LLM-based classifier with clearly defined intent types and price filter detection.

---

## 9. Known Limitations / Next Steps (for MCP future)

This is intentionally not MCP yet, but the architecture is already **tool-shaped**:

* **`/ai/agent/cart_add`** is a clean **side-effect tool** that could be exposed via MCP as `cart.add`.
* **`/ai/recs/suggest`**, `/ai/rag/query`, `/ai/fit/recommend` are already clean RPC-style services that can be wrapped as tools.

Current gaps we can improve when moving to a full MCP / tool-calling setup:

* Tool selection is still **manual in Python** (branches in `agent_query`), not driven by an LLM planner with explicit tool schemas.
* No generic **orders / checkout / email** tools yet – those would mirror `cart_add` with similar patterns.
* Session-level recs are stored in in-memory dicts → needs Redis / DB for multi-worker scale.
* Error handling + retries can be made more systematic once tools are formalised.

But the good news: **we don’t need to throw away anything**.
Most of this can be wrapped into MCP tool definitions without changing the basic contracts.


