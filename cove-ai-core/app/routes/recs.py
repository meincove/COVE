# app/routes/recs.py
from __future__ import annotations

import logging
import os
import json
from typing import Any, Dict, List, Optional, Tuple, ClassVar
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, validator

from app.vector.store import get_conn, get_conn_sync, search_hybrid, search_keyword
from app.telemetry.trace import new_trace_id, emit
from app.core.catalog import (
    get_product_meta,
    extract_slug,
    clean_title,
    pick_variant_id,
    pick_primary_color,
    compute_availability_score,
    compute_popularity_score,
    normalize_score_range,
)

log = logging.getLogger("cove.recs")
router = APIRouter()

# -------------------------------------------------------------------
# I/O models
# -------------------------------------------------------------------

class RecsFilters(BaseModel):
    type: Optional[str] = None
    tier: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None

class RecsIn(BaseModel):
    anchor_slug: Optional[str] = None
    query: Optional[str] = None
    filters: RecsFilters = RecsFilters()
    top_k: int = 8
    
    # Config-driven validation (cached) - shared with AgentIn
    _validation_config: ClassVar[Optional[dict]] = None
    
    @classmethod
    def get_validation_config(cls) -> dict:
        """Load validation config once and cache it"""
        if cls._validation_config is None:
            # Path from recs.py: .../cove-ai-core/app/routes/recs.py
            # Need to go up 3 levels: routes -> app -> cove-ai-core -> data
            config_path = Path(__file__).resolve().parent.parent.parent / "data" / "validation_config.json"
            with open(config_path) as f:
                cls._validation_config = json.load(f)
        return cls._validation_config
    
    @validator('query')
    def validate_query(cls, v: Optional[str]) -> Optional[str]:
        """Config-driven query validation - skip if None (unless disallowed)"""
        config = cls.get_validation_config()['query_validation']['message']
        errors = cls.get_validation_config()['error_messages']
        
        # Handle None explicitly based on config
        if v is None:
            # Check if null is allowed in config
            if not config.get('allow_null', False):
                raise ValueError(errors['empty_message'])
            return None  # Allow if config permits
        
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

class RecItem(BaseModel):
    title: str
    url: str
    slug: str
    score: float
    reason: str
    type: Optional[str] = None
    tier: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    variantId: Optional[str] = None
    price: Optional[float] = None  # For budget filtering


class RecsOut(BaseModel):
    items: List[RecItem]

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------

from app.core.rules import get_search_config

def _build_anchor_query_text(meta: dict) -> str:
    m = meta or {}
    cfg = get_search_config()
    pieces: List[str] = []
    
    # Dynamic fields
    for k in cfg.get("searchable_fields", []):
        if v := m.get(k): pieces.append(str(v))
    
    # Dynamic style fields
    style = m.get("style") or {}
    for k in cfg.get("style_fields", []):
        if tags := style.get(k):
            # e.g. "styleTags" -> "style: tag1, tag2"
            # simple heuristic: use key prefix if it ends in 'Tags' or 'Cases'
            prefix = k.replace("Tags", "").replace("Cases", "")
            pieces.append(f"{prefix}: " + ", ".join(tags))
    
    return " | ".join(pieces)

# -------------------------------------------------------------------
# /ai/recs/suggest
# -------------------------------------------------------------------

