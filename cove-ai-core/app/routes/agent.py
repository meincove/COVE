
from __future__ import annotations

import logging
import os
import sys
import re
import json
from typing import Any, Dict, List, Optional
import time
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
from app.config import DJANGO_BASE_URL, COVE_CORE_BASE_URL
from app.cove_ai_tools import recommendations as tools_recs
from app.cove_ai_tools import size_fit as tools_size_fit
from app.cove_ai_tools import cart as tools_cart
# Week 4 - Phase 4: Commerce tools
from app.cove_ai_tools import checkout as tools_checkout
from app.cove_ai_tools import orders as tools_orders
from app.cove_ai_tools import emails as tools_emails
from app.history_logger import log_history_turn
# Week 4 - Phase 5: Performance optimizations
from app.core.cache import get_cached, set_cached, make_cache_key
from app.core.policy_cache import get_policy_answer
from app.core.performance import measure_time

USE_TOOLS_LAYER = os.getenv("USE_TOOLS_LAYER", "true").lower() == "true"
DISABLE_TOOLS_HTTP_FALLBACK = os.getenv("DISABLE_TOOLS_HTTP_FALLBACK", "false").lower() == "true"
log = logging.getLogger("cove.agent")
router = APIRouter()

# How much history we send per LLM call (after trimming)
MAX_HISTORY_MESSAGES = int(os.getenv("AGENT_MAX_HISTORY_MESSAGES", "8"))

# Above this many messages, we try to summarise older turns
HISTORY_SUMMARY_THRESHOLD = int(os.getenv("AGENT_HISTORY_SUMMARY_THRESHOLD", "16"))

# Safety cap on summary length (characters)
MAX_HISTORY_SUMMARY_CHARS = int(os.getenv("AGENT_MAX_HISTORY_SUMMARY_CHARS", "600"))


class AgentIn(BaseModel):
    message: str
    top_k: int = 6

    # optional context for cart + user
    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    email: Optional[str] = None

    # how much per-user history to use in the LLM fallback
    # "user" = normal behavior, "none" = treat as fresh chat turn
    historyScope: Literal["user", "none"] = "user"


async def _summarise_history_chunk(
    history_chunk: List[Dict[str, Any]],
) -> Optional[str]:
    """
    Summarise older conversation turns into a compact text that
    preserves only what matters for future shopping/size/policy questions.
    """
    if not history_chunk:
        return None

    simplified: List[Dict[str, str]] = []
    for row in history_chunk:
        role = (row.get("role") or "user").lower()
        if role not in ("user", "assistant", "system"):
            role = "user"
        content = str(row.get("content") or "").strip()
        if not content:
            continue
        simplified.append({"role": role, "content": content})

    if not simplified:
        return None

    from app.core.rules import get_prompt
    
    client = LLMClient()
    messages = [
        {
            "role": "system",
            "content": get_prompt(
                "agent_summary",
                default="You summarise previous conversation turns. Write a concise summary."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(simplified, ensure_ascii=False),
        },
    ]

    try:
        text = await client.generate(messages)
        if not text:
            return None
        text = text.strip()
        if len(text) > MAX_HISTORY_SUMMARY_CHARS:
            text = text[:MAX_HISTORY_SUMMARY_CHARS]
        return text or None
    except Exception as e:
        log.warning("history summarisation failed: %s", e, exc_info=True)
        return None


async def _prepare_history_for_llm(
    history: List[Dict[str, Any]],
) -> tuple[Optional[str], List[Dict[str, Any]]]:
    """
    Apply the 'context diet':

      - If history is short (<= MAX_HISTORY_MESSAGES):
          → no summary, use history as-is.
      - If history is longer:
          → keep only the last MAX_HISTORY_MESSAGES entries as the tail,
            and (optionally) summarise the older part into a short text.
    """
    if not history:
        return None, []

    if len(history) <= MAX_HISTORY_MESSAGES:
        return None, history

    tail_count = MAX_HISTORY_MESSAGES
    older = history[:-tail_count]
    tail = history[-tail_count:]

    summary: Optional[str] = None

    if len(history) >= HISTORY_SUMMARY_THRESHOLD:
        summary = await _summarise_history_chunk(older)

    return summary, tail


from app.core.rules import get_regex_rules

def _is_short_smalltalk(msg: str, intent_kind: str) -> bool:
    """
    Detect very short, non-question messages that are likely just casual smalltalk.
    """
    q = (msg or "").strip()
    if not q:
        return False

    if intent_kind not in ("generic", "unknown"):
        return False

    rules = get_regex_rules().get("smalltalk", {})
    max_len = rules.get("max_length", 40)
    max_tokens = rules.get("max_tokens", 4)

    if len(q) > max_len:
        return False

    if "?" in q:
        return False

    tokens = re.findall(r"\w+", q.lower())
    if len(tokens) == 0:
        return False
    if len(tokens) > max_tokens:
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


# Week 4: Agentic Enhancement - Visible Thinking Status
class AgentStatus(BaseModel):
    """Status updates to show agent's thinking process"""
    kind: Literal["status"]
    status: Literal[
        "searching",
        "analyzing",
        "reasoning",
        "comparing",
        "recommending",
        "adding_to_cart",
        "creating_checkout"
    ]
    message: str
    details: Optional[str] = None


class AgentOut(BaseModel):
    kind: Literal["answer", "recommendations", "cart_proposal", "checkout_ready"]
    answer: str
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    items: List[AgentItem] = Field(default_factory=list)
    cart_payload: Optional[Dict[str, Any]] = None
    checkout: Optional[Dict[str, Any]] = None  # Week 4: For checkout_ready responses
    thinking_steps: Optional[List[Dict[str, str]]] = None  # Week 4: Agentic - Show reasoning
    debug_plan: Optional[Dict[str, Any]] = None


class AgentCartAddIn(BaseModel):
    variantId: str
    size: Optional[str] = None  # Allow None for cart proposals without size
    quantity: int = 1

    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    email: Optional[str] = None
    idempotencyKey: Optional[str] = None


class AgentCartAddOut(BaseModel):
    ok: bool
    message: str
    cart: Dict[str, Any]
    cartId: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)


