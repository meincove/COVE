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
    sort: Optional[str] = None
    gender: Optional[str] = None  # male, female, unisex

class RecsIn(BaseModel):
    anchor_slug: Optional[str] = None
    query: Optional[str] = None
    filters: RecsFilters = RecsFilters()
    top_k: int = 8
    exclude_slugs: Optional[List[str]] = None  # For "show more" pagination - exclude already shown
    visual_vibe: Optional[str] = None # Visual style description for vibe-boosting
    user_profile: Optional[Dict[str, Any]] = None # User preferences for affinity boosting (size, price, etc.)
    sku_boost: bool = False # Boost BM25 for exact/SKU matches
    
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
    price: Optional[float] = None
    imageUrl: Optional[str] = None  # ✨ PHASE 6: Product image
    
    # Rich product details for fact extraction (all optional)
    material: Optional[str] = None
    fit: Optional[str] = None
    fabric: Optional[Dict[str, Any]] = None
    care: Optional[Dict[str, Any]] = None
    style: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    styleNotes: Optional[str] = None
    fitNotes: Optional[str] = None
    # For budget filtering



class RecsSimilarIn(BaseModel):
    slug: str
    top_k: int = 12
    filters: RecsFilters = RecsFilters()

class RecsCompleteLookIn(BaseModel):
    anchor_slug: str
    budget: float = 500.0

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


def _search_result_to_rec_item(r, reason: str = "visual_match") -> RecItem:
    """
    Map a SearchResult to RecItem with ALL fields populated.
    Single source of truth for result-to-item conversion.
    """
    meta = r.meta or {}
    return RecItem(
        title=r.title,
        url=r.url,
        slug=meta.get("slug", ""),
        score=r.score or 0.0,
        reason=reason,
        type=meta.get("type"),
        tier=meta.get("tier"),
        color=meta.get("color"),
        size=meta.get("size"),
        variantId=meta.get("variantId"),
        price=meta.get("price"),
        imageUrl=meta.get("imageUrl"),
        material=meta.get("material"),
        fit=meta.get("fit"),
        fabric=meta.get("fabric"),
        care=meta.get("care"),
        style=meta.get("style"),
        description=meta.get("description"),
        styleNotes=meta.get("styleNotes"),
        fitNotes=meta.get("fitNotes"),
    )


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
    from app.vector.store import catalog_vocab, get_conn
    
    original_query = body.query or ""
    
    # Get catalog vocabulary - only fuzzy match to known product types!
    catalog_types = set()
    if original_query:
        with get_conn() as conn:
            vocab = catalog_vocab(conn)
            catalog_types = set(t.lower() for t in vocab.get("types", []))
    
    processed_query = apply_fuzzy_matching(original_query, catalog_types) if original_query else ""

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

        # 1. Get embedding for query if present
        query_vec = None
        if body.query:
            from app.providers.embedding import embed_query
            # If visual_vibe is present, append it to the query for embedding generation
            # This creates a "Hybrid Vector" that captures both semantic request + visual style
            embedding_text = body.query
            if body.visual_vibe:
                 embedding_text += f", visual style: {body.visual_vibe}"
                 
            query_vec = await embed_query(embedding_text)
        
        # 2. Run personalized search
        from app.vector.personalized_search import personalized_search, personalized_results_to_dict
        
        # Pass optional visual_vibe and sku_boost to enable dynamic weighting
        results = personalized_search(
            conn=conn,
            query=body.query or "",
            query_embedding=query_vec,
            user_id=None, # TODO: Add user_id from session/clerk
            kind="product",
            top_k=body.top_k,
            cf_model=None, # Load CF model here if available
            visual_vibe=body.visual_vibe,
            user_profile=body.user_profile,
            sku_boost=body.sku_boost
        )
        docs = personalized_results_to_dict(results)

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
                    # Allow partial match (e.g. "grey" matching "grey heather")
                    if str(val).lower().strip() not in str(meta_val).lower().strip():
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

            # Gender filter (unisex products always pass)
            if filters.gender:
                product_gender = (m.get("gender") or "").lower().strip()
                filter_gender = filters.gender.lower().strip()
                # Unisex products match any gender filter
                if product_gender and product_gender != "unisex":
                    if product_gender != filter_gender:
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
    
    # Filter out already-shown products for "show more" pagination
    if body.exclude_slugs:
        exclude_set = set(s.lower().strip() for s in body.exclude_slugs if s)
        original_count = len(candidates)
        candidates = [(d, m) for d, m in candidates if (m.get("groupSlug") or "").lower().strip() not in exclude_set]
        log.debug(f"📚 [PAGINATION] Excluded {original_count - len(candidates)} already-shown products")

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

        # ✨ PHASE 6: Extract image URL from metadata
        image_url = meta.get("image")  # From backend_loader
        if not image_url:
            # Fallback: check images array (flat JSON)
            images = meta.get("images", [])
            if images and isinstance(images, list) and len(images) > 0:
                first_img = images[0]
                image_url = first_img if isinstance(first_img, str) else first_img.get("url")
        
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
            imageUrl=image_url,  # ✨ PHASE 6: Product image
            # Rich product details for fact extraction
            material=meta.get("material"),
            fit=meta.get("fit"),
            fabric=meta.get("fabric"),
            care=meta.get("care"),
            style=meta.get("style"),
            description=meta.get("description"),
            styleNotes=meta.get("styleNotes"),
            fitNotes=meta.get("fitNotes"),
        )
        scored_items.append((final_score, item))

    # Sort items
    # Check if explicit sort is requested
    if filters.sort == "price_asc":
        # Sort by price ASC (None price goes last)
        scored_items.sort(key=lambda x: (x[1].price is None, x[1].price))
    elif filters.sort == "price_desc":
        # Sort by price DESC (None price goes last)
        # Key: (Has Price, Price Value). True > False. 
        scored_items.sort(key=lambda x: (x[1].price is not None, x[1].price), reverse=True)
    else:
        # Default: Sort by relevance score DESC
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

