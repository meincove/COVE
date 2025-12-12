
from __future__ import annotations

import logging
import os
import sys
import re
import json
from typing import Any, Dict, List, Optional
from pathlib import Path
import time
import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field, validator
from typing import ClassVar
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
# Week 5-6: Intelligent LLM-based intent classification
from app.mcp_agents.intent_classifier import get_classifier
# Phase 1: Agentic enhancements - Thinking display (feature-flagged)
from app.core.thinking_tracker import ThinkingTracker
from app.core.tool_tracker import ToolTracker
from app.core.performance_monitor import get_monitor

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
    historyScope: Literal["user", "session", "none"] = "user"
    
    # Config-driven validation (cached)
    _validation_config: ClassVar[Optional[dict]] = None
    
    @classmethod
    def get_validation_config(cls) -> dict:
        """Load validation config once and cache it"""
        if cls._validation_config is None:
            # Path from agent.py: .../cove-ai-core/app/routes/agent.py
            # Need to go up 3 levels: routes -> app -> cove-ai-core -> data
            config_path = Path(__file__).resolve().parent.parent.parent / "data" / "validation_config.json"
            with open(config_path) as f:
                cls._validation_config = json.load(f)
        return cls._validation_config
    
    @validator('message')
    def validate_message(cls, v: str) -> str:
        """Config-driven message validation - no hardcoded rules"""
        config = cls.get_validation_config()['query_validation']['message']
        errors = cls.get_validation_config()['error_messages']
        
        # Handle None explicitly (config-driven)
        if v is None:
            if not config.get('allow_null', False):
                raise ValueError(errors['empty_message'])
            return None
        
        # Trim if configured
        if config.get('trim_before_validation', True) and v:
            v = v.strip()
        
        # Check empty/whitespace (config-driven)
        if not config.get('allow_whitespace_only', False):
            if not v or not v.strip():
                raise ValueError(errors['empty_message'])
        
        # Check length (config-driven limits)
        max_len = config.get('max_length', 5000)
        if len(v) > max_len:
            raise ValueError(errors['message_too_long'].format(max_length=max_len))
        
        return v
    
    @validator('top_k')
    def validate_top_k(cls, v: int) -> int:
        """Config-driven top_k validation - no hardcoded limits"""
        config = cls.get_validation_config()['query_validation']['top_k']
        errors = cls.get_validation_config()['error_messages']
        
        min_val = config.get('min', 1)
        max_val = config.get('max', 100)
        
        # Config-driven boundary check
        if v < min_val or v > max_val:
            raise ValueError(errors['invalid_top_k'].format(min=min_val, max=max_val))
        
        return v


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
    # Phase 1: Agentic enhancements - Detailed thinking display (feature-flagged)
    thinking_events: Optional[List[Dict[str, Any]]] = None  # Detailed AI reasoning steps
    tools_used: Optional[List[Dict[str, Any]]] = None  # Tools called with duration/results


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
_SESSION_AWAITING_COLOR: Dict[str, Dict[str, Any]] = {}  # {session_key: {product, variantId, available_colors, ...}}
_SESSION_AWAITING_QUANTITY: Dict[str, Dict[str, Any]] = {}  # {session_key: {product, variantId, color, size, ...}}
# Phase 1: Track what products user has already seen (for "show more" queries)
_SESSION_SHOWN_SLUGS: Dict[str, set] = {}  # {session_key: {slug1, slug2, ...}}


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


def _set_awaiting_color(body: AgentIn, product_info: Dict[str, Any]) -> None:
    """Store that we're waiting for color input from this session."""
    key = _session_key_from_body(body)
    if key:
        _SESSION_AWAITING_COLOR[key] = product_info


def _get_awaiting_color(body: AgentIn) -> Optional[Dict[str, Any]]:
    """Get product info if we're waiting for color from this session."""
    key = _session_key_from_body(body)
    if not key:
        return None
    return _SESSION_AWAITING_COLOR.get(key)


def _clear_awaiting_color(body: AgentIn) -> None:
    """Clear color-awaiting state."""
    key = _session_key_from_body(body)
    if key and key in _SESSION_AWAITING_COLOR:
        del _SESSION_AWAITING_COLOR[key]