# ---------- Small helpers ----------


def _looks_like_cart_add(msg: str) -> bool:
    """
    Conservative detector for "add to cart" / "buy this" intents.
    """
    q = msg.lower()
    rules = get_regex_rules().get("cart", {})

    # 1. Phrases
    phrases = rules.get("phrases", [])
    if "cart" in q and any(kw in q for kw in phrases):
        return True

    # 2. Buy verbs
    if pattern := rules.get("buy_verbs"):
        if re.search(pattern, q):
            return True

    # 3. "Add this" + product type
    add_pat = rules.get("add_pattern")
    prod_pat = rules.get("product_types")
    
    if add_pat and prod_pat:
        if re.search(add_pat, q) and re.search(prod_pat, q):
            return True

    return False


# ---------- AI profile integration ----------


async def _load_ai_profile(clerk_user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch AiUserProfile snapshot from Django.
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
            log.info(
                "ai_profile_get 404 (no profile yet) for clerkUserId=%s",
                clerk_user_id,
            )
            return None

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
    """
    if not profile:
        return rec_filters

    merged = dict(rec_filters)

    if "color" not in merged:
        colors = profile.get("preferred_colors") or []
        if isinstance(colors, list) and colors:
            merged["color"] = str(colors[0]).lower().strip()

    if "size" not in merged:
        sz_top = (profile.get("preferred_size_top") or "").upper().strip()
        if sz_top:
            merged["size"] = sz_top

    return merged


# ---------- In-memory session caches (single-process only) ----------

_SESSION_RECS: Dict[str, List[Dict[str, Any]]] = {}
_SESSION_LAST_USER_MSG: Dict[str, str] = {}
# Week 4: Track when we asked user for size
_SESSION_AWAITING_SIZE: Dict[str, Dict[str, Any]] = {}  # {session_key: {product, variantId, ...}}


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


def _set_awaiting_size(body: AgentIn, product_info: Dict[str, Any]) -> None:
    """Store that we're waiting for size input from this session."""
    key = _session_key_from_body(body)
    if key:
        _SESSION_AWAITING_SIZE[key] = product_info


def _get_awaiting_size(body: AgentIn) -> Optional[Dict[str, Any]]:
    """Get product info if we're waiting for size from this session."""
    key = _session_key_from_body(body)
    if not key:
        return None
    return _SESSION_AWAITING_SIZE.get(key)


def _clear_awaiting_size(body: AgentIn) -> None:
    """Clear size-awaiting state."""
    key = _session_key_from_body(body)
    if key and key in _SESSION_AWAITING_SIZE:
        del _SESSION_AWAITING_SIZE[key]


def _update_last_user_message(body: AgentIn) -> None:
    key = _session_key_from_body(body)
    if not key:
        return
    _SESSION_LAST_USER_MSG[key] = body.message


def _get_last_user_message(body: AgentIn) -> Optional[str]:
    key = _session_key_from_body(body)
    if not key:
        return None
    return _SESSION_LAST_USER_MSG.get(key)


async def _select_from_last_recs_via_llm(
    message: str,
    last_items: List[Dict[str, Any]],
    prev_user_message: Optional[str] = None,
) -> List[int]:
    """
    Use the LLM to choose which item indices the user refers to,
    based on their free-text message + previous user message.
    """
    if not last_items:
        return []

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
- The user may refer using positions, descriptions, colours, sizes, or pronouns.

Output rules:
- If they clearly refer to ONE item, respond:
    {"mode": "one", "indices": [N]}
- If they clearly refer to SEVERAL specific items, respond:
    {"mode": "many", "indices": [N1, N2, ...]}
- If it is ambiguous, respond:
    {"mode": "none", "indices": []}

Always respond with JSON only.
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
        print(f"[_get_history] Requesting {url} with params={params}", file=sys.stderr)
        async with httpx.AsyncClient(timeout=10) as cx:
            r = await cx.get(url, params=params)
        print(f"[_get_history] Response {r.status_code}: {r.text[:200]}", file=sys.stderr)
        if r.status_code != 200:
            log.warning("history_get non-200 %s: %s", r.status_code, r.text)
            return []
        data = r.json()
        msgs = data.get("items") or data.get("messages") or []  # Support both new and old format
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
    summary: Optional[str] = None,
) -> List[Dict[str, str]]:
    """
    Convert history rows (already trimmed) into OpenAI-style messages,
    optionally prepending a summary of older turns.
    """
    from app.core.rules import get_prompt
    
    is_first_turn = len(history) == 0

    system_content = get_prompt(
        "agent_chat",
        default="You are Cove AI, a helpful assistant."
    )

    if smalltalk:
        system_content += (
            "\n\nThe user's current message is a very short, non-question smalltalk message. "
            "Reply with a short friendly greeting and ONE short line about how you can help "
            "with Cove products, sizes, or outfit ideas today."
        )
    elif is_first_turn:
        system_content += (
            "\n\nThis is the first message in the current chat session. "
            "You only see the user's current message; do NOT assume they are still "
            "asking about anything from a previous visit."
        )
    else:
        system_content += (
            "\n\nUse the conversation history below when it is clearly relevant to the user's "
            "current message, but do not hallucinate topics that were never mentioned."
        )

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": system_content}
    ]

    if summary:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Summary of earlier conversation (for context only; "
                    "do not repeat verbatim unless the user asks): "
                    + summary
                ),
            }
        )

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