@router.post("/ai/recs/similar", response_model=RecsOut)
async def recs_similar(body: RecsSimilarIn) -> RecsOut:
    """
    Get visually/semantically similar items effectively "More Like This".
    Uses pure vector search based on the anchor product's embedding.
    Applies optional filters for type, color, price, etc.
    """
    trace_id = new_trace_id()
    emit('similar_request', trace_id, {'slug': body.slug, 'filters': body.filters.dict() if body.filters else {}})
    
    from app.vector.store import get_product_embedding_by_slug, get_conn
    from app.vector.hybrid_search import search_vector
    
    filters = body.filters or RecsFilters()
    
    with get_conn() as conn:
        # 1. Get anchor embedding
        anchor_vec = get_product_embedding_by_slug(conn, body.slug)
        
        if not anchor_vec:
            log.warning(f"recs_similar: Anchor slug '{body.slug}' not found or has no embedding")
            return RecsOut(items=[])
            
        # 2. Run vector search (pure semantic/visual similarity)
        # Fetch extra buffer to account for self + duplicates + filter rejections
        results = search_vector(
            conn=conn,
            query_embedding=anchor_vec,
            kind="product",
            top_k=body.top_k * 3  # Buffer for filtering
        )
        
        # 3. Filter out self, apply user filters, and format using helper
        items: List[RecItem] = []
        for r in results:
            meta = r.meta or {}
            r_slug = meta.get("slug", "")
            
            # Skip the anchor item itself
            if r_slug == body.slug:
                continue
            
            # Apply filters (type, color, price, gender, etc.)
            if filters.type and meta.get("type", "").lower() != filters.type.lower():
                continue
            if filters.color and meta.get("color", "").lower() != filters.color.lower():
                continue
            if filters.tier and meta.get("tier", "").lower() != filters.tier.lower():
                continue
            if filters.gender:
                product_gender = (meta.get("gender") or "").lower().strip()
                filter_gender = filters.gender.lower().strip()
                if product_gender and product_gender != "unisex" and product_gender != filter_gender:
                    continue
            
            # Price filter
            try:
                price = float(meta.get("price", 0))
                if filters.price_min and price < filters.price_min:
                    continue
                if filters.price_max and price > filters.price_max:
                    continue
            except (ValueError, TypeError):
                pass  # No valid price, skip filter
            
            # Use helper for consistent full field mapping
            items.append(_search_result_to_rec_item(r, reason="visual_match"))
            
            if len(items) >= body.top_k:
                break
                
        emit('similar_done', trace_id, {'count': len(items)})
        return RecsOut(items=items)

