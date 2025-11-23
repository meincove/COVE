# app/routes/agent.py
from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing_extensions import Literal

from app.vector.store import connect
from app.agent.orchestrator import classify
from app.routes.rag import _parse_query_attrs  # reuse the same attrs logic as RAG
from app.agent.filters import (
    parse_numeric_filters,
    build_filters,
    is_structured_product_query,
    build_rec_query,
)
from app.providers.llm import LLMClient  # 👈 NEW: history-aware chat LLM

DJANGO_BASE_URL = os.getenv("DJANGO_BASE_URL", "http://127.0.0.1:8001")
log = logging.getLogger("cove.agent")
router = APIRouter()

_conn = None  # shared read-only connection


# ---------- I/O models ----------


class AgentIn(BaseModel):
    message: str
    top_k: int = 6

    # optional context for cart + user
    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    email: Optional[str] = None


class AgentItem(BaseModel):
    title: str
    url: str
    slug: str
    score: Optional[float] = None
    reason: Optional[str] = None
    type: Optional[str] = None
    tier: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    variantId: Optional[str] = None


class AgentOut(BaseModel):
    kind: Literal["answer", "recommendations", "cart_proposal"]
    answer: str
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    items: List[AgentItem] = Field(default_factory=list)
    cart_payload: Optional[Dict[str, Any]] = None
    debug_plan: Optional[Dict[str, Any]] = None


class AgentCartAddIn(BaseModel):
    variantId: str
    size: str
    quantity: int = 1

    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    email: Optional[str] = None
    idempotencyKey: Optional[str] = None


class AgentCartAddOut(BaseModel):
    ok: bool
    message: str

    # full cart payload from Django (CartSerializer)
    cart: Dict[str, Any]

    # convenience fields for the frontend
    cartId: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)


# ---------- Small helpers ----------


def _looks_like_cart_add(msg: str) -> bool:
    """
    Conservative detector for "add to cart" / "buy this" intents.
    We keep this phrase-based because we really don't want false positives
    that silently add items to the cart.
    """
    q = msg.lower()

    # Clear "cart" phrases
    if "cart" in q and any(kw in q for kw in ("add", "put", "into", "to my", "in my")):
        return True

    # Buy / purchase w/o the word "cart"
    if re.search(r"\b(buy|purchase|order|checkout|i\'ll take|i will take)\b", q):
        return True

    # Short patterns like "add this", "add one" IF also mentioning a product type
    if re.search(r"\badd (this|that|one|it)\b", q) and re.search(
        r"\b(hoodie|bomber|jacket|jeans|t[- ]?shirt|shirt|cargo|pant|pants)\b",
        q,
    ):
        return True

    return False


# ---------- AI profile integration ----------