async def _build_discover_intro(
    body: AgentIn,
    items: List[AgentItem],
    rec_filters: Dict[str, Any],
    attrs: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate personalized intro for discover responses using LLM.
    Returns dict with: text, llm_used, history_len, summary_used
    """
    default_text = "Here are some options that match what you asked for."

    if not items:
        return {"text": default_text, "llm_used": False, "history_len": 0, "summary_used": False}

    # If user disabled history, return generic intro
    if body.historyScope == "none":
        return {"text": default_text, "llm_used": False, "history_len": 0, "summary_used": False}

    # Fetch history
    raw_history = await _fetch_history_for_llm(body.clerkUserId, body.guestSessionId, limit=20)
    history_len = len(raw_history)

    if history_len == 0:
        return {"text": default_text, "llm_used": False, "history_len": 0, "summary_used": False}

    summary, _ = await _prepare_history_for_llm(raw_history)

    # Small preview of items
    items_preview = []
    for it in items[:3]:
        items_preview.append({
            "title": it.title,
            "type": it.type,
            "color": it.color,
            "size": it.size,
            "tier": it.tier,
        })

    system_prompt = """You write ONE short intro sentence for product recommendations.

Input JSON has: message, attrs, rec_filters, items_preview, history_len, summary.

Rules:
- If history_len == 0 OR summary is empty: write a generic intro.
- If history_len > 0 AND summary exists: MAY lightly reference style/chat history.
- Max 22 words. Friendly, concise, minimal modern vibe.
- Output ONLY the sentence. No JSON, no quotes.
"""

    user_payload = {
        "message": body.message,
        "attrs": attrs,
        "rec_filters": rec_filters,
        "items_preview": items_preview,
        "history_len": history_len,
        "summary": summary or "",
    }

    client = LLMClient()
    try:
        text = await client.generate([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ])
        text = (text or "").strip()
        if not text:
            raise ValueError("empty intro from LLM")

        if len(text) > 250:
            text = text[:250]

        return {"text": text, "llm_used": True, "history_len": history_len, "summary_used": bool(summary)}
    except Exception as e:
        log.warning("discover intro LLM failed: %s", e)
        return {"text": default_text, "llm_used": False, "history_len": history_len, "summary_used": bool(summary)}


async def _call_llm_with_history(
    body: AgentIn,
    intent_kind: str,
) -> Dict[str, Any]:
    """
    History-aware general chat fallback.
    """
    raw_history_len = 0
    summary: Optional[str] = None

    if body.historyScope == "none":
        history: List[Dict[str, Any]] = []
    else:
        raw_history = await _fetch_history_for_llm(
            body.clerkUserId,
            body.guestSessionId,
            limit=20,
        )
        raw_history_len = len(raw_history)
        summary, history = await _prepare_history_for_llm(raw_history)

    smalltalk = intent_kind in ("greeting", "small_talk")
    if not smalltalk:
        smalltalk = _is_short_smalltalk(body.message, intent_kind)

    messages = _history_to_llm_messages(
        history,
        body.message,
        smalltalk=smalltalk,
        summary=summary,
    )

    client = LLMClient()
    text = await client.generate(messages)

    return {
        "answer": text,
        "history_len": raw_history_len,
        "history_tail_len": len(history),
        "summary_used": bool(summary),
        "history_scope": body.historyScope,
    }


# ---------- RAG / RECS / FIT delegates ----------


async def _call_rag(query: str, top_k: int) -> Dict[str, Any]:
    """
    Delegate to /ai/rag/query via HTTP.
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
    Wrapper around Cove's recommendations logic (tools first, then HTTP).
    """
    if USE_TOOLS_LAYER:
        try:
            query = payload.get("query") or ""
            filters = payload.get("filters") or {}
            top_k = int(payload.get("top_k") or 4)

            tool_input: Dict[str, Any] = {
                "query": query,
                "filters": filters,
                "top_k": top_k,
            }

            tool_resp = await tools_recs.recommend_products(tool_input)

            if isinstance(tool_resp, dict):
                return tool_resp

            log.warning("recommend_products returned non-dict: %r", type(tool_resp))
        except Exception:
            log.exception("recommend_products tool failed")

            if DISABLE_TOOLS_HTTP_FALLBACK:
                return {}

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

    return {}


# --- FIT integration helpers -------------------------------------------------


def _extract_body_metrics(msg: str) -> Optional[Dict[str, float]]:
    q = msg.lower()

    h_match = re.search(r"(\d{2,3})\s*cm", q)
    w_match = re.search(r"(\d{2,3})\s*kg", q)

    if not h_match or not w_match:
        return None

    try:
        height_cm = float(h_match.group(1))
        weight_kg = float(w_match.group(1))
    except Exception:
        return None

    if not (140 <= height_cm <= 210 and 40 <= weight_kg <= 160):
        return None

    return {"height_cm": height_cm, "weight_kg": weight_kg}


def _infer_fit_preference(msg: str) -> str:
    q = msg.lower()

    if any(k in q for k in ("oversize", "oversized", "baggy", "very loose")):
        return "oversized"
    if any(k in q for k in ("loose", "relaxed")):
        return "loose"
    if any(k in q for k in ("tight", "snug", "body fit", "slim fit", "slim")):
        return "slim"
    if any(k in q for k in ("regular fit", "standard fit", "normal fit")):
        return "regular"

    return "regular"


async def _call_fit_recommend(
    message: str,
    attrs: Dict[str, Any],
    profile: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    metrics = _extract_body_metrics(message)
    if not metrics:
        return None

    product_type = None
    if attrs.get("types"):
        product_type = attrs["types"][0]

    fit_pref = _infer_fit_preference(message)
    if fit_pref == "regular" and profile:
        prof_pref = (profile.get("preferred_fit") or "").lower().strip()
        if prof_pref in (
            "tight",
            "regular",
            "loose",
            "slim",
            "oversized",
            "relaxed",
            "baggy",
        ):
            fit_pref = prof_pref

    payload: Dict[str, Any] = {
        "gender": None,
        "height_cm": metrics["height_cm"],
        "weight_kg": metrics["weight_kg"],
        "fit_preference": fit_pref,
        "product_type": product_type,
        "slug": None,
    }

    if USE_TOOLS_LAYER:
        try:
            tool_input = dict(payload)
            resp = await tools_size_fit.get_size_fit_advice(tool_input)

            if isinstance(resp, dict):
                return resp

            log.warning("get_size_fit_advice returned non-dict: %r", type(resp))
        except Exception:
            log.exception("get_size_fit_advice tool failed")
            if DISABLE_TOOLS_HTTP_FALLBACK:
                return None

    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/fit/recommend",
                json=payload,
            )
        if r.status_code == 200:
            return r.json()
        log.warning("fit.recommend non-200 %s: %s", r.status_code, r.text)
    except Exception:
        log.exception("fit.recommend failed")

    return None


# ---------- Main agent endpoint ----------



@router.post("/ai/agent/query", response_model=AgentOut)
async def agent_query(body: AgentIn) -> AgentOut:
    t0 = time.perf_counter()
    out: AgentOut = await _agent_query_impl(body)
    t_end = time.perf_counter()
    total_ms = int((t_end - t0) * 1000)

    log.info(
        "agent_timing",
        extra={
            "parse_ms": None,
            "retrieval_ms": None,
            "llm_ms": None,
            "total_ms": total_ms,
            "kind": getattr(out, "kind", None),
        },
    )

    # Log conversation history (fire-and-forget, won't break on errors)
    try:
        # Extract items metadata for logging
        items_meta = []
        if hasattr(out, "items") and out.items:
            try:
                items_meta = [item.dict() for item in out.items]
            except Exception:
                items_meta = [dict(item) for item in out.items]
        
        # Extract debug plan
        debug_plan = getattr(out, "debug_plan", {}) or {}
        
        await log_history_turn(
            user_message=body.message,
            assistant_message=getattr(out, "answer", ""),
            user_kind=debug_plan.get("intent_kind", "unknown"),
            assistant_kind=getattr(out, "kind", "answer"),
            guest_session_id=body.guestSessionId or "",
            clerk_user_id=body.clerkUserId or "",
            email=body.email or "",
            user_meta={
                "historyScope": body.historyScope,
                "intent_kind": debug_plan.get("intent_kind"),
                "attrs": debug_plan.get("attrs"),
                "numeric_filters": debug_plan.get("numeric_filters"),
            },
            assistant_meta={
                "items": items_meta,
                "cart_payload": getattr(out, "cart_payload", None),
                "rec_filters": debug_plan.get("rec_filters"),
            },
        )
    except Exception as e:
        log.warning(f"Failed to log conversation history: {e}", exc_info=False)

    return out


async def _agent_query_impl(body: AgentIn) -> AgentOut:
    q = body.message
    prev_user_message = _get_last_user_message(body)
    _update_last_user_message(body)

    ai_profile: Optional[Dict[str, Any]] = None
    if body.clerkUserId:
        ai_profile = await _load_ai_profile(body.clerkUserId)

    with get_conn() as conn:
        attrs = _parse_query_attrs(conn, q)
        numeric_filters = parse_numeric_filters(q)
        base_filters: Dict[str, Any] = build_filters(attrs, numeric_filters)

    rec_filters: Dict[str, Any] = _apply_profile_defaults_to_filters(
        base_filters,
        ai_profile,
    )

    intent = await classify(q, attrs)
    intent_kind = getattr(intent, "kind", "generic")
    has_price_filter = getattr(intent, "has_price_filter", False)

    # Don't treat checkout intent as cart_add
    wants_cart = _looks_like_cart_add(q) and intent_kind != "checkout_start"
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
    
    # Week 4: Check if we were awaiting size input
    awaiting = _get_awaiting_size(body)
    if awaiting:
        # If user is starting a new discover query, clear stale awaiting state
        if intent_kind == "discover" and not _looks_like_cart_add(q):
            _clear_awaiting_size(body)
            awaiting = None  # Treat as if no awaiting state
        
    if awaiting:
        # Only process size if this looks like JUST a size response
        # Use existing cart add detection (no hardcoding!)
        size = None
        
        # Check if message looks like cart add intent using existing function
        has_cart_intent = _looks_like_cart_add(q)
        
        # Only extract size if NOT a cart add command
        if not has_cart_intent:
            match = re.search(r'\b(?:size\s+)?([smlxSMLX]{1,3})\b', q)
            if match:
                size = match.group(1).upper()
        
        if size:
            # Clear the awaiting state
            _clear_awaiting_size(body)
            
            # Recreate cart_proposal with the size
            product = awaiting["product"]
            top = AgentItem(**product)
            
            nice_type = (top.type or "").lower()
            nice_color = (top.color or "").lower()
            
            parts = ["Do you want me to add this"]
            if nice_color:
                parts.append(nice_color)
            parts.append(nice_type)
            parts.append(f"in size {size}")
            parts.append("to your cart?")
            answer = " ".join(parts).replace("  ", " ").strip()
            
            cart_payload = {
                "variantId": top.variantId,
                "size": size,
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
                debug_plan={**debug_plan, "size_provided_in_followup": True},
            )
        # If has_cart_intent, just fall through - don't clear state, let normal flow handle it

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

    # --- Branch 1: cart_proposal -------------------------------------------------
    if wants_cart:
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

            if indices and len(indices) == 1:
                chosen_raw = last_recs[indices[0]]
                top = AgentItem(**chosen_raw)

                chosen_size = rec_filters.get("size") or top.size
                
                # Week 4: If size not specified, ask user instead of cart_proposal with null
                if not chosen_size:
                    nice_type = (top.type or rec_filters.get("type") or "item").lower()
                    nice_color = (top.color or rec_filters.get("color") or "").lower()
                    product_desc = f"{nice_color} {nice_type}".strip() if nice_color else nice_type
                    
                    # Store that we're awaiting size for this product
                    _set_awaiting_size(body, {
                        "product": top.dict(),
                        "filters": rec_filters,
                    })
                    
                    return AgentOut(
                        kind="answer",
                        answer=f"Great choice! What size would you like for the {product_desc}? (S, M, L, XL)",
                        citations=[],
                        items=[top],
                        debug_plan=debug_plan,
                    )
                
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
                nice_size = (chosen_size or "").upper()

                parts = ["Do you want me to add this"]
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

    # --- Branch 2: size & fit advisor -------------------------------------------
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

        debug_plan["fit_used"] = False

    # --- Branch 2a: CHECKOUT (Week 4) -------------------------------------------
    if intent_kind == "checkout_start":
        try:
            payload = {
                "clerkUserId": body.clerkUserId,
                "guestSessionId": body.guestSessionId,
                "email": body.email,
                "country": "DE",  # Default, could be enhanced with user profile
                "shippingSpeed": "standard",
            }
            
            result = await tools_checkout.checkout_start(payload)
            
            if result.get("ok"):
                checkout_data = result["data"]
                checkout_url = checkout_data["paymentUrl"]
                total = checkout_data.get("total", "0.00")
                
                debug_plan["checkout_used"] = True
                debug_plan["checkout_total"] = total
                
                # Week 4: Offer two checkout options for better UX
                return AgentOut(
                    kind="checkout_ready",
                    answer=f"✅ Checkout ready! Your total is €{total}. Choose how you'd like to proceed:",
                    citations=[],
                    items=[],
                    checkout={
                        "paymentUrl": checkout_url,
                        "checkoutPageUrl": "/checkoutpage",  # Review cart page
                        "total": float(total) if total else 0.0,
                        "currency": "EUR",
                        "checkoutId": checkout_data.get("checkoutId", ""),
                    },
                    debug_plan=debug_plan,
                )
            else:
                error_msg = result.get("error", "Checkout failed")
                debug_plan["checkout_error"] = error_msg
                
                return AgentOut(
                    kind="answer",
                    answer=f"Sorry, I couldn't start checkout: {error_msg}",
                    citations=[],
                    items=[],
                    debug_plan=debug_plan,
                )
        except Exception as e:
            log.exception("checkout_start failed")
            return AgentOut(
                kind="answer",
                answer="Sorry, checkout is temporarily unavailable. Please try again.",
                citations=[],
                items=[],
                debug_plan=debug_plan,
            )

    # --- Branch 2b: ORDER HISTORY (Week 4) --------------------------------------
    if intent_kind == "order_query":
        try:
            payload = {
                "clerkUserId": body.clerkUserId,
                "guestSessionId": body.guestSessionId,
                "email": body.email,
                "limit": 5,
            }
            
            result = await tools_orders.order_get_status(payload)
            
            if result.get("ok"):
                orders = result["data"]["orders"]
                
                if not orders:
                    return AgentOut(
                        kind="answer",
                        answer="You don't have any orders yet. Ready to start shopping?",
                        citations=[],
                        items=[],
                        debug_plan=debug_plan,
                    )
                
                # Format order summary
                summary_lines = []
                for order in orders[:3]:  # Show max 3
                    summary_lines.append(
                        f"• Order #{order['orderId']}: €{order['total']} - "
                        f"{order['itemCount']} items - {order['status']}"
                    )
                
                answer = "Here are your recent orders:\\n" + "\\n".join(summary_lines)
                
                debug_plan["orders_found"] = len(orders)
                
                return AgentOut(
                    kind="answer",
                    answer=answer,
                    citations=[],
                    items=[],
                    debug_plan=debug_plan,
                )
            else:
                error_msg = result.get("error", "Couldn't fetch orders")
                return AgentOut(
                    kind="answer",
                    answer=f"Sorry, {error_msg}",
                    citations=[],
                    items=[],
                    debug_plan=debug_plan,
                )
        except Exception as e:
            log.exception("order_query failed")
            return AgentOut(
                kind="answer",
                answer="Sorry, couldn't retrieve your orders right now.",
                citations=[],
                items=[],
                debug_plan=debug_plan,
            )

    # --- Branch 2c: EMAIL RESEND (Week 4) ---------------------------------------
    if intent_kind == "order_email":
        try:
            # First get last order
            payload = {
                "clerkUserId": body.clerkUserId,
                "guestSessionId": body.guestSessionId,
                "email": body.email,
                "limit": 1,
            }
            
            order_result = await tools_orders.order_get_status(payload)
            
            if order_result.get("ok") and order_result["data"]["orders"]:
                last_order_id = order_result["data"]["orders"][0]["orderId"]
                
                # Resend email
                email_payload = {
                    "orderId": last_order_id,
                    "forceResend": False,
                }
                
                email_result = await tools_emails.email_send_order_confirmation(email_payload)
                
                if email_result.get("ok"):
                    data = email_result["data"]
                    if data["alreadySent"]:
                        answer = f"The confirmation for order #{last_order_id} was already sent to {data['sentTo']}."
                    else:
                        answer = f"✅ Confirmation email sent to {data['sentTo']} for order #{last_order_id}!"
                    
                    debug_plan["email_sent"] = True
                    debug_plan["order_id"] = last_order_id
                    
                    return AgentOut(
                        kind="answer",
                        answer=answer,
                        citations=[],
                        items=[],
                        debug_plan=debug_plan,
                    )
                else:
                    return AgentOut(
                        kind="answer",
                        answer=f"Sorry, couldn't send the email: {email_result.get('error', 'Unknown error')}",
                        citations=[],
                        items=[],
                        debug_plan=debug_plan,
                    )
            else:
                return AgentOut(
                    kind="answer",
                    answer="No orders found to resend confirmation for.",
                    citations=[],
                    items=[],
                    debug_plan=debug_plan,
                )
        except Exception as e:
            log.exception("order_email failed")
            return AgentOut(
                kind="answer",
                answer="Sorry, couldn't resend confirmation email right now.",
                citations=[],
                items=[],
                debug_plan=debug_plan,
            )

    # --- Branch 3: recommendations (browse products) ---------------------------
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
            _store_session_recs(body, items)

            # Generate personalized intro using LLM
            intro_info = await _build_discover_intro(
                body=body,
                items=items,
                attrs=attrs,
                rec_filters=rec_filters,
            )

            debug_plan["llm_discover_intro_used"] = intro_info.get("llm_used", False)
            debug_plan["llm_discover_intro_history_len"] = intro_info.get("history_len", 0)
            debug_plan["llm_discover_intro_summary_used"] = intro_info.get("summary_used", False)

            if intro_info.get("llm_used"):
                debug_plan["llm_used"] = True

            intro_line = intro_info.get("text", "Here are some options that match what you asked for.")

            # Week 4: Agentic Enhancement - Show thinking process
            thinking_steps = [
                {
                    "icon": "🔍",
                    "status": "Searching catalog",
                    "detail": f"Found {len(items)} {rec_filters.get('type', 'items')}"
                },
            ]
            
            if ai_profile:
                thinking_steps.append({
                    "icon": "🧠",
                    "status": "Analyzing preferences",
                    "detail": f"Filtered to {rec_filters.get('tier', 'preferred')} tier"
                })
            
            thinking_steps.append({
                "icon": "✨",
                "status": "Ranking matches",
                "detail": f"Top {len(items)} recommendations ready"
            })

            return AgentOut(
                kind="recommendations",
                answer=intro_line,
                citations=[],
                items=items,
                thinking_steps=thinking_steps,  # Week 4: Show reasoning
                debug_plan=debug_plan,
            )

        # no items → fall through to RAG / chat below

    # --- Branch 4: generic fallback (LLM chat or RAG) --------------------------
    use_llm_chat = intent_kind in (
        "generic",
        "policy",
        "history_meta",
        "unknown",
        "greeting",
        "small_talk",
    )

    if use_llm_chat and not wants_cart and not wants_recs:
        # Phase 5: Check static policy cache first (instant response)
        if intent_kind == "policy":
            policy_answer = get_policy_answer(body.message)
            if policy_answer:
                debug_plan["policy_cache_hit"] = True
                debug_plan["cache_used"] = True
                
                return AgentOut(
                    kind="answer",
                    answer=policy_answer,
                    citations=[],
                    items=[],
                    debug_plan=debug_plan,
                )
        
        # No cache hit, use LLM
        llm_resp = await _call_llm_with_history(body, intent_kind=intent_kind)
        debug_plan["llm_used"] = True
        debug_plan["llm_history_len"] = llm_resp.get("history_len", 0)
        debug_plan["llm_history_tail_len"] = llm_resp.get("history_tail_len", 0)
        debug_plan["llm_history_summary_used"] = llm_resp.get("summary_used", False)
        debug_plan["history_scope"] = llm_resp.get("history_scope", body.historyScope)

        return AgentOut(
            kind="answer",
            answer=llm_resp.get("answer") or "Sorry, I couldn’t generate a response.",
            citations=[],
            items=[],
            debug_plan=debug_plan,
        )

    debug_plan["llm_used"] = debug_plan.get("llm_used", False)

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
    Thin wrapper for cart add that uses the tools layer first,
    then falls back to Django /tools/cart.add if needed.
    """

    def _shape_cart_response(data: Any) -> tuple[Optional[str], list[Dict[str, Any]]]:
        cart_id: Optional[str] = None
        items: list[Dict[str, Any]] = []
        if isinstance(data, dict):
            cart_id = data.get("id") or data.get("cartId")
            raw_items = data.get("items")
            if isinstance(raw_items, list):
                items = raw_items
        return cart_id, items

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

    data: Any = None
    status_ok: bool | None = None

    if USE_TOOLS_LAYER:
        try:
            tool_input = dict(payload)
            if body.idempotencyKey:
                tool_input["idempotencyKey"] = body.idempotencyKey

            tool_resp = await tools_cart.cart_add(tool_input)

            if isinstance(tool_resp, dict) and "cart" in tool_resp:
                data = tool_resp["cart"]
                status_ok = bool(tool_resp.get("ok", True))
            else:
                data = tool_resp
                status_ok = True
        except Exception:
            log.exception("tools_cart.cart_add failed")
            if DISABLE_TOOLS_HTTP_FALLBACK:
                cart_id, items = _shape_cart_response(data or {})
                return AgentCartAddOut(
                    ok=False,
                    message="Cart tool failed.",
                    cart=data or {},
                    cartId=cart_id,
                    items=items,
                )

    if data is None or status_ok is None:
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if body.idempotencyKey:
            headers["Idempotency-Key"] = body.idempotencyKey

        url = f"{DJANGO_BASE_URL.rstrip('/')}/tools/cart.add"

        try:
            async with httpx.AsyncClient(timeout=10) as cx:
                resp = await cx.post(url, json=payload, headers=headers)

            try:
                data = resp.json()
            except Exception:
                data = {"raw": resp.text}

            if 200 <= resp.status_code < 300:
                status_ok = True
            else:
                status_ok = False
        except Exception:
            log.exception("Django cart.add HTTP call failed")
            return AgentCartAddOut(
                ok=False,
                message="Failed to reach cart backend.",
                cart={},
                cartId=None,
                items=[],
            )

    cart_id, items = _shape_cart_response(data or {})

    if status_ok:
        return AgentCartAddOut(
            ok=True,
            message="Item added to cart.",
            cart=data,
            cartId=cart_id,
            items=items,
        )

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
