# app/routes/agent.py
from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from app.vector.store import connect
from app.agent.orchestrator import classify
from app.routes.rag import _parse_query_attrs  # reuse the same attrs logic as RAG

from pydantic import Field

DJANGO_BASE_URL = os.getenv("DJANGO_BASE_URL", "http://127.0.0.1:8001")
log = logging.getLogger("cove.agent")
router = APIRouter()

_conn = None  # shared read-only connection


# ---------- I/O models ----------

class AgentIn(BaseModel):
    message: str
    top_k: int = 6

    # NEW: optional context for cart + user
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


from typing import Optional
from typing_extensions import Literal  # if not already imported

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
    cart: Dict[str, Any]
    


# ---------- Small helpers ----------
def _build_rec_query(msg: str, attrs: Dict[str, List[str]]) -> str:
    """
    Build a clean retrieval query for /ai/recs/suggest.

    Prefer structured attrs (type/color/size) over the raw sentence,
    because keyword + trigram search works better on short product-y queries.
    """
    f = _build_rec_filters(attrs)
    parts: List[str] = []

    # order: color, type, size (you can tweak)
    if f.get("color"):
        parts.append(f["color"])
    if f.get("type"):
        parts.append(f["type"])
    if f.get("size"):
        parts.append(f["size"])

    rec_q = " ".join(parts).strip()
    return rec_q or msg.strip()


def _build_rec_filters(attrs: Dict[str, List[str]]) -> Dict[str, str]:
    """
    Turn parsed attrs into filters for /ai/recs/suggest.
    Generic: works for any type/color/size in your catalog.
    """
    f: Dict[str, str] = {}
    if attrs.get("types"):
        f["type"] = attrs["types"][0]
    if attrs.get("colors"):
        f["color"] = attrs["colors"][0]
    if attrs.get("sizes"):
        f["size"] = attrs["sizes"][0]
    return f


def _looks_like_cart_add(msg: str) -> bool:
    """
    Lightweight, generic detector for "add to cart" / "buy this" intents.
    No product hardcoding; purely phrasing-based.
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


def _infer_wants_recs(msg: str, intent_kind: str) -> bool:
    """
    Detect when user wants to BROWSE options (vs just size/fit or policy).
    Generic phrasing, not hoodie-specific.
    """
    q = msg.lower()

    browse_triggers = (
        "show me",
        "find me",
        "recommend",
        "suggest",
        "looking for",
        "see some",
        "see options",
        "what do you have",
        "what hoodies",
        "what jackets",
        "what jeans",
    )

    if any(kw in q for kw in browse_triggers):
        return True

    # If intent is 'size_fit' but user did NOT mention measurements,
    # it's likely a discovery query ("black hoodie available sizes?")
    if intent_kind == "size_fit" and not re.search(r"\d{2,3}\s*cm", q):
        return False

    return False
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
) -> Optional[Dict[str, Any]]:
    """
    Call /ai/fit/recommend if we can parse height+weight.

    - product_type: from parsed attrs.types[0] if present, else None
    - fit_preference: inferred from message text
    - slug: left None for now (generic type-level recommendation)
    """
    metrics = _extract_body_metrics(message)
    if not metrics:
        return None

    product_type = None
    if attrs.get("types"):
        product_type = attrs["types"][0]

    fit_pref = _infer_fit_preference(message)

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
        * Cart action plan ("cart_add")
    - Returns a structured payload the frontend can execute.
    """
    global _conn
    _conn = _conn or connect()

    q = body.message

    # 1) Parse attributes (colors/types/sizes) using the same logic as RAG
    attrs = _parse_query_attrs(_conn, q)

    # 2) Classify high-level intent (size_fit, policy, lookup_product, etc.)
    # 2) Classify high-level intent (size_fit, policy, lookup_product, etc.)
    intent = classify(q, attrs)
    intent_kind = getattr(intent, "kind", "generic")

    # 3) Decide if user wants recs or cart action
    wants_cart = _looks_like_cart_add(q)
    wants_recs = _infer_wants_recs(q, intent_kind)

    rec_filters = _build_rec_filters(attrs)

    debug_plan: Dict[str, Any] = {
        "intent_kind": intent_kind,
        "wants_cart": wants_cart,
        "wants_recs": wants_recs,
        "attrs": attrs,
        "rec_filters": rec_filters or None,
    }


    # ------------- Branch 1: cart_proposal (plan only, no side-effects) -------------
    if wants_cart:
        # Use the same suggestion engine to resolve *which* product variant
        rec_query = _build_rec_query(q, attrs)

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
                kind="cart_proposal",   # <– key change
                answer=answer,
                citations=[],
                items=items,
                cart_payload=cart_payload,  # <– new field
                debug_plan=debug_plan,
            )

        # If we couldn’t resolve a concrete item, fall through to normal flows.
        debug_plan["cart_add_note"] = "no_matching_item_from_recs"



    # ------------- Branch 2: recommendations (browse products) -------------
    if wants_recs:
        rec_query = _build_rec_query(q, attrs)

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

        # if no items, we fall through to RAG answer below
        # ------------- Branch 3: size & fit advisor --------------------------
    # Only trigger when:
    #   - classifier thinks it's a 'size_fit' question
    #   - user is NOT asking to add to cart / browse options
    if intent_kind == "size_fit" and not wants_cart and not wants_recs:
        fit_resp = await _call_fit_recommend(q, attrs)
        if fit_resp:
            size = fit_resp.get("size")
            confidence = fit_resp.get("confidence")
            notes = fit_resp.get("notes") or []
            citations = fit_resp.get("citations") or []

            # Natural language answer from the fit engine result
            size_part = f"I’d recommend size {size}" if size else "I can’t confidently recommend a size"
            if confidence is not None:
                size_part += f" (confidence ~{confidence:.0%})"

            extra_note = ""
            if notes:
                # pick 1–2 short notes for the chat answer; keep the rest in debug
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

        # If fit call failed or metrics missing, we just fall through to RAG.
        debug_plan["fit_used"] = False

    # ------------- Branch 4: default to RAG answer -------------
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

    We just forward to Django and return its CartSerializer JSON.
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

    # 2xx → ok, else propagate as ok=False but keep payload
    if 200 <= resp.status_code < 300:
        msg = "Item added to cart."
        return AgentCartAddOut(ok=True, message=msg, cart=data)

    # Django sent a validation error like "No more stock" etc.
    err_msg = "Failed to add item to cart."
    if isinstance(data, dict) and data.get("error"):
        err_msg = str(data["error"])

    return AgentCartAddOut(ok=False, message=err_msg, cart=data)