async def _load_ai_profile(clerk_user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch AiUserProfile snapshot from Django.

    Route (Django):
      GET /ai_profiles/profile.get?clerkUserId=...

    Returns profile JSON or None if anything fails.
    """
    if not clerk_user_id:
        return None

    base = DJANGO_BASE_URL.rstrip("/")
    url = f"{base}/ai_profiles/profile.get"

    try:
        async with httpx.AsyncClient(timeout=5) as cx:
            r = await cx.get(url, params={"clerkUserId": clerk_user_id})
        if r.status_code == 200:
            return r.json()
        log.warning("ai_profile_get non-200 %s: %s", r.status_code, r.text)
    except Exception as e:
        log.warning("ai_profile_get failed: %s", e)

    return None


def _apply_profile_defaults_to_filters(
    rec_filters: Dict[str, Any],
    profile: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Use AiUserProfile as a *fallback* when the user didn't specify filters.

    - color  → preferred_colors[0]
    - size   → preferred_size_top (for tops / generic) if not explicitly set

    Never override explicit user filters.
    """
    if not profile:
        return rec_filters

    merged = dict(rec_filters)

    # Color personalization
    if "color" not in merged:
        colors = profile.get("preferred_colors") or []
        if isinstance(colors, list) and colors:
            # store as lowercase for compatibility with recs filters
            merged["color"] = str(colors[0]).lower().strip()

    # Size personalization (top is safest generic default)
    if "size" not in merged:
        sz_top = (profile.get("preferred_size_top") or "").upper().strip()
        if sz_top:
            merged["size"] = sz_top

    return merged


# ---------- History → LLM helpers ----------


async def _fetch_history_for_llm(
    clerk_user_id: Optional[str],
    guest_session_id: Optional[str],
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Pull recent chat history from Django and return the raw message dicts.

    We deliberately use the same history endpoint the frontend can hit:
      GET /ai_profiles/history/?guestSessionId=...&clerkUserId=...&limit=...
    """
    if not clerk_user_id and not guest_session_id:
        return []

    base = DJANGO_BASE_URL.rstrip("/")
    url = f"{base}/ai_profiles/history/"

    params: Dict[str, str] = {"limit": str(max(1, min(limit, 100)))}
    if clerk_user_id:
        params["clerkUserId"] = clerk_user_id
    else:
        params["guestSessionId"] = guest_session_id or ""

    try:
        async with httpx.AsyncClient(timeout=5) as cx:
            r = await cx.get(url, params=params)
        if r.status_code != 200:
            log.warning("history_get non-200 %s: %s", r.status_code, r.text)
            return []
        data = r.json()
        msgs = data.get("messages") or []
        if isinstance(msgs, list):
            return msgs
    except Exception as e:
        log.warning("history_get failed: %s", e)

    return []


def _history_to_llm_messages(
    history: List[Dict[str, Any]],
    user_message: str,
) -> List[Dict[str, str]]:
    """
    Convert history rows into OpenAI-style messages, plus current user turn.
    """
    messages: List[Dict[str, str]] = [
        {
            "role": "system",
            "content": (
                "You are Cove AI, a helpful assistant for the Cove streetwear brand.\n\n"
                "Knowledge sources you may rely on in this mode:\n"
                "- The conversation history you see below (previous user and assistant messages).\n"
                "- Your general reasoning skills.\n\n"
                "Very important safety rules:\n"
                "1. Do NOT invent concrete operational details about Cove that you have not been told "
                "   explicitly in this conversation (or via structured tools, if present). This includes:\n"
                "   - exact return policies or refund windows (e.g. '30 days')\n"
                "   - shipping times, delivery dates, or regions\n"
                "   - stock levels, sizes in stock, or availability of specific items\n"
                "   - exact prices, discounts, promo codes, or taxes\n"
                "   - addresses, phone numbers, or contact details\n"
                "2. If you are asked about any of the above and you do NOT have explicit information "
                "   from the messages so far, say clearly that this information is not configured yet "
                "   and suggest checking the website or contacting support. Do not guess.\n"
                "3. When summarising or referring to past turns, be precise and faithful to what "
                "   the user actually said earlier. If you are unsure, say you are not sure.\n"
                "4. For general style, brand vibe, or non-operational questions, you may answer "
                "   in a friendly, concise way, but stay plausible for a modern minimal streetwear brand.\n\n"
                "If you cannot answer a question safely with the information available, say so explicitly "
                "instead of hallucinating details."
            ),
        }
    ]

    for row in history:
        role = row.get("role") or "user"
        # Map any unexpected roles to user/assistant
        if role not in ("user", "assistant", "system"):
            if role.lower() in ("bot", "assistant", "ai"):
                role = "assistant"
            else:
                role = "user"

        content = str(row.get("content") or "").strip()
        if not content:
            continue

        messages.append({"role": role, "content": content})

    # Current turn
    messages.append({"role": "user", "content": user_message})
    return messages



async def _call_llm_with_history(
    body: AgentIn,
    intent_kind: str,
) -> Dict[str, Any]:
    """
    History-aware general chat fallback.

    - Fetches recent history based on clerkUserId / guestSessionId
    - Builds messages
    - Calls the default LLMClient
    """
    history = await _fetch_history_for_llm(body.clerkUserId, body.guestSessionId, limit=20)
    messages = _history_to_llm_messages(history, body.message)

    client = LLMClient()
    text = await client.generate(messages)

    return {
        "answer": text,
        "history_len": len(history),
        "intent_kind": intent_kind,
    }


# ---------- RAG / RECS / FIT delegates ----------


async def _call_rag(query: str, top_k: int) -> Dict[str, Any]:
    """
    Delegate to /ai/rag/query via HTTP.
    Keeps coupling loose: agent only knows the contract, not the internals.
    """
    try:
        async with httpx.AsyncClient(timeout=12) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/rag/query",
                json={"query": query, "top_k": top_k},
            )
        if r.status_code == 200:
            return r.json()
        log.warning("rag.query non-200 %s: %s", r.status_code, r.text)
    except Exception as e:
        log.warning("rag.query failed: %s", e)

    return {"answer": "Sorry—something went wrong fetching product info.", "citations": []}


async def _call_recs_suggest(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Delegate to /ai/recs/suggest for product discovery / cart resolution.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/recs/suggest",
                json=payload,
            )
        if r.status_code == 200:
            return r.json()
        log.warning("recs.suggest non-200 %s: %s", r.status_code, r.text)
    except Exception as e:
        log.warning("recs.suggest failed: %s", e)

    return {"items": []}


# --- FIT integration helpers -------------------------------------------------


def _extract_body_metrics(msg: str) -> Optional[Dict[str, float]]:
    """
    Extract height (cm) and weight (kg) from free text.

    Examples it should handle:
      - "I'm 175cm and 70kg"
      - "height 180 cm, weight 85 kg"
      - "175 cm, 70 kg"
    """
    q = msg.lower()

    # height: first number followed by 'cm'
    h_match = re.search(r"(\d{2,3})\s*cm", q)
    # weight: first number followed by 'kg'
    w_match = re.search(r"(\d{2,3})\s*kg", q)

    if not h_match or not w_match:
        return None

    try:
        height_cm = float(h_match.group(1))
        weight_kg = float(w_match.group(1))
    except Exception:
        return None

    # sanity bounds: 140–210cm, 40–160kg
    if not (140 <= height_cm <= 210 and 40 <= weight_kg <= 160):
        return None

    return {"height_cm": height_cm, "weight_kg": weight_kg}


def _infer_fit_preference(msg: str) -> str:
    """
    Map free-text phrasing to one of:
      tight, regular, loose, slim, oversized
    Defaults to 'regular'.
    """
    q = msg.lower()

    if any(k in q for k in ("oversize", "oversized", "baggy", "very loose")):
        return "oversized"
    if any(k in q for k in ("loose", "relaxed")):
        return "loose"
    if any(k in q for k in ("tight", "snug", "body fit", "slim fit", "slim")):
        # prefer 'slim' to keep mapping stable
        return "slim"
    if any(k in q for k in ("regular fit", "standard fit", "normal fit")):
        return "regular"

    return "regular"


async def _call_fit_recommend(
    message: str,
    attrs: Dict[str, Any],
    profile: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Call /ai/fit/recommend if we can parse height+weight.

    - product_type: from parsed attrs.types[0] if present, else None
    - fit_preference: inferred from message text OR profile.preferred_fit
    - slug: left None for now (generic type-level recommendation)
    """
    metrics = _extract_body_metrics(message)
    if not metrics:
        return None

    product_type = None
    if attrs.get("types"):
        product_type = attrs["types"][0]

    # 1st priority: user text; fallback to profile preference
    fit_pref = _infer_fit_preference(message)
    if fit_pref == "regular" and profile:
        prof_pref = (profile.get("preferred_fit") or "").lower().strip()
        if prof_pref in ("tight", "regular", "loose", "slim", "oversized", "relaxed", "baggy"):
            fit_pref = prof_pref

    payload: Dict[str, Any] = {
        "gender": None,  # we keep it neutral for now
        "height_cm": metrics["height_cm"],
        "weight_kg": metrics["weight_kg"],
        "fit_preference": fit_pref,
        "product_type": product_type,
        "slug": None,  # can be wired later to a specific product
    }

    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/fit/recommend",
                json=payload,
            )
        if r.status_code == 200:
            return r.json()
        log.warning("fit.recommend non-200 %s: %s", r.status_code, r.text)
    except Exception as e:
        log.warning("fit.recommend failed: %s", e)

    return None


# ---------- Main agent endpoint ----------


@router.post("/ai/agent/query", response_model=AgentOut)
async def agent_query(body: AgentIn) -> AgentOut:
    """
    Single entrypoint for Cove AI.

    - Decides between:
        * RAG answer ("answer")
        * Product recommendations ("recommendations")
        * Cart action plan ("cart_proposal")
        * History-aware general chat (LLM)
    - Pulls per-user AI profile (if signed in) to bias filters + fit.
    - Returns a structured payload the frontend can execute.
    """
    global _conn
    _conn = _conn or connect()

    q = body.message

    # 0) Optional AI profile lookup for signed-in users
    ai_profile: Optional[Dict[str, Any]] = None
    if body.clerkUserId:
        ai_profile = await _load_ai_profile(body.clerkUserId)

    # 1) Parse attributes (colors/types/sizes) using the same logic as RAG
    attrs = _parse_query_attrs(_conn, q)

    # 1b) Parse numeric filters (price range etc.) in a generic way
    numeric_filters = parse_numeric_filters(q)

    # 1c) Merge into a unified filters dict for recs / tools
    base_filters: Dict[str, Any] = build_filters(attrs, numeric_filters)

    # 1d) Apply AI profile as fallback (never overriding explicit query filters)
    rec_filters: Dict[str, Any] = _apply_profile_defaults_to_filters(base_filters, ai_profile)

    # 2) Classify high-level intent (size_fit, policy, lookup_product, discover, etc.)
    intent = await classify(q, attrs)
    intent_kind = getattr(intent, "kind", "generic")
    has_price_filter = getattr(intent, "has_price_filter", False)

    # 3) Decide if user wants cart vs recs vs plain RAG / chat
    wants_cart = _looks_like_cart_add(q)  # keep this very conservative
    wants_recs = (
        not wants_cart
        # never force recs for history/meta questions or pure size_fit
        and intent_kind not in ("history_meta", "size_fit")
        and (
            intent_kind == "discover"
            or is_structured_product_query(rec_filters)
            or has_price_filter
        )
    )

    debug_plan: Dict[str, Any] = {
        "intent_kind": intent_kind,
        "has_price_filter": has_price_filter,
        "wants_cart": wants_cart,
        "wants_recs": wants_recs,
        "attrs": attrs,
        "numeric_filters": numeric_filters or None,
        "rec_filters": rec_filters or None,
    }

    if ai_profile:
        debug_plan["ai_profile_used"] = True
        debug_plan["ai_profile_keys"] = sorted(ai_profile.keys())
    else:
        debug_plan["ai_profile_used"] = False

    # ------------- Branch 1: cart_proposal (plan only, no side-effects) -------------
    if wants_cart:
        # Use the same suggestion engine to resolve *which* product variant
        rec_query = build_rec_query(q, rec_filters)

        rec_payload = {
            "query": rec_query,
            "filters": rec_filters,
            "top_k": max(1, min(body.top_k, 4)),
        }
        rec_resp = await _call_recs_suggest(rec_payload)

        debug_plan["rec_query"] = rec_query

        raw_items = rec_resp.get("items") or []

        items: List[AgentItem] = [
            AgentItem(**it)
            for it in raw_items
            if isinstance(it, dict) and it.get("slug")
        ]

        debug_plan["rec_item_count"] = len(items)

        if items:
            top = items[0]

            nice_type = (top.type or rec_filters.get("type") or "item").lower()
            nice_color = (top.color or rec_filters.get("color") or "").lower()
            nice_size = (top.size or rec_filters.get("size") or "").upper()

            # Natural language: ask for confirmation instead of claiming we added it
            parts: List[str] = ["Do you want me to add this"]
            if nice_color:
                parts.append(nice_color)
            parts.append(nice_type)
            if nice_size:
                parts.append(f"in size {nice_size}")
            parts.append("to your cart?")
            answer = " ".join(parts).replace("  ", " ").strip()

            # Minimal payload frontend will POST to /ai/agent/cart_add on confirm
            cart_payload = {
                "variantId": top.variantId,
                "size": top.size or rec_filters.get("size"),
                "quantity": 1,
                "cartId": body.cartId,
                "clerkUserId": body.clerkUserId,
                "guestSessionId": body.guestSessionId,
                "email": body.email,
            }

            return AgentOut(
                kind="cart_proposal",
                answer=answer,
                citations=[],
                items=items,
                cart_payload=cart_payload,
                debug_plan=debug_plan,
            )

        # If we couldn’t resolve a concrete item, fall through to normal flows.
        debug_plan["cart_add_note"] = "no_matching_item_from_recs"

    # ------------- Branch 2: size & fit advisor --------------------------
    # If user is clearly asking "which size?", prioritize FIT engine.
    if intent_kind == "size_fit" and not wants_cart:
        fit_resp = await _call_fit_recommend(q, attrs, profile=ai_profile)
        if fit_resp:
            size = fit_resp.get("size")
            confidence = fit_resp.get("confidence")
            notes = fit_resp.get("notes") or []
            citations = fit_resp.get("citations") or []

            size_part = (
                f"I’d recommend size {size}"
                if size
                else "I can’t confidently recommend a size"
            )
            if confidence is not None:
                size_part += f" (confidence ~{confidence:.0%})"

            extra_note = ""
            if notes:
                extra_note = " " + notes[0]
                if len(notes) > 1:
                    extra_note += f" Also: {notes[1]}"

            debug_plan["fit_used"] = True
            debug_plan["fit_resp"] = fit_resp

            return AgentOut(
                kind="answer",
                answer=f"{size_part}.{extra_note}".strip(),
                citations=citations,
                items=[],
                debug_plan=debug_plan,
            )

        # If fit call failed or metrics missing, fall through to recs/RAG/chat
        debug_plan["fit_used"] = False

    # ------------- Branch 3: recommendations (browse products) -------------
    if wants_recs:
        rec_query = build_rec_query(q, rec_filters)

        rec_payload = {
            "query": rec_query,
            "filters": rec_filters,
            "top_k": body.top_k,
        }
        rec_resp = await _call_recs_suggest(rec_payload)

        debug_plan["rec_query"] = rec_query

        raw_items = rec_resp.get("items") or []

        items: List[AgentItem] = [
            AgentItem(**it)
            for it in raw_items
            if isinstance(it, dict) and it.get("slug")
        ]

        debug_plan["rec_item_count"] = len(items)

        if items:
            return AgentOut(
                kind="recommendations",
                answer="Here are some options that match what you asked for.",
                citations=[],
                items=items,
                debug_plan=debug_plan,
            )

        # if no items, we fall through to RAG / chat answer below

    # ------------- Branch 4: generic fallback -----------------------------
    # Decide between history-aware chat LLM vs RAG product answer.
 
    use_llm_chat = intent_kind in ("generic", "policy", "history_meta", "unknown")

    if use_llm_chat and not wants_cart and not wants_recs:
        llm_resp = await _call_llm_with_history(body, intent_kind=intent_kind)
        debug_plan["llm_used"] = True
        debug_plan["llm_history_len"] = llm_resp.get("history_len", 0)

        return AgentOut(
            kind="answer",
            answer=llm_resp.get("answer") or "Sorry, I couldn’t generate a response.",
            citations=[],
            items=[],
            debug_plan=debug_plan,
        )

    debug_plan["llm_used"] = False

    # Fallback: default to RAG answer
    rag_resp = await _call_rag(q, body.top_k)
    answer = rag_resp.get("answer") or "Sorry, I couldn’t find that."
    citations = rag_resp.get("citations") or []

    return AgentOut(
        kind="answer",
        answer=answer,
        citations=citations,
        items=[],
        debug_plan=debug_plan,
    )



@router.post("/ai/agent/cart_add", response_model=AgentCartAddOut)
async def agent_cart_add(body: AgentCartAddIn) -> AgentCartAddOut:
    """
    Thin wrapper that calls the Django /tools/cart.add endpoint.

    Frontend sends:
      - variantId, size, quantity
      - optional cartId, clerkUserId, guestSessionId, email, idempotencyKey

    We just forward to Django and return its CartSerializer JSON,
    plus top-level cartId + items for convenience.
    """
    # Build payload for Django
    payload: Dict[str, Any] = {
        "variantId": body.variantId,
        "size": body.size,
        "quantity": body.quantity,
    }

    if body.cartId:
        payload["cartId"] = body.cartId
    if body.clerkUserId:
        payload["clerkUserId"] = body.clerkUserId
    if body.guestSessionId:
        payload["guestSessionId"] = body.guestSessionId
    if body.email:
        payload["email"] = body.email

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if body.idempotencyKey:
        headers["Idempotency-Key"] = body.idempotencyKey

    url = f"{DJANGO_BASE_URL.rstrip('/')}/tools/cart.add"

    async with httpx.AsyncClient(timeout=10) as cx:
        resp = await cx.post(url, json=payload, headers=headers)

    # Try to parse Django response JSON
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}

    # Extract convenience fields from Django cart payload
    cart_id: Optional[str] = None
    items: List[Dict[str, Any]] = []

    if isinstance(data, dict):
        # CartSerializer typically returns {"id": "...", "items": [...]}
        cart_id = data.get("id") or data.get("cartId")
        raw_items = data.get("items")
        if isinstance(raw_items, list):
            items = raw_items

    # 2xx → ok, else propagate as ok=False but keep payload
    if 200 <= resp.status_code < 300:
        msg = "Item added to cart."
        return AgentCartAddOut(
            ok=True,
            message=msg,
            cart=data,
            cartId=cart_id,
            items=items,
        )

    # Django sent a validation error like "No more stock" etc.
    err_msg = "Failed to add item to cart."
    if isinstance(data, dict) and data.get("error"):
        err_msg = str(data["error"])

    return AgentCartAddOut(
        ok=False,
        message=err_msg,
        cart=data,
        cartId=cart_id,
        items=items,
    )
