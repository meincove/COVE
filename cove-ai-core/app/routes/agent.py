# app/routes/agent.py
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import httpx
import logging

from app.vector.store import connect
from app.agent.orchestrator import classify
from app.routes.rag import rag_query, RAGIn, _parse_query_attrs  # reuse RAG bits

log = logging.getLogger("cove.agent")
router = APIRouter()

_conn = None


# --------- I/O models ---------

class AgentIn(BaseModel):
    message: str
    top_k: int = 6


class AgentOut(BaseModel):
    # "answer" = normal QA, "recommendations" = rec-list
    kind: str
    answer: str
    citations: List[Dict[str, Any]] = []
    items: List[Dict[str, Any]] = []
    debug_plan: Dict[str, Any] = {}


# --------- Internal helpers ---------

def _should_treat_as_recs(intent_kind: str, q: str) -> bool:
    """Fallback heuristic if classifier is too generic."""
    if intent_kind == "recommend":
        return True

    ql = q.lower()
    trigger_words = [
        "recommend",
        "recommendation",
        "suggest",
        "options",
        "something like",
        "similar to",
        "more like this",
        "what else do you have",
        "show me more",
    ]
    return any(w in ql for w in trigger_words)


async def _call_recs_suggest(
    q: str,
    *,
    attrs: Dict[str, List[str]],
    top_k: int,
) -> Dict[str, Any]:
    """
    Thin wrapper over /ai/recs/suggest.
    Builds filters from parsed attrs (type/color/size).
    """
    # Take first match for now; can be extended later to multi.
    prod_type = (attrs.get("types") or [None])[0]
    color     = (attrs.get("colors") or [None])[0]
    size      = (attrs.get("sizes") or [None])[0]

    filters: Dict[str, str] = {}
    if prod_type:
        filters["type"] = prod_type
    if color:
        filters["color"] = color
    if size:
        filters["size"] = size

    payload = {
        "query": q,
        "filters": filters,
        "top_k": top_k,
    }

    async with httpx.AsyncClient(timeout=5) as cx:
        r = await cx.post(
            "http://127.0.0.1:8000/ai/recs/suggest",
            json=payload,
        )
    r.raise_for_status()
    data = r.json() or {}
    data["_filters"] = filters
    return data


# --------- Main agent endpoint ---------

@router.post("/ai/agent/query", response_model=AgentOut)
async def agent_query(body: AgentIn) -> AgentOut:
    """
    Single brain for Cove AI.
    - Classify intent
    - Decide between:
        • product/policy/size_fit → RAG
        • recommendations → recs.suggest
    - Return a structured AgentOut for the frontend.
    """
    global _conn
    _conn = _conn or connect()

    q = body.message

    # Reuse attribute parsing from RAG (colors/types/sizes)
    attrs = _parse_query_attrs(_conn, q)

    # High-level intent from orchestrator
    intent = classify(q, attrs)
    intent_kind = getattr(intent, "kind", "generic")

    # Decide if this should go through the recommendations branch
    wants_recs = _should_treat_as_recs(intent_kind, q)

    debug_plan: Dict[str, Any] = {
        "intent_kind": intent_kind,
        "wants_recs": wants_recs,
        "attrs": attrs,
    }


    ql = (body.message or "").lower()

    display_verbs = (
        "show me",
        "find me",
        "find a",
        "find some",
        "recommend",
        "suggest",
        "looking for",
        "search for",
        "show some",
        "show a",
    )

    explicit_display = any(phrase in ql for phrase in display_verbs)
    has_product_type = bool((attrs.get("types") or []))

    # --- Decide whether we want recommendations or pure Q&A/size_fit ---
    wants_recs: bool

    if intent_kind in ("discover", "recs", "browse"):
        # classifier is already confident it's a discovery intent
        wants_recs = True
    elif explicit_display and has_product_type:
        # user is clearly asking to *see* products of a certain type
        # even if classifier said "size_fit", we treat this as recs
        wants_recs = True
    else:
        wants_recs = False

    # --------- Branch: recommendations ---------
    if wants_recs:
        try:
            rec_data = await _call_recs_suggest(q, attrs=attrs, top_k=body.top_k)
        except Exception as e:
            log.warning("agent.recs_suggest failed: %s", e)
            # Fallback to RAG answer if recs backend fails
            rag_body = RAGIn(query=q, top_k=body.top_k)
            rag_resp = await rag_query(rag_body)
            return AgentOut(
                kind="answer",
                answer=rag_resp["answer"],
                citations=rag_resp.get("citations", []),
                items=[],
                debug_plan={**debug_plan, "fallback": "rag_after_recs_error"},
            )

        items = rec_data.get("items") or []
        filters_used = rec_data.get("_filters", {})

        debug_plan["rec_filters"] = filters_used
        debug_plan["rec_item_count"] = len(items)

        if not items:
            # Nothing suitable to recommend → degrade gracefully to RAG
            rag_body = RAGIn(query=q, top_k=body.top_k)
            rag_resp = await rag_query(rag_body)
            return AgentOut(
                kind="answer",
                answer=rag_resp["answer"],
                citations=rag_resp.get("citations", []),
                items=[],
                debug_plan={**debug_plan, "fallback": "rag_after_empty_recs"},
            )

        # Short, generic headline for the UI; cards come from `items`.
        headline = "Here are some options that match what you asked for."

        # We return items as plain dicts so we don’t couple tightly to recs schema.
        return AgentOut(
            kind="recommendations",
            answer=headline,
            citations=[],  # recs use cards, not doc citations
            items=items,
            debug_plan=debug_plan,
        )

    # --------- Default branch: RAG (product info, policy, size_fit, etc.) ---------
    rag_body = RAGIn(query=q, top_k=body.top_k)
    rag_resp = await rag_query(rag_body)

    return AgentOut(
        kind="answer",
        answer=rag_resp["answer"],
        citations=rag_resp.get("citations", []),
        items=[],
        debug_plan=debug_plan,
    )
