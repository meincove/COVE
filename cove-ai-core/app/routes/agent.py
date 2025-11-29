from __future__ import annotations

import logging
import os
import re
import json
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing_extensions import Literal

from app.vector.store import connect
from app.vector.store import get_conn
from app.agent.orchestrator import classify
from app.routes.rag import _parse_query_attrs  # reuse the same attrs logic as RAG
from app.agent.filters import (
    parse_numeric_filters,
    build_filters,
    is_structured_product_query,
    build_rec_query,
)
from app.providers.llm import LLMClient  # history-aware chat LLM

DJANGO_BASE_URL = os.getenv("DJANGO_BASE_URL", "http://127.0.0.1:8001")
log = logging.getLogger("cove.agent")
router = APIRouter()

#_conn = None  # shared read-only connection


# ---------- I/O models ----------


from typing_extensions import Literal
# ...

class AgentIn(BaseModel):
    message: str
    top_k: int = 6

    # optional context for cart + user
    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    email: Optional[str] = None

    # NEW: how much per-user history to use in the LLM fallback
    # "user" = normal behavior, "none" = treat as fresh chat turn
    historyScope: Literal["user", "none"] = "user"


import re  # already imported at top, just make sure it's there


def _is_short_smalltalk(msg: str, intent_kind: str) -> bool:
    """
    Detect very short, non-question messages that are likely just casual smalltalk.

    Heuristics (no hard-coded greeting words):
    - only for generic/unknown intents
    - message length is short
    - no question mark
    - few tokens
    """
    q = (msg or "").strip()
    if not q:
        return False

    # only consider for generic/unknown intents
    if intent_kind not in ("generic", "unknown"):
        return False

    # very short text only
    if len(q) > 40:
        return False

    # if it's a question, treat normally
    if "?" in q:
        return False

    # token count heuristic: very few words → likely greeting / smalltalk
    tokens = re.findall(r"\w+", q.lower())
    if len(tokens) == 0:
        return False
    if len(tokens) > 4:
        return False

    return True


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

    Returns:
      - dict profile JSON if found
      - None if profile does not exist (404)
      - None on network / server error (with warning)
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

        if r.status_code == 404:
            # Normal case for a new Clerk user: no AI profile row yet.
            log.info(
                "ai_profile_get 404 (no profile yet) for clerkUserId=%s",
                clerk_user_id,
            )
            return None

        # Anything else is an actual problem (500, 502, etc.)
        log.warning(
            "ai_profile_get non-200 %s for clerkUserId=%s: %s",
            r.status_code,
            clerk_user_id,
            r.text,
        )
    except Exception as e:
        log.warning("ai_profile_get failed for clerkUserId=%s: %s", clerk_user_id, e)

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
            merged["color"] = str(colors[0]).lower().strip()

    # Size personalization (top is safest generic default)
    if "size" not in merged:
        sz_top = (profile.get("preferred_size_top") or "").upper().strip()
        if sz_top:
            merged["size"] = sz_top

    return merged


# ---------------------------------------------------------
# Lightweight in-memory cache of last recommendations
# keyed by cartId / clerkUserId / guestSessionId.
# For multi-worker prod you'd swap this for Redis/DB.
# ---------------------------------------------------------

# ---------------------------------------------------------
# Lightweight in-memory session caches.
# For multi-worker prod you'd swap this for Redis/DB.
# ---------------------------------------------------------

_SESSION_RECS: Dict[str, List[Dict[str, Any]]] = {}
_SESSION_LAST_USER_MSG: Dict[str, str] = {}




def _session_key_from_body(body: AgentIn) -> Optional[str]:
    if body.cartId:
        return f"cart:{body.cartId}"
    if body.clerkUserId:
        return f"user:{body.clerkUserId}"
    if body.guestSessionId:
        return f"guest:{body.guestSessionId}"
    return None


def _store_session_recs(body: AgentIn, items: List[AgentItem]) -> None:
    key = _session_key_from_body(body)
    if not key:
        return
    _SESSION_RECS[key] = [it.dict() for it in items]


def _get_session_recs(body: AgentIn) -> List[Dict[str, Any]]:
    key = _session_key_from_body(body)
    if not key:
        return []
    return _SESSION_RECS.get(key, [])

def _update_last_user_message(body: AgentIn) -> None:
    """
    Remember the latest user message per logical session
    (cartId / clerkUserId / guestSessionId).
    """
    key = _session_key_from_body(body)
    if not key:
        return
    _SESSION_LAST_USER_MSG[key] = body.message