@router.post("/ai/recs/suggest", response_model=RecsOut)
async def recs_suggest(body: RecsIn) -> RecsOut:
    trace_id = new_trace_id()
    filters = body.filters or RecsFilters()
    
    # Load search config - NO hardcoded limits!
    from app.core.config_loader import get_search_config
    search_config = get_search_config()
    
    # Apply config-driven limits (was: max(1, min(body.top_k or 8, 24)))
    top_k = max(
        search_config['limits']['min_top_k'],
        min(
            body.top_k or search_config['defaults']['recs_top_k'],
            search_config['limits']['max_recs_top_k']
        )
    )
    
    # Apply config-driven fuzzy matching for typo tolerance (NO hardcoded corrections!)
    from app.core.fuzzy import apply_fuzzy_matching
    original_query = body.query or ""
    processed_query = apply_fuzzy_matching(original_query) if original_query else ""

    # Track if we had any non-price filters
    had_filters = any([
        filters.type,
        filters.tier,
        filters.color,
        filters.size,
    ])
    has_price_filters = (filters.price_min is not None) or (filters.price_max is not None)

    emit(
        "query_received",
        trace_id,
        {
            "q": body.query or body.anchor_slug or "",
            "attrs": {}, 
            "intent": "discover",
        },
    )


    with get_conn() as conn:
        # 1) Anchor lookup (optional)
        anchor_meta: Optional[dict] = None
        anchor_slug = (body.anchor_slug or "").strip()
        if anchor_slug:
            anchor_meta = get_product_meta(conn, anchor_slug)
            if not anchor_meta:
                log.warning("recs_suggest: anchor slug %s not found", anchor_slug)

        # 2) Build retrieval query
        retrieval_query: str = ""
        if anchor_meta:
            retrieval_query = _build_anchor_query_text(anchor_meta.get("meta") or {})
        if not retrieval_query:
            retrieval_query = processed_query.strip() if processed_query else ""  # Use fuzzy-matched query
        if not retrieval_query:
            emit(
                "recs_empty_query",
                trace_id,
                {"reason": "no_anchor_no_query", "filters": filters.dict()},
            )
            return RecsOut(items=[])

        # 3) Run search using existing helpers
        USE_KEYWORD_ONLY = os.getenv("DISABLE_EMBEDDING", "false").lower() == "true"
        
        # Use config-driven overfetch multiplier (was: top_k * 4)
        overfetch = top_k * search_config['retrieval']['overfetch_multiplier']

        if USE_KEYWORD_ONLY:
            docs = search_keyword(
                conn,
                query=retrieval_query,
                kind="product",
                top_k=overfetch,  # Config-driven!
            )
        else:
            docs = await search_hybrid(
                query=retrieval_query,
                kind="product",
                top_k=overfetch,  # Config-driven!
            )


        emit(
            "recs_retrieval_done",
            trace_id,
            {
                "query": retrieval_query,
                "anchor_slug": anchor_slug or None,
                "count": len(docs),
                "top_titles": [d.get("title", "") for d in docs[:5]],
            },
        )

        if not docs:
            return RecsOut(items=[])

        # 4) Filter + score
        candidates: List[Tuple[dict, dict]] = []  # (doc, meta)

        def _matches_filters(meta: dict) -> bool:
            """
            Hard filters on type / tier / color / size / price.
            Uses outer-scope `filters`.
            """
            m = meta or {}
            cfg = get_search_config()
            
            # Dynamic string filters (type, tier, color, etc.)
            # Config maps filter_name -> metadata_field
            # e.g. {"type": "type", "tier": "tier", "color": "colorName"}
            filter_map = cfg.get("filters", {})
            for filter_key, meta_key in filter_map.items():
                # Check if this filter is set in the request
                val = getattr(filters, filter_key, None)
                if val:
                    # Check if metadata has the corresponding field
                    meta_val = m.get(meta_key) or ""
                    if str(meta_val).lower().strip() != str(val).lower().strip():
                        return False

            # size (require that size exists and is in stock, if numeric)

            # size (require that size exists and is in stock, if numeric)
            if filters.size:
                size_key = filters.size.upper().strip()
                sizes = m.get("sizes") or {}
                if not isinstance(sizes, dict) or size_key not in sizes:
                    return False
                try:
                    v = sizes[size_key]
                    iv = int(v)
                    if iv <= 0:
                        return False
                except Exception:
                    # non-numeric; we only care that the key exists
                    pass

            # price band
            price_val: Optional[float] = None
            if "price" in m:
                try:
                    price_val = float(m["price"])
                except Exception:
                    price_val = None

            if price_val is not None:
                if filters.price_min is not None and price_val < filters.price_min:
                    return False
                if filters.price_max is not None and price_val > filters.price_max:
                    return False

            return True

        for d in docs:
            meta = d.get("meta") or {}

            # If meta is completely missing, resolve it via slug → ai_core.docs
            if not meta:
                slug_from_url = extract_slug(d.get("url", "") or "") or ""
                if not slug_from_url:
                    continue

                prod = get_product_meta(conn, slug_from_url, preferred_color=filters.color)
                if not prod:
                    continue
                meta = prod.get("meta") or {}

            # variantId is OPTIONAL for recs; we keep it if present
            variant_id = pick_variant_id(meta)

            slug = meta.get("groupSlug") or extract_slug(d.get("url", "") or "") or ""

            if not _matches_filters(meta):
                continue

            # store doc + enriched meta (with optional variantId)
            if variant_id and "variantId" not in meta:
                meta = dict(meta)
                meta["variantId"] = variant_id

            candidates.append((d, meta))

        # Relax non-price filters if needed
        if not candidates and docs and had_filters and not has_price_filters:
            emit(
                "recs_relax_filters",
                trace_id,
                {"filters": filters.dict(), "docs": len(docs)},
            )
            for d in docs:
                meta = d.get("meta") or {}
                if not meta:
                    slug_from_url = extract_slug(d.get("url", "") or "") or ""
                    if not slug_from_url:
                        continue
                    prod = get_product_meta(conn, slug_from_url, preferred_color=None)
                    if not prod:
                        continue
                    meta = prod.get("meta") or {}

                variant_id = pick_variant_id(meta)
                slug = meta.get("groupSlug") or extract_slug(d.get("url", "") or "") or ""

                if variant_id and "variantId" not in meta:
                    meta = dict(meta)
                    meta["variantId"] = variant_id

                candidates.append((d, meta))

    # ----- From here on, it's all in-memory; no DB needed -----

    if not candidates:
        emit("recs_no_candidates_after_filter", trace_id, {"filters": filters.dict()})
        return RecsOut(items=[])

    raw_sim_scores = [float(c[0].get("score", 0) or 0) for c in candidates]
    norm_sim_scores = normalize_score_range(raw_sim_scores)

    scored_items: List[Tuple[float, RecItem]] = []

    for (doc, meta), sim in zip(candidates, norm_sim_scores):
        meta = meta or {}

        sim_score = float(sim)
        pop_score = compute_popularity_score(meta)
        avail_score = compute_availability_score(meta, filters.size)

        final_score = 0.5 * sim_score + 0.3 * pop_score + 0.2 * avail_score

        slug = meta.get("groupSlug") or extract_slug(doc.get("url", "") or "") or ""
        url = meta.get("url") or doc.get("url") or (f"/product/{slug}" if slug else "")
        title_raw = meta.get("name") or doc.get("title", "Product")
        title = clean_title(title_raw)

        color_name = pick_primary_color(meta, filters.color)
        variant_id = pick_variant_id(meta)

        reason_bits: List[str] = []
        if (body.anchor_slug or "").strip():
            reason_bits.append("similar to your selected item")
        else:
            reason_bits.append("matches your query")
        if filters.color:
            reason_bits.append(f"color {filters.color.lower()}")
        if filters.size:
            reason_bits.append(f"size {filters.size.upper()}")

        reason = ", ".join(reason_bits).capitalize()
        
        # Extract price for budget filtering
        price_val = None
        if "base_price" in meta:
            try:
                price_val = float(meta["base_price"])
            except (ValueError, TypeError):
                pass
        elif "price" in meta:  # Fallback
            try:
                price_val = float(meta["price"])
            except (ValueError, TypeError):
                pass

        item = RecItem(
            title=title,
            url=url,
            slug=slug,
            score=final_score,
            reason=reason,
            type=meta.get("type"),
            tier=meta.get("tier"),
            color=color_name,
            size=filters.size,
            variantId=variant_id,
            price=price_val,
        )
        scored_items.append((final_score, item))

    scored_items.sort(key=lambda x: x[0], reverse=True)
    top_items = [r for _, r in scored_items[:top_k]]

    emit(
        "recs_done",
        trace_id,
        {
            "count": len(top_items),
            "filters": filters.dict(),
            "anchor_slug": anchor_slug or None,
            "query": retrieval_query,
        },
    )

    return RecsOut(items=top_items)