def _set_awaiting_quantity(body: AgentIn, product_info: Dict[str, Any]) -> None:
    """Store that we're waiting for quantity input from this session."""
    key = _session_key_from_body(body)
    if key:
        _SESSION_AWAITING_QUANTITY[key] = product_info


def _get_awaiting_quantity(body: AgentIn) -> Optional[Dict[str, Any]]:
    """Get product info if we're waiting for quantity from this session."""
    key = _session_key_from_body(body)
    if not key:
        return None
    return _SESSION_AWAITING_QUANTITY.get(key)


def _clear_awaiting_quantity(body: AgentIn) -> None:
    """Clear quantity-awaiting state."""
    key = _session_key_from_body(body)
    if key and key in _SESSION_AWAITING_QUANTITY:
        del _SESSION_AWAITING_QUANTITY[key]


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


# Phase 1: Show More - Track shown items
def _get_shown_slugs(body: AgentIn) -> set:
    """Get set of slugs this user has already seen in this session."""
    key = _session_key_from_body(body)
    if not key:
        return set()
    return _SESSION_SHOWN_SLUGS.get(key, set())


def _mark_slugs_as_shown(body: AgentIn, slugs: List[str]) -> None:
    """Mark these slugs as shown to prevent showing again on 'show more'."""
    key = _session_key_from_body(body)
    if not key:
        return
    if key not in _SESSION_SHOWN_SLUGS:
        _SESSION_SHOWN_SLUGS[key] = set()
    _SESSION_SHOWN_SLUGS[key].update(slugs)


def _filter_out_shown_items(items: List[AgentItem], shown_slugs: set) -> List[AgentItem]:
    """Remove items user has already seen."""
    return [item for item in items if item.slug not in shown_slugs]


def _get_last_user_message_OLD(body: AgentIn) -> Optional[str]:
    key = _session_key_from_body(body)
    if not key:
        return None
    return _SESSION_LAST_USER_MSG.get(key)