def _get_last_user_message(body: AgentIn) -> Optional[str]:
    """
    Fetch the previous user message for this logical session,
    if we have one.
    """
    key = _session_key_from_body(body)
    if not key:
        return None
    return _SESSION_LAST_USER_MSG.get(key)


async def _select_from_last_recs_via_llm(
    message: str,
    last_items: List[Dict[str, Any]],
    prev_user_message: Optional[str] = None,
) -> Optional[List[int]]:
    """
    Use the LLM to choose which item indices (0-based) in last_items
    the user is referring to, based on their free-text message and,
    optionally, the previous user message.

    Returns:
      - list of indices [i, j, ...] if the model is confident that
        the user refers to exactly one or several specific items
      - None if ambiguous / no selection
    """
    if not last_items:
        return None

    # Expose only safe metadata to the model.
    items_for_llm: List[Dict[str, Any]] = []
    for idx, raw in enumerate(last_items):
        items_for_llm.append(
            {
                "index": idx,
                "title": raw.get("title"),
                "type": raw.get("type"),
                "color": raw.get("color"),
                "size": raw.get("size"),
                "slug": raw.get("slug"),
                "variantId": raw.get("variantId"),
            }
        )

    system_prompt = """You are a helper that selects products from a list.

You will receive:
- 'items': a JSON array of visible products, each with an 'index' (0-based) and simple metadata.
- 'user_message': the user's current message.
- optionally 'previous_user_message': what the user said in the previous turn.

Goals:
- Decide whether the user is clearly referring to:
    * exactly ONE item, or
    * several specific items, or
    * no clear subset.
- The user may refer using:
    * position ("the first hoodie", "item #2", "second and third"),
    * descriptions (black hoodie, navy tee),
    * colours,
    * sizes,
    * or pronouns ("this one", "that hoodie", "both of these").

Output rules:
- If they clearly refer to ONE item, respond:
    {"mode": "one", "indices": [N]}
  where N is the 0-based index from 'items'.
- If they clearly refer to SEVERAL specific items, respond:
    {"mode": "many", "indices": [N1, N2, ...]}
- If it is ambiguous, or refers to a group like "all hoodies" without
  specifying which of our items, respond:
    {"mode": "none", "indices": []}

Requirements:
- Always respond with JSON ONLY, no explanations.
- 'indices' must be a list of unique integers within the valid range of the items array.
"""

    user_payload: Dict[str, Any] = {
        "items": items_for_llm,
        "user_message": message,
    }
    if prev_user_message:
        user_payload["previous_user_message"] = prev_user_message

    client = LLMClient()
    raw = await client.generate(
        [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": json.dumps(user_payload, ensure_ascii=False),
            },
        ]
    )

    try:
        text = raw.strip()
        # Some models may wrap JSON in ```...``` or ```json ...```
        if text.startswith("```"):
            text = text.strip("`").strip()
            if text.lower().startswith("json"):
                text = text[4:].lstrip()
        data = json.loads(text)
    except Exception:
        return None

    mode = data.get("mode")
    indices_raw = data.get("indices", [])

    if not isinstance(indices_raw, list):
        return None

    # Normalise + validate indices
    indices: List[int] = []
    for x in indices_raw:
        if isinstance(x, int) and 0 <= x < len(last_items):
            if x not in indices:
                indices.append(x)

    if not indices:
        return None

    if mode not in ("one", "many"):
        return None

    return indices



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
    *,
    smalltalk: bool = False,
) -> List[Dict[str, str]]:
    """
    Convert history rows into OpenAI-style messages, plus current user turn.
    """
    is_first_turn = len(history) == 0

    system_content = (
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
        "2. Only if the user explicitly asks about one of those, and you do NOT have explicit "
        "   information from the messages so far, say clearly that this information is not configured yet "
        "   and suggest checking the website or contacting support. Do NOT volunteer these limitations "
        "   in casual greetings or unrelated answers.\n"
        "3. When summarising or referring to past turns, be precise and faithful to what "
        "   the user actually said earlier. If you are unsure, say you are not sure.\n"
        "4. For general style, brand vibe, or non-operational questions, you may answer "
        "   in a friendly, concise way, but stay plausible for a modern minimal streetwear brand.\n"
        "5. Do NOT talk about what you *cannot* do (e.g. 'I can't add to cart in chat') unless the user "
        "   explicitly asks about that capability. Focus on what you *can* help with instead.\n"
    )

    if smalltalk:
        system_content += (
            "\n\nThe user's current message is a very short, non-question smalltalk message. "
            "Reply with a short friendly greeting and ONE short line about how you can help "
            "with Cove products, sizes, or outfit ideas. "
            "Do NOT mention stock configuration, availability, cart or checkout limitations, "
            "or any specific past products in this reply. "
            "Do NOT refer to earlier conversations unless the user explicitly mentions them "
            "in this message."
        )
    elif is_first_turn:
        system_content += (
            "\n\nThis is the first message in the current chat session. "
            "You only see the user's current message; do NOT assume they are still "
            "asking about anything from a previous visit (such as specific hoodies, sizes, etc.). "
            "Only bring up previous topics if the user clearly refers to them."
        )
    else:
        system_content += (
            "\n\nUse the conversation history below when it is clearly relevant to the user's "
            "current message, but do not hallucinate topics that were never mentioned."
        )

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": system_content}
    ]

    for row in history:
        role = row.get("role") or "user"
        if role not in ("user", "assistant", "system"):
            if role.lower() in ("bot", "assistant", "ai"):
                role = "assistant"
            else:
                role = "user"

        content = str(row.get("content") or "").strip()
        if not content:
            continue

        messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})
    return messages