@router.post("/ai/recs/complete-look")
async def recs_complete_look(body: RecsCompleteLookIn) -> Dict[str, Any]:
    """
    "Complete the Look": Takes an anchor item and builds a full outfit around it.
    Uses config-driven complements logic and Vector-Aware OutfitBuilder.
    """
    trace_id = new_trace_id()
    emit('complete_look_request', trace_id, {'slug': body.anchor_slug})
    
    from app.vector.store import get_product_by_slug, get_conn
    from app.agents.outfit_builder_agent import outfit_builder_handler
    
    # Load outfit config (NO HARDCODING!)
    import json
    from pathlib import Path
    config_path = Path(__file__).resolve().parent.parent.parent / "data" / "outfit_config.json"
    with open(config_path) as f:
        outfit_config = json.load(f)
    
    complements_map = outfit_config.get("complements_map", {})
    category_mappings = outfit_config.get("category_mappings", {})
    default_complements = outfit_config.get("default_complements", ["top", "bottom", "shoes"])
    style_stop_words = set(outfit_config.get("style_stop_words", []))
    
    # 1. Fetch Anchor
    with get_conn() as conn:
        anchor = get_product_by_slug(conn, body.anchor_slug)
    
    if not anchor:
        return {"error": "Anchor item not found"}
        
    anchor_meta = anchor.get("meta", {})
    anchor_type = anchor_meta.get("type", "product").lower()
    anchor_title = anchor.get("title", "")
    anchor_slug = anchor_meta.get("slug")
    
    # 2. Determine Complements using CONFIG-DRIVEN logic
    # Try exact match first, then fuzzy match
    needed_cats = complements_map.get(anchor_type, None)
    if not needed_cats:
        # Fuzzy match: check if anchor_type contains any key
        for key in complements_map:
            if key in anchor_type or key in anchor_title.lower():
                needed_cats = complements_map[key]
                break
    
    # Fallback to default
    if not needed_cats:
        needed_cats = default_complements
            
    # 3. Retrieve Candidates for each needed category
    candidates = {}
    
    # Map anchor to generic category using CONFIG
    anchor_cat_key = category_mappings.get(anchor_type, "anchor")
    # Fallback: check for partial matches
    if anchor_cat_key == "anchor":
        for type_key, cat in category_mappings.items():
            if type_key in anchor_type:
                anchor_cat_key = cat
                break
    
    candidates[anchor_cat_key] = [{
        "slug": anchor_slug,
        "title": anchor_title,
        "price": anchor_meta.get("price", 0),
        "type": anchor_type,
        "color": anchor_meta.get("color"),
        "imageUrl": anchor_meta.get("imageUrl"),
        "id": anchor.get("id")
    }]
    
    # Extract gender context (critical for correct outfit)
    gender_context = ""
    if anchor_meta.get("gender"):
        gender_context = anchor_meta["gender"]
    else:
        title_lower = anchor_title.lower()
        if "women" in title_lower: gender_context = "women"
        elif "men" in title_lower: gender_context = "men"
    
    # Extract style keywords using CONFIG-DRIVEN stop words
    style_words = [w for w in anchor_title.split() if w.lower() not in style_stop_words]
    style_context = " ".join(style_words)
    
    for cat in needed_cats:
        # Enforce gender in query
        query = f"{gender_context} {style_context} {cat}".strip()
        
        # Uses store.search_hybrid (async, returns dicts)
        results = await search_hybrid(query, kind="product", top_k=5)
        
        cat_candidates = []
        for r in results:
            # r is a dict
            r_meta = r.get("meta") or {}
            r_slug = r_meta.get("slug")
            
            if r_slug == anchor_slug: continue
            
            cat_candidates.append({
                "slug": r_slug,
                "title": r.get("title"),
                "price": r_meta.get("price", 0),
                "type": r_meta.get("type"),
                "color": r_meta.get("color"),
                "imageUrl": r_meta.get("imageUrl"),
                "id": r.get("id")
            })
        candidates[cat] = cat_candidates

    # 4. Run Outfit Builder
    task = {
        "candidates": candidates,
        "budget_max": body.budget,
        "user_preferences": {} # Could inject session prefs here
    }
    
    context = {"user_id": "api_user"}
    
    result = await outfit_builder_handler(task, context)
    
    emit('complete_look_done', trace_id, {'success': True})
    return result