def _get_available_colors(slug: str) -> List[str]:
    """Get available colors for a product by querying database for variants."""
    try:
        # Extract base slug (e.g., 'pg-hoodie-corebasics-119' → 'pg-hoodie-corebasics')
        base_slug = slug.rsplit('-', 1)[0] if '-' in slug else slug
        
        query = """
            SELECT DISTINCT color
            FROM cove_product_embeddings
            WHERE slug LIKE %s AND color IS NOT NULL AND color != ''
            ORDER BY color
        """
        
        with _get_pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (f"{base_slug}%",))
                colors = [row[0] for row in cur.fetchall()]
                return colors if len(colors) > 1 else []  # Only return if multiple colors
    except Exception as e:
        log.warning(f"Failed to get colors for {slug}: {e}")
        return []


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

    # Fetch history (optional - work without it too!)
    raw_history = []
    history_len = 0
    summary = ""
    
    if body.historyScope != "none":
        raw_history = await _fetch_history_for_llm(body.clerkUserId, body.guestSessionId, limit=20)
        history_len = len(raw_history)
        if history_len > 0:
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

    # Enhanced system prompt that works with OR without history
    system_prompt = """You are a friendly AI stylist writing a short, engaging intro for product recommendations.

Input JSON has: message (user query), items_preview (products found), history_len, summary.

Rules:
- Write ONE short, engaging sentence (max 22 words).
- If history_len > 0 AND summary exists: Lightly reference their style/preferences.
- If history_len == 0: Still be engaging! Reference what they asked for and what you found.
- Be friendly, modern, minimal vibe. Sound like a cool stylist, not a robot.
- Output ONLY the sentence. No quotes, no JSON, no explanations.

Examples (NO history):
- "Found 4 hoodies that match your vibe. Let's see what speaks to you."
- "Here are some bombers I think you'll love. Clean, minimal, premium."
- "Picked out some tees that fit what you're looking for. Check them out."

Examples (WITH history):
- "Based on what you usually like, here are some hoodies that fit your aesthetic."
- "Found some bombers in your style. Think you'll dig these."
"""

    user_payload = {
        "message": body.message,
        "items_preview": items_preview,
        "history_len": history_len,
        "summary": summary or "",
    }

    log.info(f"[StylistBrain] Generating intro: history_len={history_len}, items={len(items)}, query='{body.message[:50]}'")

    client = LLMClient()
    try:
        text = await client.generate([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ])
        text = (text or "").strip()
        
        # Remove quotes if LLM added them
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
        if text.startswith("'") and text.endswith("'"):
            text = text[1:-1]
            
        if not text:
            raise ValueError("empty intro from LLM")

        if len(text) > 250:
            text = text[:250]

        log.info(f"[StylistBrain] ✅ Generated: '{text}' (llm_used=True)")
        return {"text": text, "llm_used": True, "history_len": history_len, "summary_used": bool(summary)}
        
    except Exception as e:
        log.warning(f"[StylistBrain] ❌ LLM failed: {e}, falling back to default")
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
    Wrapper around Cove's recommendations logic.
    Uses HTTP endpoint for product recommendations.
    """
    # HTTP fallback (primary method for now)
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


def _inject_thinking_data(
    response: AgentOut,
    thinking_tracker: ThinkingTracker,
    tool_tracker: ToolTracker
) -> AgentOut:
    """
    Inject thinking events and tool usage into response (feature-flagged).
    Only adds data if feature is enabled, otherwise returns response unchanged.
    
    Args:
        response: The AgentOut response to enhance
        thinking_tracker: Thinking tracker with events
        tool_tracker: Tool tracker with usage data
        
    Returns:
        Enhanced response if feature enabled, original response otherwise
    """
    # Check if feature is enabled
    if not thinking_tracker.is_enabled():
        return response  # Return unchanged (no-op)
    
    # Add thinking events
    thinking_events = thinking_tracker.get_all_events()
    if thinking_events:
        response.thinking_events = thinking_events
    
    # Add tools used
    tools_summary = tool_tracker.get_summary()
    if tools_summary:
        response.tools_used = tools_summary
    
    return response


@router.post("/ai/agent/query", response_model=AgentOut)
async def agent_query(body: AgentIn) -> AgentOut:
    t0 = time.perf_counter()
    
    # Phase 1: Create trackers here to pass down
    thinking_tracker = ThinkingTracker()
    tool_tracker = ToolTracker()
    
    # Call implementation with trackers
    out: AgentOut = await _agent_query_impl(body, thinking_tracker, tool_tracker)
    
    # Phase 1: Inject thinking data if feature enabled (feature-flagged, safe)
    out = _inject_thinking_data(out, thinking_tracker, tool_tracker)
    
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


from app.core.events import emit_event

async def _agent_query_impl(
    body: AgentIn,
    thinking_tracker: ThinkingTracker,
    tool_tracker: ToolTracker
) -> AgentOut:
    q = body.message
    prev_user_message = _get_last_user_message(body)
    _update_last_user_message(body)
    
    # Trackers are now passed as parameters (cleaner than re-creating)

    # ===== CONVERSATION FLOW HANDLER =====
    # Check if this is a multi-step conversation (e.g., outfit builder)
    from app.core.conversation_flow import conversation_handler
    
    session_key = _session_key_from_body(body)
    
    # Check if in active conversation
    if session_key and conversation_handler.is_in_conversation(session_key):
        log.info(f"📝 Continuing conversation for session {session_key}")
        
        # Handle response
        result = conversation_handler.handle_response(session_key, q)
        
        if result.get("trigger_orchestrator"):
            # Conversation complete! Trigger orchestrator
            log.info(f"✅ Conversation complete, triggering orchestrator")
            
            # Get orchestrator context
            orchestrator_query = result.get("orchestrator_query", q)
            orchestrator_context = result.get("orchestrator_context", {})
            workflow_name = result.get("orchestrator_workflow", "outfit_builder")
            
            # Import and trigger orchestrator
            from app.agents import orchestrator
            
            # Add session context
            orchestrator_context.update({
                "user_id": body.clerkUserId or body.guestSessionId,
                "user_size_history": {}
            })
            
            # Show thinking
            emit_event('thinking:step', {
                'icon': '🎨',
                'status': 'Building your complete outfit'
            })
            thinking_tracker.add_thinking("orchestrator", "Executing multi-agent workflow...")
            
            try:
                orchestrator_result = await orchestrator.execute_workflow(
                    workflow_name=workflow_name,
                    query=orchestrator_query,
                    context=orchestrator_context
                )
                
                # Format as AgentOut (same as before)
                outfit_items = orchestrator_result.get("outfit_items", [])
                
                if not outfit_items:
                    return AgentOut(
                        kind="answer",
                        answer=orchestrator_result.get("reasoning", "I couldn't find items for this outfit."),
                        items=[],
                        reasoning=orchestrator_result.get("reasoning", "")
                    )
                
                # Convert to AgentItem format
                agent_items = []
                for item in outfit_items:
                    product = item.get("product", {})
                    agent_items.append(AgentItem(
                        slug=product.get("slug", ""),
                        title=product.get("title", product.get("name", "Unknown")),
                        priceNumeric=float(product.get("priceNumeric", product.get("price", 0))),
                        imageUrl=product.get("imageUrl", product.get("image_url", "")),
                        brand=product.get("brand", ""),
                        category=item.get("category", ""),
                        variantId=str(product.get("variantId", product.get("variant_id", ""))),
                        color=item.get("color", ""),
                        size=item.get("recommended_size", ""),
                    ))
                
                # Build answer
                total = orchestrator_result.get("total", 0)
                budget_max = orchestrator_context.get("budget_max", 500)
                within_budget = orchestrator_result.get("within_budget", True)
                
                answer_parts = [f"I've built a complete outfit for you! (€{total:.2f} total)"]
                
                if within_budget:
                    remaining = budget_max - total
                    answer_parts.append(f"Within your €{budget_max} budget! €{remaining:.2f} remaining.")
                
                answer = " ".join(answer_parts)
                
                return AgentOut(
                    kind="discover",
                    answer=answer,
                    items=agent_items,
                    reasoning=orchestrator_result.get("reasoning", "")
                )
                
            except Exception as e:
                log.error(f"Orchestrator failed: {e}")
                return AgentOut(
                    kind="answer",
                    answer="Sorry, I couldn't build your outfit right now. Please try again!",
                    items=[]
                )
        
        else:
            # Continue conversation with next question
            return AgentOut(
                kind="answer",
                answer=result.get("message", ""),
                items=[]
            )
    
    # Check if should START a conversation
    flow_name = conversation_handler.should_start_conversation(q)
    if flow_name:
        log.info(f"🎯 Starting conversation flow: {flow_name}")
        
        first_question = conversation_handler.start_conversation(session_key, flow_name)
        
        return AgentOut(
            kind="answer",
            answer=first_question,
            items=[]
        )
    
    # ===== END CONVERSATION FLOW HANDLER =====

    # ===== MULTI-AGENT ORCHESTRATOR CHECK =====
    # Check if query should be handled by multi-agent orchestrator
    # (only triggers if user provides full details now)
    from app.agents import orchestrator
    
    workflow_name = await orchestrator.should_handle(q)
    if workflow_name:
        log.info(f"🎯 Multi-agent orchestrator triggered: {workflow_name}")
        
        # Event: Starting multi-agent workflow
        emit_event('thinking:step', {
            'icon': '🎨',
            'status': 'Building your complete outfit'
        })
        thinking_tracker.add_thinking("orchestrator", "Building complete outfit with specialized agents...")
        
        # Get user budget from profile or use default
        budget_max = 500  # Default
        if body.clerkUserId:
            ai_profile = await _load_ai_profile(body.clerkUserId)
            if ai_profile and ai_profile.get('budget_max'):
                budget_max = float(ai_profile['budget_max'])
        
        # Execute multi-agent workflow
        try:
            result = await orchestrator.execute_workflow(
                workflow_name=workflow_name,
                query=q,
                context={
                    "budget_max": budget_max,
                    "user_id": body.clerkUserId or body.guestSessionId,
                    "user_size_history": {}  # Could load from profile
                }
            )
            
            # Track agent executions
            for agent_name, timing_ms in result.get("agent_timings", {}).items():
                usage = tool_tracker.start(f"agent_{agent_name}", {"workflow": workflow_name})
                tool_tracker.complete(usage, {"duration_ms": timing_ms, "success": True})
            
            # Format as AgentOut response
            outfit_items = result.get("outfit_items", [])
            
            if not outfit_items:
                # No items found, fallback to explanation
                return AgentOut(
                    kind="answer",
                    answer=result.get("reasoning", "I couldn't find items for this outfit. Try a different style or budget?"),
                    items=[],
                    reasoning=result.get("reasoning", ""),
                    debug={"orchestrator": "no_items_found"}
                )
            
            # Convert outfit items to AgentItem format
            agent_items = []
            for item in outfit_items:
                product = item.get("product", {})
                agent_items.append(AgentItem(
                    slug=product.get("slug", ""),
                    title=product.get("title", product.get("name", "Unknown")),
                    priceNumeric=float(product.get("priceNumeric", product.get("price", 0))),
                    imageUrl=product.get("imageUrl", product.get("image_url", "")),
                    brand=product.get("brand", ""),
                    category=item.get("category", ""),
                    variantId=str(product.get("variantId", product.get("variant_id", ""))),
                    color=item.get("color", ""),
                    size=item.get("recommended_size", ""),
                ))
            
            # Build outfit description
            total = result.get("total", 0)
            within_budget = result.get("within_budget", True)
            discount = result.get("discount_applied")
            
            answer_parts = [f"I've built a complete outfit for you! (€{total:.2f} total)"]
            
            if discount:
                answer_parts.append(f"Applied {discount.get('code')}: saved €{discount.get('savings', 0):.2f}")
            
            if within_budget:
                remaining = budget_max - total
                answer_parts.append(f"Within your €{budget_max} budget! €{remaining:.2f} remaining.")
            else:
                answer_parts.append(f"Slightly over budget by €{total - budget_max:.2f}")
            
            answer = " ".join(answer_parts)
            
            # Additional reasoning
            reasoning_parts = [result.get("reasoning", "")]
            if result.get("size_recommendations"):
                reasoning_parts.append("Sizes recommended based on brand standards.")
            
            return AgentOut(
                kind="discover",  # Show as product cards
                answer=answer,
                items=agent_items,
                reasoning=" ".join(reasoning_parts),
                debug={
                    "orchestrator": workflow_name,
                    "agent_timings": result.get("agent_timings", {}),
                    "confidence": result.get("confidence", 0),
                    "total": total,
                    "within_budget": within_budget
                }
            )
            
        except Exception as e:
            log.error(f"Multi-agent orchestrator failed: {e}")
            # Fall through to normal agent flow
            pass
    
    # ===== END MULTI-AGENT ORCHESTRATOR CHECK =====

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

    # Event: Understanding request
    emit_event('thinking:step', {
        'icon': '🧠',
        'status': 'Understanding your request'
    })
    
    # Phase 1: Track thinking - Understanding intent
    thinking_event_1 = thinking_tracker.add_thinking("classifier", "Understanding your request...")

    # === INTELLIGENT LLM-BASED INTENT CLASSIFICATION ===
    # Use 93% accurate semantic classifier instead of regex/rules
    intelligent_classifier = get_classifier()
    classification_result = intelligent_classifier.classify(
        query=q,
        context={
            "user_id": body.clerkUserId or body.guestSessionId,
            "cart_id": body.cartId,
        }
    )
    
    semantic_intent = classification_result["intent"]
    # Map semantic intent to orchestrator intent kind
    # Week 6: Use intelligent LLM-based intent classification
    from app.mcp_agents.intent_mapping import map_semantic_intent_to_orchestrator
    semantic_intent = classification_result["intent"]
    confidence = classification_result.get("confidence", 0.95)
    intent_kind = map_semantic_intent_to_orchestrator(semantic_intent)
    
    # Phase 1: Complete thinking event
    thinking_tracker.complete(
        thinking_event_1,
        details=f"Intent: {semantic_intent} → {intent_kind}",
        confidence=confidence * 100
    )
    
    # Map orchestrator intent back to API response kind for AgentOut
    # AgentOut only accepts: 'answer', 'recommendations', 'cart_proposal', 'checkout_ready'
    ORCHESTRATOR_TO_API_KIND = {
        "discover": "recommendations",
        "cart_add": "cart_proposal",
        "checkout_start": "checkout_ready",
        "generic": "answer",
        "policy": "answer",
        "size_fit": "answer",
        "greeting": "answer",
        "unknown": "answer",
        "order_query": "answer",
    }
    api_response_kind = ORCHESTRATOR_TO_API_KIND.get(intent_kind, "answer")
    
    # Production monitoring - using print for immediate visibility
    print(f"🔍 [INTENT_MONITOR] query='{q[:80]}' | semantic='{semantic_intent}' | orchestrator='{intent_kind}' | api_kind='{api_response_kind}' | conf={confidence:.2%}")
    
    # ✅ USE INTELLIGENT CLASSIFIER - No hardcoding!
    # Trust the LLM-based semantic classification
    wants_cart = (semantic_intent == "cart_proposal") and intent_kind != "checkout_start"
    wants_recs = (not wants_cart) and (intent_kind == "discover")
    
    # Keep backward compatibility - still use old classify for price_filter detection
    # (Can be removed once we add entity extraction to classifier)
    old_intent = await classify(q, attrs)
    has_price_filter = getattr(old_intent, "has_price_filter", False)

    debug_plan: Dict[str, Any] = {
        "intent_kind": intent_kind,
        "semantic_intent": semantic_intent,  # Add for debugging
        "confidence": confidence,
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
        # Check if this message looks like JUST a size answer (e.g., "M", "in M", "size L")
        # Simple pattern: message contains  S/M/L/XL but not other product keywords
        looks_like_size_only = bool(re.search(r'\b(?:in\s+)?(?:size\s+)?([smlxSMLX]{1,3})\b', q.lower())) and len(q.strip()) < 20
        
        # Only clear awaiting if this is clearly a NEW product search, not a size response
        if intent_kind == "discover" and not _looks_like_cart_add(q) and not looks_like_size_only:
            _clear_awaiting_size(body)
            awaiting = None  # Treat as if no awaiting state
        
    if awaiting:
        # Only process size if this looks like JUST a size response
        # Use existing cart add detection (no hardcoding!)
        size = None
        
        # Check if message looks like cart add intent using existing function
        has_cart_intent = _looks_like_cart_add(q)
        
        # Extract size from message - prioritize short responses like "M" or "in M"
        if not has_cart_intent:
            match = re.search(r'\b(?:in\s+)?(?:size\s+)?([smlxSMLX]{1,3})\b', q, re.IGNORECASE)
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
            
            # Store product with size and ask for quantity
            product_with_size = product.copy()
            product_with_size["size"] = size
            
            _set_awaiting_quantity(body, {"product": product_with_size})
            
            product_desc = f"{nice_color} {nice_type}".strip() if nice_color else nice_type
            
            return AgentOut(
                kind="answer",
                answer=f"Perfect! How many {product_desc} in size {size} would you like to add?",
                citations=[],
                items=[top],
                cart_payload=None,
                debug_plan={**debug_plan, "size_provided_in_followup": True},
            )
        # If has_cart_intent, just fall through - don't clear state, let normal flow handle it

    # Check if we were awaiting quantity input
    awaiting_qty = _get_awaiting_quantity(body)
    if awaiting_qty:
        # Check if this looks like a quantity response (number)
        looks_like_qty_only = len(q.strip()) < 10  # Very short response
        
        # Only clear if clearly a new search
        if intent_kind == "discover" and not _looks_like_cart_add(q) and not looks_like_qty_only:
            _clear_awaiting_quantity(body)
            awaiting_qty = None
    
    if awaiting_qty:
        # Extract quantity from message
        quantity = None
        has_cart_intent = _looks_like_cart_add(q)
        
        if not has_cart_intent:
            # Try to find a number in the message (1-10 typical range)
            match = re.search(r'\b([1-9]|10)\b', q.strip())
            if match:
                quantity = int(match.group(1))
        
        if quantity:
            # Clear the awaiting state
            _clear_awaiting_quantity(body)
            
            # Create final cart proposal with all info
            product = awaiting_qty["product"]
            top = AgentItem(**product)
            
            nice_type = (top.type or "").lower()
            nice_color = (product.get("color") or top.color or "").lower()
            nice_size = (product.get("size") or top.size or "").upper()
            
            parts = ["Do you want me to add"]
            if quantity > 1:
                parts.append(str(quantity))
            else:
                parts.append("this")
            if nice_color:
                parts.append(nice_color)
            parts.append(nice_type if quantity == 1 else f"{nice_type}s")
            if nice_size:
                parts.append(f"in size {nice_size}")
            parts.append("to your cart?")
            answer = " ".join(parts).replace("  ", " ").strip()
            
            cart_payload = {
                "variantId": top.variantId,
                "size": product.get("size") or top.size,
                "quantity": quantity,
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
                debug_plan={**debug_plan, "quantity_provided_in_followup": True},
            )

    # Check if we were awaiting color input
    awaiting_color = _get_awaiting_color(body)
    if awaiting_color:
        # Check if this message looks like JUST a color response (e.g., "navy", "black", "in navy")
        looks_like_color_only = len(q.strip()) < 30  # Short response
        
        # Only clear awaiting if this is clearly a NEW product search
        if intent_kind == "discover" and not _looks_like_cart_add(q) and not looks_like_color_only:
            _clear_awaiting_color(body)
            awaiting_color = None
        
    if awaiting_color:
        # Extract color from message
        color = None
        has_cart_intent = _looks_like_cart_add(q)
        
        if not has_cart_intent:
            # Try to match against available colors
            available_colors = awaiting_color.get("available_colors", [])
            q_lower = q.lower().strip()
            
            # Remove common prefixes
            for prefix in ["in ", "color ", "the ", "i want ", "i'd like "]:
                if q_lower.startswith(prefix):
                    q_lower = q_lower[len(prefix):].strip()
            
            # Check if message contains any of the available colors
            for avail_color in available_colors:
                if avail_color.lower() in q_lower or q_lower in avail_color.lower():
                    color = avail_color
                    break
        
        if color:
            # Clear the awaiting state
            _clear_awaiting_color(body)
            
            # Now check if we need size
            product = awaiting_color["product"]
            top = AgentItem(**product)
            
            # Update product color in the session state
            top_dict = product.copy()
            top_dict["color"] = color
            
            # Ask for size if not provided
            _set_awaiting_size(body, {"product": top_dict})
            
            nice_type = (top.type or "").lower()
            available_sizes = ["S", "M", "L", "XL"]  # Could be dynamic from product data
            sizes_str = ", ".join(available_sizes)
            
            return AgentOut(
                kind="answer",  # FIX: Use answer, not cart_proposal when asking questions
                answer=f"Great choice! The {color} {nice_type} is available. What size would you like? ({sizes_str})",
                citations=[],
                items=[top],
                cart_payload=None,
                debug_plan={**debug_plan, "color_provided_in_followup": True},
            )

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
        print(f"🛒 [DEBUG] CART BRANCH TRIGGERED: wants_cart={wants_cart}, intent_kind={intent_kind}")
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
                # Check if we need to ask for color first
                # TODO: Get available colors from product variants/recommendations
                # For now, assume if color filter wasn't specified, product might have multiple colors
                needs_color = not rec_filters.get("color") and not chosen_size  # If no color specified
                
                if needs_color:
                    # Query database for available colors
                    available_colors = _get_available_colors(top.slug)
                    
                    if available_colors and len(available_colors) > 1:
                        # Ask for color first
                        _set_awaiting_color(body, {
                            "product": top.dict(),
                            "filters": rec_filters,
                            "available_colors": available_colors
                        })
                        
                        colors_str = ", ".join(available_colors)
                        product_desc = (top.type or "item").lower()
                        
                        return AgentOut(
                            kind="answer",
                            answer=f"Great choice! This {product_desc} comes in {colors_str}. Which color would you like?",
                            citations=[],
                            items=[top],
                            debug_plan=debug_plan,
                        )
                
                if not chosen_size:
                    # No color needed, just ask for size
                    product_desc = (top.type or rec_filters.get("type") or "item").lower()
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
            kind=api_response_kind,  # Use mapped API kind for Pydantic validation
            answer=(
                "I'm not sure which item you want me to add. "
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

        # No fit recommendation (likely missing user measurements)
        # Check if user has provided measurements in their query or profile
        has_measurements = ai_profile and (
            ai_profile.get("height_cm") or ai_profile.get("weight_kg")
        )
        
        if not has_measurements:
            # Ask for measurements intelligently (config-driven via prompt)
            from app.core.rules import get_prompt
            
            ask_dimensions_msg = get_prompt(
                "ask_for_dimensions",
                default=(
                    "To give you the best sizing advice, could you share your height and weight? "
                    "That helps me recommend the perfect fit! Our items come in different fits "
                    "(regular, oversized, relaxed), so knowing your measurements ensures you get exactly what you want."
                )
            )
            
            debug_plan["fit_used"] = False
            debug_plan["asked_for_dimensions"] = True
            
            return AgentOut(
                kind="answer",
                answer=ask_dimensions_msg,
                citations=[],
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

    # --- Branch 2: recommendations (discover) ------------------------------------
    if wants_recs:
        print(f"🔍 [DEBUG] RECS BRANCH TRIGGERED: wants_recs={wants_recs}, intent_kind={intent_kind}")
        # Event: Searching catalog
        emit_event('thinking:step', {
            'icon': '🔍',
            'status': 'Searching catalog'
        })
        
        # Phase 1: Track search thinking
        search_thinking = thinking_tracker.add_thinking("search", "Searching product catalog...")
        
        # Phase 1: Track hybrid_search tool
        search_tool = tool_tracker.start("hybrid_search", inputs={"query": q, "top_k": body.top_k})
        
        try:
            # Phase 1: If user has seen items before, fetch MORE to ensure we have enough new ones
            shown_slugs = _get_shown_slugs(body)
            search_top_k = body.top_k
            if shown_slugs:
                # Fetch 3x more to account for filtering
                search_top_k = body.top_k * 3
                debug_plan["expanded_search_for_shown"] = True

            rec_query = build_rec_query(q, rec_filters)

            rec_payload = {
                "query": rec_query,
                "filters": rec_filters,
                "top_k": search_top_k,  # Use expanded top_k
            }
            rec_resp = await _call_recs_suggest(rec_payload)
            
            # Phase 1: Complete tool tracking
            item_count = len(rec_resp.get("items", []))
            tool_tracker.complete(search_tool, outputs={"count": item_count})
            
            # Phase 1: Complete thinking
            thinking_tracker.complete(
                search_thinking,
                details=f"Found {item_count} matching products",
                tool_used=f"hybrid_search ({item_count} items)"
            )
            
        except Exception as e:
            # Phase 1: Track failures
            tool_tracker.error(search_tool, str(e))
            thinking_tracker.error(search_thinking, f"Search failed: {str(e)}")
            raise

        debug_plan["rec_query"] = rec_query

        raw_items = rec_resp.get("items") or []

        items: List[AgentItem] = [
            AgentItem(**it)
            for it in raw_items
            if isinstance(it, dict) and it.get("slug")
        ]

        # Event: Found items
        emit_event('thinking:step', {
            'icon': '✓',
            'status': f'Found {len(items)} items',
            'done': True
        })

        debug_plan["rec_item_count"] = len(items)

        if items:
            # Phase 1: Filter out items user has already seen (for "show more")
            shown_slugs = _get_shown_slugs(body)
            if shown_slugs:
                original_count = len(items)
                items = _filter_out_shown_items(items, shown_slugs)
                debug_plan["filtered_shown_items"] = original_count - len(items)
            
            # Limit to user's requested top_k (after filtering)
            items = items[:body.top_k]
            
            # Mark these NEW items as shown for this session
            _mark_slugs_as_shown(body, [item.slug for item in items])
            
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

            # Event: Ranking complete
            emit_event('thinking:step', {
                'icon': '✓',
                'status': 'Top recommendations ready',
                'done': True
            })

            return AgentOut(
                kind="recommendations",
                answer=intro_line,
                citations=[],
                items=items,
                debug_plan=debug_plan,
            )

        # no items → fall through to RAG / chat below

    # --- Branch 4: generic fallback (LLM chat or RAG) --------------------------
    print(f"💬 [DEBUG] FALLBACK BRANCH: wants_cart={wants_cart}, wants_recs={wants_recs}, intent_kind={intent_kind}")
    use_llm_chat = intent_kind in (
        "generic",
        "policy",
        "history_meta",
        "unknown",
        "greeting",
        "size_fit",
    )

    if use_llm_chat and not wants_cart and not wants_recs:
        # Phase 5: Check static policy cache first (instant response)
        if intent_kind == "policy":
            policy_answer = get_policy_answer(body.message)
            if policy_answer:
                debug_plan["policy_cache_hit"] = True
                debug_plan["cache_used"] = True
                
                return AgentOut(
                    kind=api_response_kind,  # Use mapped API kind for Pydantic validation
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
            kind=api_response_kind,  # Use mapped API kind for Pydantic validation
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
        kind=api_response_kind,  # Use mapped API kind for Pydantic validation
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