async def _call_llm_with_history(
    body: AgentIn,
    intent_kind: str,
) -> Dict[str, Any]:
    """
    History-aware general chat fallback.

    - If historyScope == "none": skip history entirely.
    - Else: fetch recent history based on clerkUserId / guestSessionId.
    """
    if body.historyScope == "none":
        history: List[Dict[str, Any]] = []
    else:
        history = await _fetch_history_for_llm(
            body.clerkUserId,
            body.guestSessionId,
            limit=20,
        )

    # generic structural check: very short, non-question, generic intent
    smalltalk = _is_short_smalltalk(body.message, intent_kind)

    messages = _history_to_llm_messages(
        history,
        body.message,
        smalltalk=smalltalk,
    )

    client = LLMClient()
    text = await client.generate(messages)

    return {
        "answer": text,
        "history_len": len(history),
        "intent_kind": intent_kind,
        "history_scope": body.historyScope,
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


from app.vector.store import get_conn
...
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
    q = body.message
    prev_user_message = _get_last_user_message(body)
    _update_last_user_message(body)

    # 0) Optional AI profile lookup for signed-in users
    ai_profile: Optional[Dict[str, Any]] = None
    if body.clerkUserId:
        ai_profile = await _load_ai_profile(body.clerkUserId)

    # 1) DB-dependent parsing: use a *fresh* connection from the pool
    with get_conn() as conn:
        # 1a) Parse attributes (colors/types/sizes) using the same logic as RAG
        attrs = _parse_query_attrs(conn, q)

        # 1b) Parse numeric filters (price range etc.) in a generic way
        numeric_filters = parse_numeric_filters(q)

        # 1c) Merge into a unified filters dict for recs / tools
        base_filters: Dict[str, Any] = build_filters(attrs, numeric_filters)

    # 1d) Apply AI profile as fallback (never overriding explicit query filters)
    rec_filters: Dict[str, Any] = _apply_profile_defaults_to_filters(
        base_filters,
        ai_profile,
    )

    # 2) Classify high-level intent (size_fit, policy, lookup_product, discover, etc.)
    intent = await classify(q, attrs)
    intent_kind = getattr(intent, "kind", "generic")
    has_price_filter = getattr(intent, "has_price_filter", False)


    # 1d) Apply AI profile as fallback (never overriding explicit query filters)
    rec_filters: Dict[str, Any] = _apply_profile_defaults_to_filters(base_filters, ai_profile)

    # 2) Classify high-level intent (size_fit, policy, lookup_product, discover, etc.)
    intent = await classify(q, attrs)
    intent_kind = getattr(intent, "kind", "generic")
    has_price_filter = getattr(intent, "has_price_filter", False)

    # 3) Decide if user wants cart vs recs vs plain RAG / chat
    wants_cart = _looks_like_cart_add(q)  # keep this conservative

    # Only discovery intent should go to recommendations.
    # All other intents (lookup_product, policy, care, unknown, history_meta)
    # should be answered via RAG or LLM, not recs.
    wants_recs = (not wants_cart) and (intent_kind == "discover")

    debug_plan: Dict[str, Any] = {
        "intent_kind": intent_kind,
        "has_price_filter": has_price_filter,
        "wants_cart": wants_cart,
        "wants_recs": wants_recs,
        "attrs": attrs,
        "numeric_filters": numeric_filters or None,
        "rec_filters": rec_filters or None,
        "llm_used": False,
        "history_scope": body.historyScope,
    }


    if ai_profile:
        debug_plan["ai_profile_used"] = True
        debug_plan["ai_profile_status"] = "loaded"
        debug_plan["ai_profile_keys"] = sorted(ai_profile.keys())
    else:
        if body.clerkUserId:
            debug_plan["ai_profile_used"] = False
            debug_plan["ai_profile_status"] = "missing_for_clerk_user"
        else:
            debug_plan["ai_profile_used"] = False
            debug_plan["ai_profile_status"] = "no_clerk_user"


    # ------------- Branch 1: cart_proposal (plan only, no side-effects) -------------
    if wants_cart:
        # First try: resolve from the last recommendations (context-aware "this/second one")
        last_recs = _get_session_recs(body)
        debug_plan["last_recs_count"] = len(last_recs)

        if last_recs:
            indices = await _select_from_last_recs_via_llm(
                message=q,
                last_items=last_recs,
                prev_user_message=prev_user_message,
            )
            debug_plan["cart_source"] = "last_recs"
            debug_plan["cart_selected_indices"] = indices
            debug_plan["cart_prev_user_message"] = prev_user_message

            # --- Case A: exactly ONE item resolved → normal cart_proposal ---
            if indices and len(indices) == 1:
                chosen_raw = last_recs[indices[0]]
                top = AgentItem(**chosen_raw)

                # Prefer an explicit size from the current message (rec_filters)
                # but fall back to the size on the recommended item.
                chosen_size = rec_filters.get("size") or top.size
                nice_type = (top.type or rec_filters.get("type") or "item").lower()
                nice_color = (top.color or rec_filters.get("color") or "").lower()
                nice_size = (chosen_size or "").upper()

                parts: List[str] = ["Do you want me to add this"]
                if nice_color:
                    parts.append(nice_color)
                parts.append(nice_type)
                if nice_size:
                    parts.append(f"in size {nice_size}")
                parts.append("to your cart?")
                answer = " ".join(parts).replace("  ", " ").strip()

                cart_payload = {
                    "variantId": top.variantId,
                    "size": chosen_size,
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
                    items=[top],
                    cart_payload=cart_payload,
                    debug_plan=debug_plan,
                )

            # --- Case B: several items resolved → list them, ask user to choose ---
            if indices and len(indices) > 1:
                items: List[AgentItem] = []
                for i in indices:
                    if 0 <= i < len(last_recs):
                        raw = last_recs[i]
                        if isinstance(raw, dict) and raw.get("slug"):
                            items.append(AgentItem(**raw))

                debug_plan["cart_multi_candidates"] = [
                    it.slug for it in items if it.slug
                ]

                if items:
                    return AgentOut(
                        kind="recommendations",
                        answer=(
                            "You mentioned more than one item. "
                            "Please tap a specific product or tell me which number to add "
                            "(for example: “add the first hoodie in size M”)."
                        ),
                        citations=[],
                        items=items,
                        cart_payload=None,
                        debug_plan=debug_plan,
                    )


        # Second try: user message itself contains enough structured product info
        structured_product = is_structured_product_query(attrs)
        debug_plan["cart_structured_product"] = bool(structured_product)

        if structured_product:
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

                chosen_size = rec_filters.get("size") or top.size
                nice_type = (top.type or rec_filters.get("type") or "item").lower()
                nice_color = (top.color or rec_filters.get("color") or "").lower()
                nice_size = (top.size or rec_filters.get("size") or "").upper()

                parts: List[str] = ["Do you want me to add this"]
                if nice_color:
                    parts.append(nice_color)
                parts.append(nice_type)
                if nice_size:
                    parts.append(f"in size {nice_size}")
                parts.append("to your cart?")
                answer = " ".join(parts).replace("  ", " ").strip()

                cart_payload = {
                    "variantId": top.variantId,
                    "size": chosen_size,
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

            debug_plan["cart_add_note"] = "no_matching_item_from_recs"

        # Third try: we have cart intent but no resolvable item → ask user
        debug_plan["cart_add_note"] = "cart_intent_but_no_resolvable_item"
        return AgentOut(
            kind="answer",
            answer=(
                "I’m not sure which item you want me to add. "
                "Please either click a specific product or say something like "
                "“Add the black hoodie in size M to my cart” or "
                "“Add the second hoodie to my cart.”"
            ),
            citations=[],
            items=[],
            cart_payload=None,
            debug_plan=debug_plan,
        )

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
            # Remember this set for follow-up cart actions
            _store_session_recs(body, items)

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
        debug_plan["history_scope"] = llm_resp.get("history_scope", body.historyScope)

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
