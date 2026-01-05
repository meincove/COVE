
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
from app.mcp_agents.verifier.verifier import get_verifier
# Phase 1: Agentic enhancements - Thinking display (feature-flagged)
from app.core.thinking_tracker import ThinkingTracker
from app.core.tool_tracker import ToolTracker
from app.core.performance_monitor import get_monitor
# Phase 1: Context management - Fact extraction
from app.services.fact_extractor import get_fact_extractor

from app.services.session_state import (
    SessionStateManager,
    get_namespaced_session_id,
    get_base_user_id,
)
from app.services.history_manager import HistoryManager

USE_TOOLS_LAYER = os.getenv("USE_TOOLS_LAYER", "true").lower() == "true"
DISABLE_TOOLS_HTTP_FALLBACK = os.getenv("DISABLE_TOOLS_HTTP_FALLBACK", "false").lower() == "true"
log = logging.getLogger("cove.agent")
router = APIRouter()


# ------------------ Data Models ------------------


# Safety cap on summary length (characters)
MAX_HISTORY_SUMMARY_CHARS = int(os.getenv("AGENT_MAX_HISTORY_SUMMARY_CHARS", "600"))


# ===== SESSION NAMESPACING UTILITIES =====
# Support for separate chat sessions (main, outfit_builder, cart, etc.)

from app.schemas.agent import (
    AgentIn,
    AgentOut,
    AgentItem,
    AgentStatus,
    AgentCartAddIn,
    AgentCartAddOut
)
from app.services.product import get_available_colors
# from app.services.intent import looks_like_cart_add, get_recently_discussed_product_index


# ---------- Small helpers ----------








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

    # Gender fallback from profile
    if not merged.get("gender"):
        gender = (profile.get("gender") or "").lower().strip()
        if gender in ("male", "female", "unisex"):
            merged["gender"] = gender

    return merged


from app.services.session_state import (
    SessionStateManager,
    get_namespaced_session_id
)

# Phase 1: Show More - Track shown items
# Delegated to SessionStateManager





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
    try:
        raw = await client.generate(
            [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                },
            ]
        )
    except Exception as e:
        log.warning(f"_select_from_last_recs_via_llm failed: {e}")
        return None

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
    limit: int,
) -> List[Dict[str, Any]]:
    """
    Fetch history for LLM, ensuring it's not too long.
    """
    # This function is now deprecated. Use HistoryManager.fetch_history instead.
    # It's kept for backward compatibility during transition.
    return await HistoryManager.fetch_history(clerk_user_id, guest_session_id, limit)


async def _build_discover_intro(
    body: AgentIn,
    items: List[AgentItem],
    rec_filters: Dict[str, Any],
    attrs: Dict[str, Any],
    honesty_message: Optional[str] = None,
    conversation_facts: Optional[Dict[str, Any]] = None,
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
        raw_history = await HistoryManager.fetch_history(body.clerkUserId, body.guestSessionId, limit=20)
        history_len = len(raw_history)
        if history_len > 0:
            summary, _ = await HistoryManager.prepare_history_for_llm(raw_history)

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
- Write ONE short, engaging sentence (max 25 words).
- If multiple items are found, summarize the VARIETY (e.g. "Found a mix of [Type A] and [Type B]"). Do NOT focus on just one single item unless only one was found.
- If specific gender items were found (e.g. "men's hoodies"), mention it to confirm understanding (e.g. "Found some men's hoodies...").
- If history_len > 0 AND summary exists: Lightly reference their style/preferences.
- Be friendly, modern, minimal vibe. Sound like a cool stylist, not a robot.
- Output ONLY the sentence. No quotes, no JSON, no explanations.

Examples (NO history):
- "Found 4 hoodies including some classic and graphic options. Take a look."
- "Here are a few men's bombers that match your vibe. Clean and minimal."
- "Picked out a mix of tees, from basic to premium. Check them out."

Examples (WITH history):
- "Based on your love for black, here are some dark hoodies that fit your aesthetic."
- "Found some bombers that match your usual style. Think you'll dig these."
"""

    if honesty_message:
        system_prompt += f"\\n\\nIMPORTANT: The system has already analyzed the search results and determined we don't have exactly what the user wanted. HONESTY MESSAGE: {honesty_message}. Use this information to explain the situation gently."

    # Inject conversation facts if available
    if conversation_facts:
        from app.services.fact_extractor import get_fact_extractor
        fact_extractor = get_fact_extractor()
        facts_context = fact_extractor.get_context_for_llm(conversation_facts)
        
        if facts_context:
            system_prompt += f"\\n\\n📋 CONVERSATION CONTEXT (use this to personalize your intro):\\n\\n{facts_context}"

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
        # If we have a lot of history, we might need to fetch more to get context
        # but usually the summary + recent is enough.
        # We'll just fetch a safe amount.
        limit = HistoryManager.MAX_HISTORY_MESSAGES + HistoryManager.HISTORY_SUMMARY_THRESHOLD + 5
        
        # 1. Fetch raw history
        raw_history = await HistoryManager.fetch_history(
            body.clerkUserId,
            body.guestSessionId,
            limit=limit
        )
        raw_history_len = len(raw_history)

        # 2. Prepare history for LLM (summarize and trim)
        summary, history = await HistoryManager.prepare_history_for_llm(raw_history)

    smalltalk = intent_kind in ("greeting", "small_talk")
    if not smalltalk:
        smalltalk = HistoryManager.is_short_smalltalk(body.message, intent_kind)

    # Renaming variables to match the provided snippet for consistency,
    # assuming these renames are part of a larger context.
    trimmed_history = history # Assuming 'history' is the source for 'trimmed_history'
    q = body.message # Assuming 'body.message' is the source for 'q'
    is_smalltalk = smalltalk # Assuming 'smalltalk' is the source for 'is_smalltalk'
    summary_text = summary # Assuming 'summary' is the source for 'summary_text'

    # Fetch conversation facts for context
    conversation_facts = {}
    try:
        from app.services.fact_storage import get_facts
        conversation_facts = await get_facts(
            clerk_user_id=body.clerkUserId,
            guest_session_id=body.guestSessionId
        )
        if conversation_facts:
            log.info(f"📥 Retrieved conversation facts for chat query")
    except Exception as e:
        log.warning(f"Failed to retrieve conversation facts (non-critical): {e}")

    messages = HistoryManager.format_messages(
        history=history,
        user_message=q,
        smalltalk=smalltalk,
        summary=summary,
        conversation_facts=conversation_facts
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


async def _call_rag(query: str, top_k: int, filters: Optional[Dict[str, Any]] = None, intent: Optional[str] = None) -> Dict[str, Any]:
    """
    Delegate to /ai/rag/query via HTTP.
    """
    try:
        async with httpx.AsyncClient(timeout=12) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/rag/query",
                json={"query": query, "top_k": top_k, "filters": filters, "intent": intent},
            )
        if r.status_code == 200:
            return r.json()
        log.warning("rag.query non-200 %s: %s", r.status_code, r.text)
    except Exception as e:
        log.warning("rag.query failed: %s", e)

    return {"answer": "Sorry—something went wrong fetching product info.", "citations": []}


# Type normalization config cache
_type_norm_config_cache = None

def _get_type_normalization_config():
    """Load type normalization config from JSON (cached)"""
    global _type_norm_config_cache
    if _type_norm_config_cache is None:
        config_path = Path(__file__).resolve().parent.parent.parent / "data" / "type_normalization_config.json"
        with open(config_path) as f:
            _type_norm_config_cache = json.load(f)
    return _type_norm_config_cache


def _get_similar_types(product_type: str) -> List[str]:
    """
    Get semantically similar product types from config.
    Returns list of similar types in order of relevance.
    
    Example: "pants" -> ["joggers", "jeans", "shorts", "trousers"]
    """
    try:
        config = _get_type_normalization_config()
        similarity_map = config.get("type_similarity", {})
        return similarity_map.get(product_type.lower(), [])
    except Exception as e:
        log.warning(f"Failed to load type similarity: {e}")
        return []


async def _call_recs_suggest(payload: Dict[str, Any]) -> Dict[str, Any]:

    """
    Wrapper around Cove's recommendations logic.
    Uses HTTP endpoint for product recommendations.
    """
    # HTTP fallback (primary method for now)
    try:
        async with httpx.AsyncClient(timeout=120) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/recs/suggest",
                json=payload,
            )
        if r.status_code == 200:
            return r.json()
        log.warning("recs.suggest non-200 %s: %s", r.status_code, r.text)
    except Exception as e:
        log.exception(f"recs.suggest failed: {e}")

    return {}


# --- FIT integration helpers -------------------------------------------------





async def _call_fit_recommend(
    message: str,
    attrs: Dict[str, Any],
    profile: Optional[Dict[str, Any]] = None,
    entities: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    # Use LLM entities for body metrics
    entities = entities or {}
    metrics = None
    
    if entities.get("height_cm") and entities.get("weight_kg"):
        metrics = {
            "height_cm": float(entities["height_cm"]),
            "weight_kg": float(entities["weight_kg"])
        }
    
    # Fallback to regex removed (User requested no regex).
    # If no metrics via LLM, we return None (or check profile).
    if not metrics and not profile:
        return None

    product_type = None
    if attrs.get("types"):
        product_type = attrs["types"][0]

    # Use LLM entities for fit preference
    fit_pref = entities.get("fit", "regular")
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


async def _trigger_fact_extraction_background(body: AgentIn, response: AgentOut):
    """
    Run fact extraction in background.
    
    This function IS the background task - no nested task creation.
    
    Args:
        body: The original request
        response: The agent's response
    """
    try:
        log.debug("=" * 80)
        log.debug("🔍 [FACT EXTRACTION] FUNCTION CALLED - STARTING EXTRACTION")
        log.debug("=" * 80)
        log.info("🔍 [FACT EXTRACTION] Starting background extraction...")
        log.debug("DEBUG: After log.info")
        
        # Extract items metadata
        items_meta = []
        if hasattr(response, 'items') and response.items:
            log.debug(f"response.items exists, length = {len(response.items)}")
            try:
                items_meta = [item.dict() for item in response.items]
                log.debug(f"Successfully converted {len(items_meta)} items to dict")
            except Exception as e:
                log.warning(f"Exception in item.dict(): {e}")
                items_meta = []
        
        log.debug(f"About to log items_meta length")
        try:
            log.info(f"🔍 [FACT EXTRACTION] items_meta={len(items_meta)} items")
            log.debug("log.info succeeded")
        except Exception as e:
            log.warning(f"log.info FAILED: {e}")
        
        # Skip if no items
        if not items_meta:
            log.debug("No items, returning")
            log.info("⏭️  No items to extract facts from, skipping")
            return
        
        log.debug(f"Have {len(items_meta)} items, continuing...")
        
        # Extract debug plan
        debug_plan = getattr(response, "debug_plan", {}) or {}
        
        # Get fact extractor
        fact_extractor = get_fact_extractor()
        
        # Prepare agent metadata (what was shown/done)
        agent_metadata = {
            "items": items_meta,
            "intent_kind": debug_plan.get("intent_kind"),
            "kind": getattr(response, "kind", "answer"),
            "cart_payload": getattr(response, "cart_payload", None),
        }
        
        # DEBUG: Log what we're passing to fact extractor
        log.info(f"🔍 [FACT EXTRACTION] First item keys: {list(items_meta[0].keys())}")
        log.info(f"🔍 [FACT EXTRACTION] Has material? {'material' in items_meta[0]}")
        log.info(f"🔍 [FACT EXTRACTION] Has fabric? {'fabric' in items_meta[0]}")
        log.info(f"🔍 [FACT EXTRACTION] Has style? {'style' in items_meta[0]}")
        
        log.info(f"🔍 [FACT EXTRACTION] Calling LLM to extract facts...")
        # Extract facts from this turn
        facts = await fact_extractor.extract_facts(
            user_message=body.message,
            assistant_response=getattr(response, "answer", ""),
            agent_metadata=agent_metadata
        )
        
        log.info(f"📊 Extracted facts: {len(facts.get('product_focus', {}).get('current_products', []))} products")
        log.info(f"🔍 [FACT EXTRACTION] Facts keys: {list(facts.keys())}")
        
        # Store facts in database
        log.info(f"🔍 [FACT STORAGE] Calling storage client...")
        from app.services.fact_storage import store_facts
        stored = await store_facts(
            clerk_user_id=body.clerkUserId,
            guest_session_id=body.guestSessionId,
            facts=facts
        )
        
        if stored:
            log.info("💾 Facts stored in database successfully")
        else:
            log.warning("⚠️ Facts storage failed (non-critical)")
            
    except Exception as e:
        log.error(f"❌ Fact extraction/storage failed: {e}", exc_info=True)


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
    
    
    # Phase 1: Trigger fact extraction via Celery (production-grade background processing)
    try:
        if hasattr(out, "items") and out.items:
            # Extract items metadata
            try:
                items_meta = [item.dict() for item in out.items]
            except Exception:
                items_meta = [dict(item) for item in out.items]
            
            if items_meta:
                # Get debug plan for intent kind
                debug_plan = getattr(out, "debug_plan", {}) or {}
                
                # Prepare agent metadata
                agent_metadata = {
                    "items": items_meta,
                    "intent_kind": debug_plan.get("intent_kind"),
                    "kind": getattr(out, "kind", "answer"),
                    "cart_payload": getattr(out, "cart_payload", None),
                }
                
                # Enqueue Celery task (non-blocking, instant)
                try:
                    from app.tasks.fact_extraction import extract_and_store_facts_task
                    
                    # Prepare agent metadata if not already available
                    # Note: We rely on variables from scope (agent_metadata)
                    # Ensuring agent_metadata is passed correctly
                    
                    
                    task = extract_and_store_facts_task.delay(
                        body.message,
                        out.answer,
                        items_meta,
                        debug_plan.get("intent_kind"),
                        body.clerkUserId,
                        body.guestSessionId
                    )
                    log.info(f"📤 [CELERY] Fact extraction task {task.id} enqueued for session {body.guestSessionId}")
                except ImportError:
                    log.warning("Celery/tasks module not available, skipping background fact extraction")
                except Exception as e:
                    log.warning(f"Failed to enqueue fact extraction task: {e}")
            else:
                log.info("⏭️  No items to extract facts from, skipping")
    except Exception as e:
        # Don't fail the request if task enqueue fails
        log.error(f"❌ Failed to enqueue fact extraction task: {e}", exc_info=True)
    
    # Phase 2: Log conversation history
    try:
        debug_plan = getattr(out, "debug_plan", {}) or {}
        items_meta = []
        if hasattr(out, "items") and out.items:
            try:
                items_meta = [item.dict() for item in out.items]
            except Exception:
                items_meta = [dict(item) for item in out.items]
        
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
    prev_user_message = SessionStateManager.get_last_user_message(body)
    SessionStateManager.update_last_user_message(body)
    
    # Trackers are now passed as parameters (cleaner than re-creating)
    
    # ===== FETCH CONVERSATION FACTS =====
    # Retrieve stored facts from database to inject into LLM context
    conversation_facts = {}
    try:
        from app.services.fact_storage import get_facts
        conversation_facts = await get_facts(
            clerk_user_id=body.clerkUserId,
            guest_session_id=body.guestSessionId
        )
        if conversation_facts:
            log.info(f"📥 Retrieved conversation facts with {len(conversation_facts.get('product_focus', {}).get('current_products', []))} current products")
    except Exception as e:
        log.warning(f"Failed to retrieve conversation facts (non-critical): {e}")

    # ===== CONVERSATION FLOW HANDLER =====
    # Check if this is    # ✨ WEEK 3 DAY 2: Context-Aware Reasoning
    # Resolve intent using conversation history (handle follow-ups)
    
    # 1. Get/Create Manager
    from app.services.conversation_manager import get_conversation_manager
    conv_manager = get_conversation_manager()
    user_id = body.clerkUserId or body.guestSessionId or "anonymous"
    
    # 2. Add User Message to History
    conv_manager.add_message(user_id, "user", q)
    
    # 3. Resolve Inteht (LLM)
    # "Make it blue" -> "Show me blue blazers"
    resolved_context = await conv_manager.resolve_intent(user_id, q)
    resolved_query = resolved_context.get("resolved_query", q)
    modification_type = resolved_context.get("modification_type", "new_topic")
    
    log.info(f"🧠 Context Resolved: '{q}' -> '{resolved_query}' ({modification_type})")
    
    # Use resolved query for downstream logic
    q = resolved_query  
    
    # --- END Context Logic ---

    from app.services.user_preference_manager import get_preference_manager
    from app.core.conversation_flow import conversation_handler
    
    session_key = SessionStateManager.get_session_key(body)
    
    # Flag to prevent conversation restart loop when falling through
    skip_conversation_check = False
    
    # Check if in active conversation
    if session_key and conversation_handler.is_in_conversation(session_key):
        log.info(f"📝 Continuing conversation for session {session_key}")
        
        # Handle response
        result = await conversation_handler.handle_response(session_key, q)
        
        if result.get("trigger_orchestrator"):
            # Conversation complete! Let the request fall through to main outfit_builder path
            log.info(f"✅ Conversation complete, falling through to main outfit_builder path")
            
            # Update the query with orchestrated query (contains all gathered requirements)
            q = result.get("orchestrator_query", q)
            
            # Update context with gathered requirements
            gathered_context = result.get("orchestrator_context", {})
            
            # Store gathered context in body for access by main path
            # We'll inject this into the main outfit_builder path below
            body._gathered_context = gathered_context
            
            # Force session type to outfit_builder so main path picks it up
            body.sessionType = "outfit_builder"
            
            # Set flag to skip conversation flow check below (prevent restart loop)
            skip_conversation_check = True
            
            # Don't return - fall through to main outfit_builder path at line ~1679
            # This path emits agentic events properly!
        
        else:
            # Continue conversation with next question
            return AgentOut(
                kind="answer",
                answer=result.get("message", ""),
                items=[]
            )
    
    # ===== INTENT-BASED ROUTING (UNIFIED) =====
    # ✨ SMART: Use LLM intent classifier instead of hardcoded patterns
    # This correctly handles any phrasing: "what should I wear", "style me", "party outfit", etc.
    
    from app.mcp_agents.intent_classifier import get_classifier
    from app.agents import orchestrator
    from app.services.context_manager import get_conversation_context

    # Get conversation context for intent classification
    conversation_context = await get_conversation_context(
        session_id=body.guestSessionId or "",
        clerk_user_id=body.clerkUserId
    )

    # Classify intent with context awareness (LLM-based, not hardcoded!)
    classifier = get_classifier()
    
    # CRITICAL: Use original_query if available for context preservation (e.g., "boyfriend" for gender)
    # The conversation flow preserves the original user query in gathered_context
    original_query = getattr(body, '_gathered_context', {}).get('original_query', '')
    classification_query = f"{original_query} {q}" if original_query else q
    
    classification = await classifier.classify(classification_query, context=conversation_context)
    intent = classification.get("intent")
    confidence = classification.get("confidence", 0.0)

    # === ZALANDO-STYLE SEARCH STRATEGY ===
    # Translate user query into detailed search attributes using ContextTranslator
    # This runs in parallel with classification to enrich the final search filters
    try:
        from app.agents.context_translator import get_context_translator
        translator = get_context_translator()
        
        # Get user profile for personalization
        user_profile = SessionStateManager.get_accumulated_profile(body)
        
        # Translate query into semantic strategy
        search_strategy = await translator.translate(q, user_profile, body.history or [])
        
        # Merge translated filters into classification entities
        translated_filters = search_strategy.filters
        if "entities" not in classification:
            classification["entities"] = {}
            
        # Prioritize translated filters (they are more intelligent)
        for key, val in translated_filters.items():
            if val is not None:
                classification["entities"][key] = val
                
        # Store semantic query and boost attributes for later use in Recs
        # We attach them to classification entities with special keys
        classification["entities"]["_semantic_query"] = search_strategy.semantic_query
        classification["entities"]["_boost_attributes"] = search_strategy.boost_attributes
        classification["entities"]["_visual_vibe"] = search_strategy.visual_vibe
        
        log.info(f"🧠 [STRATEGY] Applied Strategy: {search_strategy.semantic_query}")
        
    except Exception as e:
        log.error(f"❌ [STRATEGY] Translation failed, proceeding with basic classification: {e}")

    log.debug(f" 🧭 Routing: intent='{intent}' confidence={confidence}")
    
    # ===== CONVERSATION FLOW HANDLER =====
    # If intent is outfit_builder and NOT already in/completed a flow, start gathering requirements
    # This uses LLM classification instead of hardcoded patterns!
    should_skip_flow = skip_conversation_check
    is_outfit_intent = (intent == "outfit_builder" and confidence > 0.6) or body.sessionType == "outfit_builder"
    
    # SMART VAGUE QUERY DETECTION
    # If user says "something casual for the weekend" (no explicit "outfit"/"look" keyword),
    # skip the conversation flow and use default budget for immediate results
    # BUT: If user explicitly opened outfit builder (sessionType), keep normal flow
    vague_occasion_query = False
    is_explicit_outfit_session = (body.sessionType == "outfit_builder")
    
    if is_outfit_intent and not should_skip_flow and not is_explicit_outfit_session:
        # Check if query contains EXPLICIT outfit keywords (as full words, not substrings)
        q_lower = q.lower()
        # "looking" should NOT match "look" - use regex word boundaries
        import re
        explicit_outfit_patterns = [
            r'\boutfit\b', r'\blook\b', r'\bstyle me\b', r'\bdress me\b', 
            r'\bput together\b', r'\bbuild me\b', r'\bcomplete look\b'
        ]
        has_explicit_keyword = any(re.search(p, q_lower) for p in explicit_outfit_patterns)
        
        if not has_explicit_keyword:
            # This is a vague occasion-based query like "something casual for the weekend"
            # Skip conversation flow, use default budget, show products immediately
            vague_occasion_query = True
            log.info(f"📚 [VAGUE QUERY] Detected vague occasion query: '{q}' - Using €150 default budget")
            
            # Set default budget context
            body._gathered_context = {
                'budget_max': 150,  # Default €150 budget
                'occasion': 'casual',  # Default occasion
                '_used_default_budget': True,  # Flag for response customization
                '_vague_query': q,  # Store original query
            }
            # Mark flow as complete so we proceed to outfit building
            should_skip_flow = True
    
    if is_outfit_intent and not should_skip_flow:
        # Check if we should start conversation flow to gather requirements
        # Use "outfit_builder_conversation" flow name directly since we know the intent
        flow_name = "outfit_builder_conversation"
        if flow_name in conversation_handler.flows:
            log.info(f"🎯 Intent classified as outfit_builder - Starting conversation flow")
            
            # Start conversation (with one-shot extraction from initial message)
            first_question = await conversation_handler.start_conversation(session_key, flow_name, initial_message=q)
            
            return AgentOut(
                kind="answer",
                answer=first_question,  # "What's your budget?" or "I have everything I need!"
                items=[]
            )
    # ===== END CONVERSATION FLOW HANDLER =====

    # Route outfit requests to orchestrator (if we get here, conversation is complete or skipped)
    if is_outfit_intent:
        workflow_name = "outfit_builder"
        log.debug(f" 🎯 Routing to Agent Orchestrator: {workflow_name}")
        if body.sessionType == "outfit_builder":
            log.info(f"🎨 Forced outfit builder from sessionType (bypassing intent classification)")

        # Use outfit_builder session type for separate conversation
        outfit_session_key = get_namespaced_session_id(
            body.guestSessionId,
            body.clerkUserId,
            "outfit_builder"  # Force outfit builder session
        )
        
        # Get base user ID for accessing shared facts/preferences
        user_id = get_base_user_id(body.guestSessionId, body.clerkUserId)
        
        log.info(f"🎨 Outfit builder session: {outfit_session_key}")
        log.info(f"👤 Base user ID: {user_id}")
        
        # Event: Starting multi-agent workflow
        emit_event('thinking:step', {
            'icon': '🎨',
            'status': 'Building your complete outfit'
        })
        thinking_tracker.add_thinking("orchestrator", "Building complete outfit with specialized agents...")
        
        # Get user budget: 1) From conversation flow, 2) From profile, 3) Default
        gathered_context = getattr(body, '_gathered_context', {})
        log.debug(f" 💰 _gathered_context = {gathered_context}")
        budget_max = gathered_context.get('budget_max')  # User's explicit answer to "What's your budget?"
        log.debug(f" 💰 budget_max from context = {budget_max}")
        
        if not budget_max:
            # Fallback to user profile
            budget_max = 500  # Default
            if body.clerkUserId:
                ai_profile = await _load_ai_profile(body.clerkUserId)
                if ai_profile and ai_profile.get('budget_max'):
                    budget_max = float(ai_profile['budget_max'])
        
        log.info(f"💰 Using budget: €{budget_max} (from {'conversation' if gathered_context.get('budget_max') else 'profile/default'})")
        
        # ✨ Stream budget to frontend so UI displays correct amount
        emit_event('agentic:budget_set', {
            'budget_max': float(budget_max),
            'source': 'conversation' if gathered_context.get('budget_max') else 'default'
        })
        
        # Execute multi-agent workflow with streaming
        try:
            # Enable streaming for real-time progress
            log.info(f"🚀 Starting orchestrator execution with streaming...")
            result = None
            update_count = 0
            
            log.info(f"🔄 About to enter async for loop...")
            async for update in orchestrator.execute_workflow(
                workflow_name=workflow_name,
                query=q,
                context={
                    "session_id": outfit_session_key,  # Namespaced session for conversation
                    "user_id": user_id,  # Base user ID for facts (shared across sessions)
                    "budget_max": budget_max,
                    "user_size_history": {},  # Could load from profile
                    "original_query": gathered_context.get("original_query", "")  # Preserve for gender detection
                },
                stream=True  # Enable streaming!
            ):
                update_count += 1
                log.info(f"📦 Orchestrator update #{update_count}: type={update.get('type')}")
                log.info(f"📦 Update content: {update}")
                # Emit progress updates to frontend
                if update.get("type") == "progress":
                    agents = update.get("agents", [])
                    status = update.get("status", "Processing...")
                    emit_event('thinking:step', {
                        'icon': '⚙️',
                        'status': status
                    })
                    log.info(f"🔄 Progress: {status}")
                
                elif update.get("type") == "step_complete":
                    agents = update.get("agents", [])
                    emit_event('thinking:step', {
                        'icon': '✅',
                        'status': f"Completed {', '.join(agents)}"
                    })
                
                elif update.get("type") == "complete":
                    result = update.get("result")
                    log.info(f"✅ Workflow complete: {update.get('duration_ms', 0):.0f}ms")
                
                elif update.get("type") == "error":
                    result = update.get("result")
                    log.error(f"❌ Workflow error: {update.get('error')}")
                
                # ✨ PHASE 6: Handle agentic exploration events (live product discovery)
                elif update.get("type") == "agentic_event":
                    event_type = update.get("event_type")
                    # DEBUG: Write to file to verify events reach this point
                    with open("/tmp/agentic_debug.log", "a") as f:
                        f.write(f"AGENTIC EVENT: {event_type} - {update}\n")
                    
                    if event_type == "category_start":
                        emit_event('agentic:category_start', {
                            'category': update.get('category'),
                            'index': update.get('index'),
                            'total_categories': update.get('total_categories'),
                            'status': update.get('status')
                        })
                        log.info(f"🔍 Agentic: Starting {update.get('category')}...")
                    
                    elif event_type == "category_candidates":
                        emit_event('agentic:category_candidates', {
                            'category': update.get('category'),
                            'candidates': update.get('candidates', []),
                            'total_found': update.get('total_found'),
                            'status': update.get('status')
                        })
                        log.info(f"📦 Agentic: Found {update.get('total_found')} candidates for {update.get('category')}")
                    
                    elif event_type == "item_selected":
                        emit_event('agentic:item_selected', {
                            'category': update.get('category'),
                            'selected_item': update.get('selected_item'),
                            'reason': update.get('reason'),
                            'remaining_budget': update.get('remaining_budget'),
                            'status': update.get('status')
                        })
                        log.info(f"✅ Agentic: Selected {update.get('selected_item', {}).get('title')} for {update.get('category')}")

                    elif event_type == "category_vetting":
                        emit_event('agentic:category_vetting', {
                            'category': update.get('category'),
                            'slug': update.get('slug'),
                            'status': update.get('status'),
                            'message': update.get('message'),
                            'reason': update.get('reason')
                        })
            
            log.info(f"✅ Async for loop completed. Total updates: {update_count}")
            log.info(f"🎯 Final result: {result}")
            
            # If no result (shouldn't happen), use fallback
            if not result:
                return AgentOut(
                    kind="answer",
                    answer="Sorry, I couldn't build your outfit right now. Please try again!",
                    items=[]
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
                # DEBUG: Log product dict to diagnose missing price/imageUrl
                log.debug(f" outfit product keys: {list(product.keys())}")
                log.debug(f" product price={product.get('price')}, imageUrl={product.get('imageUrl')}")
                agent_items.append(AgentItem(
                    slug=product.get("slug", ""),
                    title=product.get("title", "Unknown"),
                    url=product.get("url", f"/product/{product.get('slug', '')}"),  # Required field!
                    score=product.get("score", 0.0),
                    reason=item.get("reason", ""),
                    type=product.get("type", ""),
                    tier=product.get("tier", ""),
                    color=product.get("color", ""),
                    size=product.get("size", ""),
                    variantId=product.get("variantId", ""),
                    # ✨ PHASE 6: Add price and imageUrl for proper outfit display
                    price=product.get("price"),
                    imageUrl=product.get("imageUrl"),
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
                # Only mention budget if it's tight or explicitly relevant
                if remaining < 100:
                    answer_parts.append(f"(€{remaining:.2f} left of budget)")
            else:
                answer_parts.append(f"Slightly over your €{budget_max} limit.")
            
            answer = " ".join(answer_parts)
            
            # Additional reasoning
            reasoning_parts = [result.get("reasoning", "")]
            if result.get("size_recommendations"):
                reasoning_parts.append("Sizes recommended based on brand standards.")
            
            return AgentOut(
                kind="recommendations",  # Show as product cards
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
            import traceback
            log.error(f"❌ Multi-agent orchestrator failed: {e}")
            log.error(f"Traceback: {traceback.format_exc()}")
            # Fall through to normal agent flow
            pass
    
    # ===== END MULTI-AGENT ORCHESTRATOR CHECK =====


    # ===== NOTE: Conversation flow now handled BEFORE orchestrator (lines ~1632-1648) =====


    ai_profile: Optional[Dict[str, Any]] = None
    if body.clerkUserId:
        ai_profile = await _load_ai_profile(body.clerkUserId)

    with get_conn() as conn:
        attrs = _parse_query_attrs(conn, q)
        log.debug(f"🎯 [AGENT] Received parsed attrs from _parse_query_attrs: {attrs}")
        # numeric_filters = parse_numeric_filters(q)
        # Use LLM-extracted entities (Slot Filling) for robust non-regex handling
        numeric_filters = classification.get("entities") or {}
        log.debug(f"🎯 [AGENT] LLM extracted filters: {numeric_filters}")
        base_filters: Dict[str, Any] = build_filters(attrs, numeric_filters)
        log.debug(f"🎯 [AGENT] Base filters after build_filters: {base_filters}")

    rec_filters: Dict[str, Any] = _apply_profile_defaults_to_filters(
        base_filters,
        ai_profile,
    )

    # SESSION GENDER PERSISTENCE
    # If user specified gender, store it for the entire session
    if rec_filters.get("gender"):
        SessionStateManager.set_gender_preference(body, rec_filters["gender"])
        log.info(f"👤 [GENDER] Stored gender preference for session: {rec_filters['gender']}")
    else:
        # Use stored gender from session if available
        session_gender = SessionStateManager.get_gender_preference(body)
        if session_gender:
            rec_filters["gender"] = session_gender
            log.info(f"👤 [GENDER] Using stored session gender: {session_gender}")

    # CONVERSATIONAL REFINEMENT (Sticky Context)
    # If current query doesn't specify type/gender, inherit from Hot Search Context
    search_ctx = SessionStateManager.get_search_context(body)
    if search_ctx and "filters" in search_ctx:
        prev_filters = search_ctx["filters"]
        context_updates = []
        
        # Inherit TYPE if not present in current query
        if not rec_filters.get("type") and prev_filters.get("type"):
            rec_filters["type"] = prev_filters["type"]
            context_updates.append(f"type={rec_filters['type']}")
            
        # Inherit GENDER if not present
        if not rec_filters.get("gender") and prev_filters.get("gender"):
            rec_filters["gender"] = prev_filters["gender"]
            context_updates.append(f"gender={rec_filters['gender']}")
            
        if context_updates:
            log.info(f"🧩 [CONTEXT] Refined query with context: {', '.join(context_updates)}")
    log.debug(f"🎯 [AGENT] Final rec_filters after profile defaults: {rec_filters}")

    # USER INTELLIGENCE: Accumulate entities for session-level learning
    # This builds a profile from query patterns (guests get this for the session)
    SessionStateManager.accumulate_entities(body, numeric_filters)
    accumulated_profile = SessionStateManager.get_accumulated_profile(body)
    if accumulated_profile.get("query_count", 0) > 1:
        log.info(f"🧠 [INTELLIGENCE] Accumulated profile: {accumulated_profile}")

    # NOTE: "Show more" context detection now uses LLM classification (semantic_intent == "show_more")
    # instead of hardcoded regex patterns. See handling after intelligent_classifier.classify() below.

    # Event: Understanding request
    emit_event('thinking:step', {
        'icon': '🧠',
        'status': 'Understanding your request'
    })
    
    # Phase 1: Track thinking - Understanding intent
    thinking_event_1 = thinking_tracker.add_thinking("classifier", "Understanding your request...")

    # === INTELLIGENT LLM-BASED INTENT CLASSIFICATION ===
    # Use 93% accurate semantic classifier instead of regex/rules
    # Import context manager
    from app.services.context_manager import get_conversation_context
    
    # Get conversation context (products shown, etc.)
    conversation_context = await get_conversation_context(
        session_id=body.guestSessionId or "",
        clerk_user_id=body.clerkUserId
    )
    
    intelligent_classifier = get_classifier()
    classification_result = await intelligent_classifier.classify(
        query=q,
        context=conversation_context  # Pass products shown, not just user_id
    )
    
    semantic_intent = classification_result["intent"]
    # Map semantic intent to orchestrator intent kind
    # Week 6: Use intelligent LLM-based intent classification
    from app.mcp_agents.intent_mapping import map_semantic_intent_to_orchestrator
    semantic_intent = classification_result["intent"]
    confidence = classification_result.get("confidence", 0.95)
    
    # === LLM-BASED "SHOW MORE" HANDLING ===
    # When LLM detects user wants more of same (e.g., "I'm not impressed", "got anything else?")
    # inherit the product type from conversation context
    if semantic_intent == "show_more" and not rec_filters.get("type"):
        inherited_type = None
        
        # Priority 1: Hot Search Context (Synchronous, Production Grade)
        # This is the exact context from the last successful search in this session
        search_ctx = SessionStateManager.get_search_context(body)
        if search_ctx and search_ctx.get("filters", {}).get("type"):
            inherited_type = search_ctx["filters"]["type"]
            log.info(f"📚 [SHOW MORE] Inherited type '{inherited_type}' from Hot Search Context")

        # Priority 2: Conversation Context (Fact DB - Async/Cross-Session)
        if not inherited_type:
            products_shown = conversation_context.get("products_shown", [])
            if products_shown:
                # Find the dominant product type from recently shown products
                type_counts = {}
                for prod in products_shown:
                    prod_type = prod.get("details", {}).get("type") or prod.get("type")
                    if prod_type:
                        type_counts[prod_type] = type_counts.get(prod_type, 0) + 1
                if type_counts:
                    inherited_type = max(type_counts, key=type_counts.get)
                    log.info(f"📚 [SHOW MORE] Inherited type '{inherited_type}' from Fact DB context")
        
        # Priority 3: Message History Fallback (For stateless/fresh sessions)
        if not inherited_type and body.history:
            import re
            # Common product type patterns
            type_patterns = ["hoodie", "tee", "t-shirt", "pants", "jacket", "bomber", "sweater", "shorts", "shoes", "sneakers", "blazer"]
            for msg in reversed(body.history):
                if msg.get("role") == "user":
                    content = msg.get("content", "").lower()
                    for pt in type_patterns:
                        if pt in content:
                            inherited_type = pt if pt != "t-shirt" else "tee"
                            log.info(f"📚 [SHOW MORE] Inherited type '{inherited_type}' from message history (fallback)")
                            break
                    if inherited_type:
                        break
        
        if inherited_type:
            rec_filters["type"] = inherited_type
        else:
            log.warning(f"[SHOW MORE] No context found - proceeding with no type filter")
        
        # Treat as product discovery for the rest of the flow
        semantic_intent = "recommendations"
    
    intent_kind = map_semantic_intent_to_orchestrator(semantic_intent)
    
    # Phase 1: Complete thinking event
    thinking_tracker.complete(
        thinking_event_1,
        details=f"Intent: {classification_result['intent']} → {intent_kind}",
        confidence=confidence * 100
    )
    
    # Map orchestrator intent back to API response kind for AgentOut
    # AgentOut only accepts: 'answer', 'recommendations', 'cart_proposal', 'checkout_ready'
    ORCHESTRATOR_TO_API_KIND = {
        "discover": "recommendations",
        "cart_add": "cart_proposal",
        "checkout_start": "checkout_ready",
        "size_fit": "answer",
        "policy": "answer",
        "agent_stylist": "recommendations"
    }
    
    # PRE-FLIGHT: Clear Classifier singleton to ensure config reload if needed
    # (Optional but good for debug/dev when config changes)
    if os.getenv("ENV") != "production":
        from app.mcp_agents.intent_classifier import classifier
        classifier._classifier = None

    # --- Branch 1: cart_proposal -------------------------------------------------
    
    # ⚡ HEURISTIC OVERRIDE Removed
        
        # Update derived values
        api_response_kind = ORCHESTRATOR_TO_API_KIND.get(intent_kind, "answer")
        confidence = 1.0

    api_response_kind = ORCHESTRATOR_TO_API_KIND.get(intent_kind, "answer")
    
    # Production monitoring - using print for immediate visibility
    log.debug(f"🔍 [INTENT_MONITOR] query='{q[:80]}' | semantic='{semantic_intent}' | orchestrator='{intent_kind}' | api_kind='{api_response_kind}' | conf={confidence:.2%}")
    
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
    awaiting = SessionStateManager.get_awaiting_size(body)
    if awaiting:
        # Check if this message looks like JUST a size answer (e.g., "M", "in M", "size L")
        # Simple pattern: message contains  S/M/L/XL but not other product keywords
        looks_like_size_only = bool(re.search(r'\b(?:in\s+)?(?:size\s+)?([smlxSMLX]{1,3})\b', q.lower())) and len(q.strip()) < 20
        
        # Only clear awaiting if this is clearly a NEW product search, not a size response
        if intent_kind == "discover" and not (intent_kind == "cart_add") and not looks_like_size_only:
            SessionStateManager.clear_awaiting_size(body)
            awaiting = None  # Treat as if no awaiting state
        
    if awaiting:
        # Only process size if this looks like JUST a size response
        # Use existing cart add detection (no hardcoding!)
        size = None
        
        # Check if message looks like cart add intent using existing function
        has_cart_intent = (intent_kind == "cart_add")
        
        # Extract size from message - prioritize short responses like "M" or "in M"
        if not has_cart_intent:
            match = re.search(r'\b(?:in\s+)?(?:size\s+)?([smlxSMLX]{1,3})\b', q, re.IGNORECASE)
            if match:
                size = match.group(1).upper()
        
        if size:
            # Clear the awaiting state
            SessionStateManager.clear_awaiting_size(body)
            
            # Recreate cart_proposal with the size
            product = awaiting["product"]
            top = AgentItem(**product)
            
            nice_type = (top.type or "").lower()
            nice_color = (top.color or "").lower()
            
            # Store product with size and ask for quantity
            product_with_size = product.copy()
            product_with_size["size"] = size
            
            SessionStateManager.set_awaiting_quantity(body, {"product": product_with_size})
            
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
    awaiting_qty = SessionStateManager.get_awaiting_quantity(body)
    if awaiting_qty:
        # Check if this looks like a quantity response (number)
        looks_like_qty_only = len(q.strip()) < 10  # Very short response
        
        # Only clear if clearly a new search
        if intent_kind == "discover" and not (intent_kind == "cart_add") and not looks_like_qty_only:
            SessionStateManager.clear_awaiting_quantity(body)
            awaiting_qty = None
    
    if awaiting_qty:
        # Extract quantity from message
        quantity = None
        has_cart_intent = (intent_kind == "cart_add")
        
        if not has_cart_intent:
            # Try to find a number in the message (1-10 typical range)
            match = re.search(r'\b([1-9]|10)\b', q.strip())
            if match:
                quantity = int(match.group(1))
        
        if quantity:
            # Clear the awaiting state
            SessionStateManager.clear_awaiting_quantity(body)
            
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
    awaiting_color = SessionStateManager.get_awaiting_color(body)
    if awaiting_color:
        # Check if this message looks like JUST a color response (e.g., "navy", "black", "in navy")
        looks_like_color_only = len(q.strip()) < 30  # Short response
        
        # Only clear awaiting if this is clearly a NEW product search
        if intent_kind == "discover" and not (intent_kind == "cart_add") and not looks_like_color_only:
            SessionStateManager.clear_awaiting_color(body)
            awaiting_color = None
        
    if awaiting_color:
        # Extract color from message
        color = None
        has_cart_intent = (intent_kind == "cart_add")
        
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
            SessionStateManager.clear_awaiting_color(body)
            
            # Now check if we need size
            product = awaiting_color["product"]
            top = AgentItem(**product)
            
            # Update product color in the session state
            top_dict = product.copy()
            top_dict["color"] = color
            
            # Ask for size if not provided
            SessionStateManager.set_awaiting_size(body, {"product": top_dict})
            
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
        log.info(f"🛒 [DEBUG] CART BRANCH TRIGGERED: wants_cart={wants_cart}, intent_kind={intent_kind}")
        last_recs = SessionStateManager.get_session_recs(body)
        debug_plan["last_recs_count"] = len(last_recs)

        if last_recs:
            # NEW: Context-aware cart add - check if user references a recently discussed product
            # When user says "add this to cart" after discussing "the second one", resolve it
            import re
            vague_reference = re.search(r'\b(this|it|that|the one)\b', q.lower())
            context_idx = None
            
            if vague_reference:
                # Fetch conversation history to resolve vague references
                cart_history = await HistoryManager.fetch_history(
                    body.clerkUserId,
                    body.guestSessionId,
                    limit=5
                )
                if cart_history:
                    context_idx = numeric_filters.get("target_index")
                    if context_idx is not None:
                        log.info(f"🛒 [CONTEXT_CART] Resolved '{vague_reference.group(1)}' to product index {context_idx}")
                        debug_plan["cart_context_resolved"] = True
                        debug_plan["cart_context_idx"] = context_idx
            
            # Use context-resolved index if available, otherwise fall back to LLM selection
            if context_idx is not None:
                indices = [context_idx]
                debug_plan["cart_source"] = "context_history"
            else:
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
                    available_colors = get_available_colors(top.slug)
                    
                    if available_colors and len(available_colors) > 1:
                        # Ask for color first
                        SessionStateManager.set_awaiting_color(body, {
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
                    SessionStateManager.set_awaiting_size(body, {
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
                "Please either click a specific product or tell me which one "
                "(for example: 'add the second one' or 'add the boots')."
            ),
            citations=[],
            items=[],
            cart_payload=None,
        )

    # --- Branch 2: size & fit advisor -------------------------------------------
    if intent_kind == "size_fit" and not wants_cart:

        fit_resp = await _call_fit_recommend(q, attrs, profile=ai_profile, entities=numeric_filters)
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
        log.debug(f"🔍 [DEBUG] RECS BRANCH TRIGGERED: wants_recs={wants_recs}, intent_kind={intent_kind}")
        
        # Fetch conversation facts for personalization
        # (Recs branch bypasses _agent_query_impl, so we need to fetch facts here)
        try:
            from app.services.fact_storage import get_facts
            conversation_facts = await get_facts(
                clerk_user_id=body.clerkUserId,
                guest_session_id=body.guestSessionId
            )
            if conversation_facts:
                log.info(f"📥 [RECS] Retrieved conversation facts with {len(conversation_facts.get('product_focus', {}).get('current_products', []))} current products")
        except Exception as e:
            log.warning(f"[RECS] Failed to retrieve conversation facts (non-critical): {e}")
            conversation_facts = {}
        
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
            shown_slugs = SessionStateManager.get_shown_slugs(body)
            search_top_k = body.top_k
            if shown_slugs:
                # Fetch significantly more to account for filtering (pagination effect)
                # If user has seen top 20 items, we need to fetch 30+ to find new ones.
                search_top_k = max(60, body.top_k * 5)
                debug_plan["expanded_search_for_shown"] = True
                debug_plan["search_top_k"] = search_top_k



            # Facet Query Handling: "What [facet]?" (Generic)
            # If asking for colors/styles/fabrics of a specific type, reset query to text-less to get top items
            import re
            # Facet Neutralization (LLM)
            facet_query = numeric_filters.get("facet_query")
            
            if facet_query and rec_filters.get("type"):
                facet_type = facet_query.lower()
                log.info(f"🎨 [FACET] Detected facet query '{facet_type}' - neutralizing text search to show top items")
                # Use the type itself as query to ensure results (empty string might fail)
                rec_query = rec_filters["type"]
            else:
                rec_query = build_rec_query(q, rec_filters)

            # Detect SKU/Exact Match intent
            # If query looks like a SKU (e.g. "SKU-123", "Ref 456") or explicit specific search
            import re
            sku_pattern = re.compile(r'\b(sku|ref|id|code)[:\-\s]*[a-zA-Z0-9]+', re.IGNORECASE)
            is_sku_query = bool(sku_pattern.search(rec_query))

            # Pass exclude_slugs for proper "show more" pagination
            # This tells the recs endpoint to skip products user has already seen
            rec_payload = {
                "query": rec_query,
                "filters": rec_filters,
                "top_k": search_top_k,  # Use expanded top_k
                "exclude_slugs": list(shown_slugs) if shown_slugs else None,
                "visual_vibe": rec_filters.get("_visual_vibe"), # Pass vibe signal
                "user_profile": accumulated_profile, # Pass session preferences for ranking
                "sku_boost": is_sku_query # Boost BM25 for exact matches
            }
            rec_resp = await _call_recs_suggest(rec_payload)
            
            # Phase 1: Complete tool tracking
            item_count = len(rec_resp.get("items", []))
            tool_tracker.complete(search_tool, outputs={"count": item_count})
            
            # SYNCHRONOUS STATE UPDATE (Production Grade)
            # Save hot context so "Show More" works reliably in next turn
            if item_count > 0:
                ctx_filters = rec_filters.copy()
                
                # Auto-infer type from results if missing in query
                if not ctx_filters.get("type"):
                    found_items = rec_resp.get("items", [])
                    # item can be dict or AgentItem object
                    types = []
                    for it in found_items:
                        t = it.get("type") if isinstance(it, dict) else getattr(it, "type", None)
                        if t:
                            types.append(t)
                            
                    if types:
                        from collections import Counter
                        most_common = Counter(types).most_common(1)
                        # If >50% of items are same type, adopt it as context
                        if most_common and most_common[0][1] >= len(types) * 0.5:
                            ctx_filters["type"] = most_common[0][0]
                            log.info(f"🧠 [CONTEXT] Auto-inferred context type: '{ctx_filters['type']}' from results")

                SessionStateManager.set_search_context(
                    body, 
                    filters=ctx_filters, 
                    intent=intent_kind
                )
            
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

        # --- RETRY LOGIC: If strict type filtering yielded 0 results, try loosening constraints ---
        if not items and rec_filters.get("type"):
            log.info(f"🔄 [RETRY] Zero results for type='{rec_filters['type']}'. Retrying without type filter...")
            
            fallback_filters = rec_filters.copy()
            del fallback_filters["type"]
            
            rec_payload["filters"] = fallback_filters
            try:
                rec_resp = await _call_recs_suggest(rec_payload)
                raw_items = rec_resp.get("items") or []
                items = [
                    AgentItem(**it)
                    for it in raw_items
                    if isinstance(it, dict) and it.get("slug")
                ]
                if items:
                    log.info(f"✅ [RETRY] Found {len(items)} items without type filter. Proceeding to Availability Checker.")
            except Exception as e:
                log.warning(f"Fallback search failed: {e}")

        # Event: Found items
        emit_event('thinking:step', {
            'icon': '✓',
            'status': f'Found {len(items)} items',
            'done': True
        })

        debug_plan["rec_item_count"] = len(items)

        # Initialize availability dict for cases with no items
        availability = {
            "should_show_results": bool(items),
            "exact_match": False,
            "has_close_alternative": False,
            "recommended_items": items,
            "honesty_message": ""
        }

        if items:
            log.debug(f"📦 [RECS] Items before filtering/checking: {len(items)} items")
            # Phase 1: Filter out items user has already seen (for \"show more\")
            shown_slugs = SessionStateManager.get_shown_slugs(body)
            original_items_before_filter = list(items)  # Keep a copy
            if shown_slugs:
                original_count = len(items)
                items = SessionStateManager.filter_out_shown_items(items, shown_slugs)
                debug_plan["filtered_shown_items"] = original_count - len(items)
                
                # CRITICAL: If ALL items were filtered out, don't fallback to different products!
                # Instead, re-show the original items with a helpful message
                if not items and original_items_before_filter:
                    log.info(f"📚 [SHOW MORE] User has seen all {original_count} items in this category. Re-showing original items.")
                    items = original_items_before_filter
                    debug_plan["all_items_shown"] = True
                    # Set a flag to add a message like "You've seen all our hoodies!"
                    debug_plan["user_seen_all"] = True
            
            # Limit to user's requested top_k (after filtering)
            items = list(items)[:body.top_k]
            log.debug(f"📦 [RECS] Items after shown filter + top_k limit: {len(items)} items")
            
            # ✨ WEEK 3 DAY 2: Honest Product Availability Check
            # Prevent recommending t-shirts for suits!
            from app.agents.product_availability_checker import ProductAvailabilityChecker
            checker = ProductAvailabilityChecker()
            
            # Event: Validating results
            emit_event('thinking:step', {
                'icon': '🛡️',
                'status': 'Validating product matches'
            })
            
            
            log.debug(f"🔍 [DEBUG] Calling availability checker with:")
            
            # Defensive: Ensure items are valid objects before passing to checker
            # This prevents 500 errors if session state corrupts items into strings
            items = [it for it in items if hasattr(it, "dict")]
            
            availability = await checker.check_and_recommend(
                user_query=rec_query,
                search_results=[it.dict() for it in items]
            )
            log.debug(f"🛡️ [AVAILABILITY] Checker returned: should_show={availability.get('should_show_results')}, exact={availability.get('exact_match')}, close={availability.get('has_close_alternative')}")
            log.debug(f"🛡️ [AVAILABILITY] Recommended items count: {len(availability.get('recommended_items', []))}")
            log.debug(f"🛡️ [AVAILABILITY] Honesty message: {availability.get('honesty_message')}")
        
        # --- FALLBACK LOGIC (executes for empty results OR rejected results) ---
        should_show = availability.get("should_show_results", False)
        
        if not should_show:
            log.warning(f"❌ [AVAILABILITY] Initial search failed/rejected (items={len(items)}). Attempting Semantic Fallback.")
            
            # Check if we have a mapped category we can fall back to
            types_list = attrs.get("types", [])
            current_type = types_list[0] if types_list else None
            
            fallback_success = False
            
            if current_type:
                from app.agents.product_availability_checker import ProductAvailabilityChecker
                checker = ProductAvailabilityChecker()
                
                # NEW: Try semantically similar types first (e.g., pants -> joggers, jeans)
                similar_types = _get_similar_types(current_type)
                log.info(f"🔄 [SEMANTIC FALLBACK] Similar types for '{current_type}': {similar_types}")
                
                fallback_success = False
                
                # Try each similar type in order of relevance
                for similar_type in similar_types[:3]:  # Limit to top 3 most similar
                    log.info(f"🔄 [FALLBACK] Trying similar type: '{similar_type}'")
                    
                    # Build query with color if available
                    parts = []
                    if attrs.get("colors"):
                        parts.append(attrs["colors"][0])
                    parts.append(similar_type)
                    
                    fallback_query = " ".join(parts)
                    fallback_filters = rec_filters.copy()
                    fallback_filters["type"] = similar_type
                    
                    fallback_payload = {
                        "query": fallback_query,
                        "filters": fallback_filters,
                        "top_k": body.top_k
                    }
                    
                    try:
                        fb_resp = await _call_recs_suggest(fallback_payload)
                        fb_raw_items = fb_resp.get("items") or []
                        fb_items = [AgentItem(**it) for it in fb_raw_items if isinstance(it, dict) and it.get("slug")]
                        
                        if fb_items:
                            # Re-check availability
                            fb_availability = await checker.check_and_recommend(
                                user_query=fallback_query,
                                search_results=[it.dict() for it in fb_items]
                            )
                            
                            if fb_availability.get("should_show_results", True):
                                log.info(f"✅ [SEMANTIC FALLBACK] Success! Found {len(fb_items)} {similar_type}s")
                                items = fb_items
                                availability = fb_availability 
                                availability["should_show_results"] = True
                                availability["honesty_message"] = f"We couldn't find exact matches for '{q}', but here are some {similar_type}s you might like."
                                fallback_success = True
                                break  # Found good results, stop trying
                    except Exception as e:
                        log.warning(f"Semantic fallback for '{similar_type}' failed: {e}")
                        continue
                
                # If semantic fallback didn't work, try broad category fallback (old strategy)
                if not fallback_success:
                    log.info(f"🔄 [FALLBACK] Semantic fallback exhausted. Trying broad category fallback.")
                    
                    # Strategy 1: Broad Category Search with Color
                    # "{Color} {Type}" (e.g. "Black Jacket")
                    parts = []
                    if attrs.get("colors"):
                        parts.append(attrs["colors"][0])
                    parts.append(current_type)
                    
                    fallback_query = " ".join(parts)
                    
                    # Strategy 2: If Strategy 1 is same as original query, DROP COLOR
                    if fallback_query.lower().strip() == rec_query.lower().strip():
                        log.info(f"🔄 [FALLBACK] Strategy 1 failed (Same Query). Dropping color to broaden.")
                        fallback_query = current_type  # Just "jacket"
                        # Create new filters without color
                        fallback_filters = rec_filters.copy()
                        fallback_filters.pop("color", None)
                    else:
                        fallback_filters = rec_filters
                    
                    if fallback_query.lower().strip() != rec_query.lower().strip() or "color" not in fallback_filters:
                        log.info(f"🔄 [FALLBACK] Attempting Category Search: '{fallback_query}'")
                        
                        # Create new payload dict (not Pydantic model)
                        fallback_payload = {
                            "query": fallback_query,
                            "filters": fallback_filters,
                            "top_k": body.top_k
                        }
                        
                        try:
                            fb_resp = await _call_recs_suggest(fallback_payload)
                            fb_raw_items = fb_resp.get("items") or []
                            fb_items = [AgentItem(**it) for it in fb_raw_items if isinstance(it, dict) and it.get("slug")]
                            
                            if fb_items:
                                # Re-check availability (relaxed mode)
                                fb_availability = await checker.check_and_recommend(
                                    user_query=fallback_query,
                                    search_results=[it.dict() for it in fb_items]
                                )
                                
                                if fb_availability.get("should_show_results", True):
                                    log.info(f"✅ [FALLBACK] Success! Found {len(fb_items)} items for category '{fallback_query}'")
                                    items = fb_items
                                    availability = fb_availability 
                                    availability["should_show_results"] = True
                                    availability["honesty_message"] = f"We couldn't find exact matches for '{q}', but here are some {fallback_query}s you might like."
                        except Exception as e:
                            log.warning(f"Category fallback failed: {e}")
            else:
                # No type extracted - try a very broad fallback by removing type filter
                log.info(f"🔄 [FALLBACK] No type extracted. Trying broad search without type filter.")
                from app.agents.product_availability_checker import ProductAvailabilityChecker
                checker = ProductAvailabilityChecker()
                
                # Remove all strict filters for maximum broadness
                fallback_filters = {}
                fallback_query = rec_query  # Keep original query text
                
                fallback_payload = {
                    "query": fallback_query,
                    "filters": fallback_filters,
                    "top_k": body.top_k
                }
                
                try:
                    fb_resp = await _call_recs_suggest(fallback_payload)
                    fb_raw_items = fb_resp.get("items") or []
                    fb_items = [AgentItem(**it) for it in fb_raw_items if isinstance(it, dict) and it.get("slug")]
                    
                    if fb_items:
                        fb_availability = await checker.check_and_recommend(
                            user_query=fallback_query,
                            search_results=[it.dict() for it in fb_items]
                        )
                        
                        if fb_availability.get("should_show_results", True):
                            log.info(f"✅ [FALLBACK] Success! Found {len(fb_items)} items with broad search")
                            items = fb_items
                            availability = fb_availability
                            availability["should_show_results"] = True
                            availability["honesty_message"] = f"We couldn't find exact matches for '{q}', but here are some items you might like."
                            fallback_success = True
                except Exception as e:
                    log.warning(f"Broad fallback failed: {e}")


        # Re-evaluate should_show after fallback
        should_show = availability.get("should_show_results", False)


        if not should_show:
            # Ensure we have a honesty message
            if not availability.get("honesty_message"):
                availability["honesty_message"] = f"We couldn't find matching products in the catalog."
            
            log.info(f"🚫 Availability Checker rejected results for '{q}': {availability.get('honesty_message')}")
            return AgentOut(
                kind="answer",
                answer=availability.get("honesty_message"),
                items=[],
                debug_plan={**debug_plan, "availability_rejected": True}
            )
        
        log.info(f"✅ [AVAILABILITY] Approved results - proceeding with {len(items)} items")
        
        # Mark these NEW items as shown for this session
        SessionStateManager.mark_slugs_as_shown(body, [item.slug for item in items])
        
        SessionStateManager.store_session_recs(body, items)

        # Generate personalized intro using LLM
        intro_info = await _build_discover_intro(
            body=body,
            items=items,
            attrs=attrs,
            rec_filters=rec_filters,
            honesty_message=availability.get("honesty_message"),
            conversation_facts=conversation_facts,
        )

        debug_plan["llm_discover_intro_used"] = intro_info.get("llm_used", False)
        debug_plan["llm_discover_intro_history_len"] = intro_info.get("history_len", 0)
        debug_plan["llm_discover_intro_summary_used"] = intro_info.get("summary_used", False)
        debug_plan["availability_explanation"] = availability.get("alternative_explanation")

        if intro_info.get("llm_used"):
            debug_plan["llm_used"] = True

        intro_line = intro_info.get("text", availability.get("honesty_message") or "Here are some options.")

        # Facet Answer Override: Generic (Color, Style, Fabric)
        # Re-run regex to match the facet requested
        # Facet Answer Override (LLM)
        facet_query_ans = numeric_filters.get("facet_query")
        
        if facet_query_ans and rec_filters.get("type"):
             try:
                 facet_key = facet_query_ans.lower()
                 # Normalize facet key for backend (e.g. materials -> material)
                 normalized_facet = facet_key.rstrip('s') 
                 
                 from app.services.product import get_available_facet_values
                 avail_values = get_available_facet_values(rec_filters["type"], normalized_facet)
                 
                 if avail_values:
                     # Filter readable values
                     readable_vals = [v for v in avail_values if v and len(v) < 30]
                     if readable_vals:
                         vals_str = ", ".join(readable_vals[:5])  # top 5
                         if len(readable_vals) > 5:
                             vals_str += f", and {len(readable_vals)-5} more"
                         
                         intro_line = f"We have {rec_filters['type']} with these {facet_key}: {vals_str}. Here are some popular options:"
                         log.info(f"🎨 [FACET] Overrode answer with {facet_key} list: {vals_str}")
             except Exception as e:
                 log.warning(f"Failed to fetch facet values for answer: {e}")

        # Event: Ranking complete
        emit_event('thinking:step', {
            'icon': '✓',
            'status': 'Top recommendations ready',
            'done': True
        })

        if items:
            SessionStateManager.store_session_recs(body, items)

        # --- Verification ---
        verifier = get_verifier()
        
        # Get accumulated user profile for personalized verification
        user_profile = SessionStateManager.get_accumulated_profile(body)
        
        verify_ctx = {
            "intent": intent_kind,
            "filters": numeric_filters,
            "history_len": len(body.history) if body.history else 0,
            "user_profile": user_profile  # Session-learned preferences
        }
        verify_tools = {
            "items_found": len(items),
            "top_item": items[0].dict() if items else None
        }
        
        verification = await verifier.verify(
            query=body.message,
            draft_answer=intro_line,
            context=verify_ctx,
            tool_outputs=verify_tools
        )
        if verification.get("status") == "RETRY" and body.retry_count < 1:
            refined_q = verification.get("refined_query")
            if refined_q:
                log.warning(f"🔄 [CRAG] Verifier requested RETRY (Attempt {body.retry_count+1}/2). New Query: '{refined_q}'")
                
                # Create deep copy of messages to modify the last one
                new_msgs = [m.copy() for m in body.messages]
                if new_msgs and new_msgs[-1].role == "user":
                    new_msgs[-1].content = refined_q
                
                # Recursive call with refined query
                new_body = body.copy(update={
                    "messages": new_msgs,
                    "retry_count": body.retry_count + 1
                })
                
                return await agent_chat(new_body)

        intro_line = verification["refined_answer"]
        suggestions = verification["suggestions"]
        print(f"✅ [VERIFIER] Status: {verification['status']} | Suggestions: {len(suggestions)}")

        return AgentOut(
            kind="recommendations",
            answer=intro_line,
            citations=[],
            items=items,
            debug_plan=debug_plan,
            suggestions=suggestions,
        )

        # no items → fall through to RAG / chat below

    # --- Branch 4: generic fallback (LLM chat or RAG) --------------------------
    log.debug(f"💬 [DEBUG] FALLBACK BRANCH: wants_cart={wants_cart}, wants_recs={wants_recs}, intent_kind={intent_kind}")
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

    rag_resp = await _call_rag(q, body.top_k, filters=numeric_filters, intent=intent_kind)
    answer = rag_resp.get("answer") or "Sorry, I couldn’t find that."
    citations = rag_resp.get("citations") or []

    # --- Verification ---
    verifier = get_verifier()
    
    # Get accumulated user profile for personalized verification
    user_profile = SessionStateManager.get_accumulated_profile(body)
    
    verify_ctx = {
        "intent": intent_kind,
        "rag_filters": numeric_filters,
        "user_profile": user_profile  # Session-learned preferences
    }
    verify_tools = {
        "citations_count": len(citations),
        "found_answer": rag_resp.get("answer") is not None
    }

    verification = await verifier.verify(
        query=q,
        draft_answer=answer,
        context=verify_ctx,
        tool_outputs=verify_tools
    )
    answer = verification["refined_answer"]
    suggestions = verification["suggestions"]
    print(f"✅ [VERIFIER] Status: {verification['status']} | Suggestions: {len(suggestions)}")

    return AgentOut(
        kind=api_response_kind,  # Use mapped API kind for Pydantic validation
        answer=answer,
        citations=citations,
        items=[],
        debug_plan=debug_plan,
        suggestions=suggestions,
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
