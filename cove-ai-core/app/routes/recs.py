# # app/routes/recs.py
# from __future__ import annotations

# from fastapi import APIRouter
# from pydantic import BaseModel
# from typing import Any, Dict, List, Optional, Tuple
# import logging
# import os
# import re

# from app.vector.store import connect, search_hybrid, search_keyword
# from app.telemetry.trace import new_trace_id, emit

# log = logging.getLogger("cove.recs")
# router = APIRouter()

# _conn = None

# # -------------------------------------------------------------------
# # I/O models
# # -------------------------------------------------------------------

# class RecsFilters(BaseModel):
#     type: Optional[str] = None    # hoodie, bomber, etc.
#     tier: Optional[str] = None    # casual, originals, designer...
#     color: Optional[str] = None   # black, green, etc.
#     size: Optional[str] = None    # S, M, L, ...

# class RecsIn(BaseModel):
#     anchor_slug: Optional[str] = None  # "hoodie-casual-fleece-59.99"
#     query: Optional[str] = None        # "oversized black hoodie"
#     filters: RecsFilters = RecsFilters()
#     top_k: int = 8

# class RecItem(BaseModel):
#     title: str
#     url: str
#     slug: str
#     score: float
#     reason: str
#     type: Optional[str] = None
#     tier: Optional[str] = None
#     color: Optional[str] = None
#     size: Optional[str] = None
#     variantId: Optional[str] = None

# class RecsOut(BaseModel):
#     items: List[RecItem]


# # -------------------------------------------------------------------
# # Helpers (local, no LLM)
# # -------------------------------------------------------------------

# def _extract_slug(url: str) -> Optional[str]:
#     """
#     Extract slug from URLs like '/product/hoodie-casual-fleece-59.99'.
#     """
#     if not url:
#         return None
#     m = re.search(r"/product/([^?\s]+)", url)
#     return m.group(1) if m else None


# def _get_product_meta(conn, slug: str) -> Optional[dict]:
#     """
#     Fetch product title + meta by slug directly from ai_core.docs.
#     Duplicated from rag.py on purpose to avoid circular imports.
#     """
#     with conn.cursor() as cur:
#         cur.execute(
#             """
#             SELECT title, meta
#             FROM ai_core.docs
#             WHERE kind='product' AND meta->>'slug' = %s
#             LIMIT 1
#             """,
#             (slug,),
#         )
#         row = cur.fetchone()
#     if not row:
#         return None
#     title, meta = row
#     return {
#         "title": title or (meta.get("name") if isinstance(meta, dict) else ""),
#         "url": f"/product/{slug}",
#         "price": (meta.get("price") if isinstance(meta, dict) else None),
#         "meta": meta or {},
#     }


# def _clean_title(t: str) -> str:
#     """
#     Remove trailing parentheticals like ' (100% Cotton)' to keep titles tidy.
#     """
#     return re.sub(r"\s*\([^)]*\)\s*$", "", (t or "").strip())


# def _build_anchor_query_text(meta: dict) -> str:
#     """
#     Build a simple text representation of a product to use as an anchor query
#     when doing 'similar to this' recommendations.
#     """
#     m = meta or {}
#     pieces: List[str] = []

#     name = m.get("name") or ""
#     material = m.get("material") or ""
#     ptype = m.get("type") or ""
#     tier = m.get("tier") or ""
#     gender = m.get("gender") or ""

#     if name:
#         pieces.append(str(name))
#     if ptype:
#         pieces.append(str(ptype))
#     if material:
#         pieces.append(str(material))
#     if tier:
#         pieces.append(f"tier: {tier}")
#     if gender:
#         pieces.append(f"gender: {gender}")

#     # join color names if present
#     colors = []
#     for c in (m.get("colors") or []):
#         cname = (c.get("colorName") or "").strip()
#         if cname:
#             colors.append(cname)
#     if colors:
#         pieces.append("colors: " + ", ".join(sorted(set(colors))))

#     return " | ".join(pieces)


# def _normalize_score_range(scores: List[float]) -> List[float]:
#     """
#     Normalize a list of similarity scores into [0, 1].
#     If all scores are equal or empty, returns 0.5 for each.
#     """
#     if not scores:
#         return []
#     mn = min(scores)
#     mx = max(scores)
#     if mx <= mn:
#         return [0.5 for _ in scores]
#     return [(s - mn) / (mx - mn) for s in scores]


# def _compute_availability_score(meta: dict, desired_size: Optional[str]) -> float:
#     """
#     Very lightweight availability score in [0, 1]:
#       - 1.0 if requested size exists and looks in-stock (>0)
#       - 0.7 if requested size missing but some other size looks in-stock
#       - 0.0 if no sizes look in-stock or no size info at all
#     We do NOT surface exact stock numbers; this is purely internal scoring.
#     """
#     m = meta or {}
#     sizes = m.get("sizes") or {}
#     if not isinstance(sizes, dict) or not sizes:
#         return 0.0

#     # Helper to decide if a raw value "looks like" stock
#     def _is_in_stock(v: Any) -> bool:
#         try:
#             s = str(v).strip()
#             if not s:
#                 return False
#             # reject decimals like 19.99 (more likely price)
#             if "." in s or "," in s:
#                 return False
#             iv = int(s)
#         except Exception:
#             return False
#         return iv > 0

#     # Normalize requested size key
#     ds = (desired_size or "").upper().strip()
#     in_requested = False
#     any_other = False

#     for k, v in sizes.items():
#         ku = (k or "").upper().strip()
#         if not ku:
#             continue
#         if not _is_in_stock(v):
#             continue
#         if ds and ku == ds:
#             in_requested = True
#         else:
#             any_other = True

#     if in_requested:
#         return 1.0
#     if any_other:
#         return 0.7
#     return 0.0


# def _pick_primary_color(meta: dict, desired_color: Optional[str]) -> Optional[str]:
#     """
#     Pick a representative color for the product:
#       - if desired_color is present in meta.colors, use that
#       - else fall back to first colorName.
#     """
#     m = meta or {}
#     colors = m.get("colors") or []
#     if not isinstance(colors, list) or not colors:
#         return None

#     d = (desired_color or "").lower().strip()
#     fallback = None
#     for c in colors:
#         name = (c.get("colorName") or "").strip()
#         if not name:
#             continue
#         if fallback is None:
#             fallback = name
#         if d and name.lower() == d:
#             return name
#     return fallback

# from typing import Optional, Dict, Any, List

# def _pick_variant_id(meta: Dict[str, Any], preferred_color: Optional[str]) -> Optional[str]:
#     """
#     Resolve a variantId from product meta.

#     Strategy:
#       1. If preferred_color is given, pick that color's variantId.
#       2. Otherwise, take the first color that has a variantId.
#     """
#     colors_meta = meta.get("colors") or []
#     if not isinstance(colors_meta, list):
#         return None

#     wanted = (preferred_color or "").lower().strip() or None

#     # First pass: exact color match
#     if wanted:
#         for c in colors_meta:
#             if not isinstance(c, dict):
#                 continue
#             name = (c.get("colorName") or "").lower().strip()
#             if name == wanted:
#                 vid = c.get("variantId") or c.get("variant_id")
#                 if vid:
#                     return vid

#     # Fallback: first color with any variantId
#     for c in colors_meta:
#         if not isinstance(c, dict):
#             continue
#         vid = c.get("variantId") or c.get("variant_id")
#         if vid:
#             return vid

#     return None

# # -------------------------------------------------------------------
# # /ai/recs/suggest
# # -------------------------------------------------------------------

# @router.post("/ai/recs/suggest", response_model=RecsOut)
# async def recs_suggest(body: RecsIn) -> RecsOut:
#     """
#     Recommend similar products given:
#       - an anchor product slug (similar-to-this)
#       - and/or a free-text query
#       - plus optional filters (type/tier/color/size).

#     Scoring (v0):
#       final_score = 0.5 * sim_score
#                   + 0.3 * pop_score
#                   + 0.2 * avail_score
#     where:
#       sim_score   = normalized hybrid search score
#       pop_score   = meta.popularity (0..1) if present, else 0.5
#       avail_score = simple availability heuristic (stock-aware, no counts exposed)
#     """
#     global _conn
#     _conn = _conn or connect()
#     trace_id = new_trace_id()

#     filters = body.filters or RecsFilters()
#     top_k = max(1, min(body.top_k or 8, 24))  # safety cap

#     # 1) Resolve anchor product (if any)
#     anchor_meta: Optional[dict] = None
#     anchor_slug = (body.anchor_slug or "").strip()
#     if anchor_slug:
#         anchor_meta = _get_product_meta(_conn, anchor_slug)
#         if not anchor_meta:
#             log.warning("recs_suggest: anchor slug %s not found", anchor_slug)

#     # 2) Decide retrieval query text
#     #    Prefer anchor-based similarity; fall back to user query only.
#     retrieval_query: str = ""
#     if anchor_meta:
#         retrieval_query = _build_anchor_query_text(anchor_meta.get("meta") or {})
#     if not retrieval_query:
#         retrieval_query = (body.query or "").strip()
#     if not retrieval_query:
#         # Nothing to go on → empty result, but not an error
#         emit(
#             "recs_empty_query",
#             trace_id,
#             {"reason": "no_anchor_no_query", "filters": filters.dict()},
#         )
#         return RecsOut(items=[])

#     # 3) Run hybrid search (or keyword-only if embeddings disabled)
#     USE_KEYWORD_ONLY = os.getenv("DISABLE_EMBEDDING", "false").lower() == "true"

#     if USE_KEYWORD_ONLY:
#         docs = search_keyword(
#             _conn,
#             query=retrieval_query,
#             kind="product",
#             top_k=top_k * 4,
#         )
#     else:
#         # We don't pass attrs for now to keep this route simple;
#         # filters are applied post-retrieval using meta, which we trust more.
#         docs = search_hybrid(
#             _conn,
#             query=retrieval_query,
#             kind="product",
#             top_k=top_k * 4,
#         )

#     emit(
#         "recs_retrieval_done",
#         trace_id,
#         {
#             "query": retrieval_query,
#             "anchor_slug": anchor_slug or None,
#             "count": len(docs),
#             "top_titles": [d.get("title", "") for d in docs[:5]],
#         },
#     )

#     if not docs:
#         return RecsOut(items=[])

#     # 4) Build candidate list with meta and apply filters
#     candidates: List[Tuple[dict, dict]] = []  # (doc, prod_meta)
#     for d in docs:
#         slug = _extract_slug(d.get("url", "") or "") or ""
#         if not slug:
#             continue
#         if anchor_slug and slug == anchor_slug:
#             continue  # avoid recommending the same item as "similar"

#         prod = _get_product_meta(_conn, slug)
#         if not prod:
#             continue

#         meta = prod.get("meta") or {}

#         # --- Apply filters (type, tier, color, size) ---

#         ptype = (meta.get("type") or "").lower().strip()
#         if filters.type and ptype and ptype != filters.type.lower().strip():
#             continue

#         ptier = (meta.get("tier") or "").lower().strip()
#         if filters.tier and ptier and ptier != filters.tier.lower().strip():
#             continue

#         if filters.color:
#             wanted_color = filters.color.lower().strip()
#             color_names = [
#                 (c.get("colorName") or "").lower().strip()
#                 for c in (meta.get("colors") or [])
#             ]
#             if color_names and wanted_color not in color_names:
#                 continue

#         if filters.size:
#             # We just check presence of that size key; availability is handled in scoring.
#             sizes = meta.get("sizes") or {}
#             if isinstance(sizes, dict):
#                 if filters.size.upper().strip() not in {k.upper().strip() for k in sizes.keys()}:
#                     # If we *require* that size to even show: keep this continue.
#                     # If we want more relaxed recs, we could drop this filter.
#                     continue

#         candidates.append((d, prod))

#     if not candidates:
#         emit("recs_no_candidates_after_filter", trace_id, {"filters": filters.dict()})
#         return RecsOut(items=[])

#     # 5) Compute scores
#     raw_sim_scores = [float(c[0].get("score", 0) or 0) for c in candidates]
#     norm_sim_scores = _normalize_score_range(raw_sim_scores)

#     scored_items: List[Tuple[float, RecItem]] = []

#     for (doc, prod), sim in zip(candidates, norm_sim_scores):
#         slug = _extract_slug(doc.get("url", "") or "") or ""
#         meta = prod.get("meta") or {}
#         title_raw = prod.get("title") or doc.get("title", "Product")
#         title = _clean_title(title_raw)

#         # Popularity: optional, future-proof; default to 0.5
#         pop_raw = meta.get("popularity", 0.5)
#         try:
#             pop_score = float(pop_raw)
#         except Exception:
#             pop_score = 0.5
#         # clamp to [0,1]
#         pop_score = max(0.0, min(pop_score, 1.0))

#         # Availability score
#         avail_score = _compute_availability_score(meta, filters.size)

#         final_score = 0.5 * sim + 0.3 * pop_score + 0.2 * avail_score

#         # Build a short "reason" string
#         reason_pieces: List[str] = []
#         ptype = (meta.get("type") or "").lower().strip()
#         ptier = (meta.get("tier") or "").lower().strip()

#         primary_color = _pick_primary_color(meta, filters.color)
#         requested_size = (filters.size or "").upper().strip()

#         # --- resolve variantId robustly ---
#         variant_id = _pick_variant_id(
#             meta,
#             preferred_color=(filters.color or primary_color)
#         )

#         # --- Reason string as before ---
#         if ptype:
#             reason_pieces.append(f"Similar {ptype}")
#         else:
#             reason_pieces.append("Similar item")

#         if primary_color:
#             reason_pieces.append(primary_color.lower())

#         if requested_size:
#             reason_pieces.append(f"in size {requested_size}")

#         if ptier:
#             reason_pieces.append(f"from the {ptier} tier")

#         # Availability hint (without numbers)
#         if avail_score >= 0.99:
#             reason_pieces.append("(requested size appears in stock)")
#         elif avail_score >= 0.6:
#             reason_pieces.append("(some sizes appear in stock)")

#         reason = " ".join(reason_pieces).strip()

#         rec = RecItem(
#             title=title,
#             url=prod.get("url") or f"/product/{slug}",
#             slug=slug,
#             score=round(final_score, 4),
#             reason=reason,
#             type=ptype or None,
#             tier=ptier or None,
#             color=primary_color,
#             size=requested_size or None,
#             variantId=variant_id,   # ✅ now filled
#         )

#         scored_items.append((final_score, rec))

#     # 6) Sort by final_score descending and take top_k
#     scored_items.sort(key=lambda x: x[0], reverse=True)
#     top_items = [r for _, r in scored_items[:top_k]]

#     emit(
#         "recs_done",
#         trace_id,
#         {
#             "count": len(top_items),
#             "filters": filters.dict(),
#             "anchor_slug": anchor_slug or None,
#             "query": retrieval_query,
#         },
#     )

#     return RecsOut(items=top_items)

# app/routes/recs.py
from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter
from pydantic import BaseModel
from psycopg.rows import dict_row

from app.vector.store import get_conn, search_hybrid, search_keyword
from app.telemetry.trace import new_trace_id, emit

log = logging.getLogger("cove.recs")
router = APIRouter()


# -------------------------------------------------------------------
# I/O models
# -------------------------------------------------------------------


class RecsFilters(BaseModel):
    type: Optional[str] = None    # hoodie, bomber, etc.
    tier: Optional[str] = None    # casual, originals, designer...
    color: Optional[str] = None   # black, green, etc.
    size: Optional[str] = None    # S, M, L, ...

    # generic numeric price filters (in euros)
    price_min: Optional[float] = None
    price_max: Optional[float] = None


class RecsIn(BaseModel):
    anchor_slug: Optional[str] = None  # "hoodie-casual-fleece-59.99"
    query: Optional[str] = None        # "oversized black hoodie"
    filters: RecsFilters = RecsFilters()
    top_k: int = 8


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


class RecsOut(BaseModel):
    items: List[RecItem]


# -------------------------------------------------------------------
# Helpers (local, no LLM)
# -------------------------------------------------------------------


def _extract_slug(url: str) -> Optional[str]:
    """
    Extract slug from URLs like '/product/hoodie-casual-fleece-59.99'.
    """
    if not url:
        return None
    m = re.search(r"/product/([^?\s]+)", url)
    return m.group(1) if m else None


def _get_product_meta(
    conn,
    slug: str,
    preferred_color: Optional[str] = None,
) -> Optional[dict]:
    """
    Fetch a representative VARIANT doc by groupSlug for this product.

    If preferred_color is given (e.g. "black"), we try to pick the variant
    where lower(meta->>'colorName') matches it. If that fails, we fall back
    to "any variant" from that group.
    """
    with conn.cursor(row_factory=dict_row) as cur:
        params: List[Any] = [slug]
        where = [
            "kind = 'product'",
            "meta->>'groupSlug' = %s",
            "meta->>'variantId' IS NOT NULL",
        ]

        if preferred_color:
            where.append("LOWER(meta->>'colorName') = LOWER(%s)")
            params.append(preferred_color)

        sql = f"""
            SELECT title, meta, url
            FROM ai_core.docs
            WHERE {' AND '.join(where)}
            LIMIT 1
        """
        cur.execute(sql, params)
        row = cur.fetchone()

        # If we requested a specific color and found nothing, relax and retry
        if not row and preferred_color:
            cur.execute(
                """
                SELECT title, meta, url
                FROM ai_core.docs
                WHERE kind = 'product'
                  AND meta->>'groupSlug' = %s
                  AND meta->>'variantId' IS NOT NULL
                LIMIT 1
                """,
                (slug,),
            )
            row = cur.fetchone()

    if not row:
        return None

    title = row["title"]
    meta = row["meta"] or {}
    url = row["url"] or f"/product/{slug}"

    return {
        "title": title or meta.get("name", ""),
        "url": url,
        "meta": meta,
    }


def _clean_title(t: str) -> str:
    """
    Remove trailing parentheticals like ' (100% Cotton)' to keep titles tidy.
    """
    return re.sub(r"\s*\([^)]*\)\s*$", "", (t or "").strip())


def _build_anchor_query_text(meta: dict) -> str:
    """
    Build a simple text representation of a product variant to use as an anchor query.
    """
    m = meta or {}
    pieces: List[str] = []

    name = m.get("name") or ""
    material = m.get("material") or ""
    ptype = m.get("type") or ""
    tier = m.get("tier") or ""
    gender = m.get("gender") or ""
    color = m.get("colorName") or ""

    if name:
        pieces.append(str(name))
    if ptype:
        pieces.append(str(ptype))
    if material:
        pieces.append(str(material))
    if tier:
        pieces.append(f"tier: {tier}")
    if gender:
        pieces.append(f"gender: {gender}")
    if color:
        pieces.append(f"color: {color}")

    style = m.get("style") or {}
    tags = style.get("styleTags") or []
    uses = style.get("useCases") or []
    if tags:
        pieces.append("style: " + ", ".join(tags))
    if uses:
        pieces.append("use: " + ", ".join(uses))

    return " | ".join(pieces)


def _normalize_score_range(scores: List[float]) -> List[float]:
    """
    Normalize a list of similarity scores into [0, 1].
    If all scores are equal or empty, returns 0.5 for each.
    """
    if not scores:
        return []
    mn = min(scores)
    mx = max(scores)
    if mx <= mn:
        return [0.5 for _ in scores]
    return [(s - mn) / (mx - mn) for s in scores]


def _pick_variant_id(meta: Dict[str, Any]) -> Optional[str]:
    """
    For flat variant docs, variantId lives directly on meta.
    """
    vid = meta.get("variantId") or meta.get("variant_id")
    return vid or None


def _compute_availability_score(meta: dict, desired_size: Optional[str]) -> float:
    """
    Availability score in [0, 1] based on meta.sizes (size -> stock int).
    """
    m = meta or {}
    sizes = m.get("sizes") or {}
    if not isinstance(sizes, dict) or not sizes:
        return 0.0

    def _is_in_stock(v: Any) -> bool:
        try:
            iv = int(v)
        except Exception:
            return False
        return iv > 0

    ds = (desired_size or "").upper().strip()
    in_requested = False
    any_other = False

    for k, v in sizes.items():
        ku = (k or "").upper().strip()
        if not ku:
            continue
        if not _is_in_stock(v):
            continue
        if ds and ku == ds:
            in_requested = True
        else:
            any_other = True

    if in_requested:
        return 1.0
    if any_other:
        return 0.7
    return 0.0


def _pick_primary_color(meta: dict, desired_color: Optional[str]) -> Optional[str]:
    """
    For flat variants, the color lives at meta.colorName.
    """
    m = meta or {}
    cname = (m.get("colorName") or "").strip()
    if cname:
        return cname
    return (desired_color or None)


def _compute_popularity_score(meta: dict) -> float:
    """
    Popularity score in [0,1] from meta.
    Falls back to 0.5 if nothing meaningful is present.
    """
    m = meta or {}

    # direct popularity field if present
    for key in ("popularityScore", "popularity", "popularity_score"):
        if key in m:
            try:
                v = float(m[key])
                if v < 0:
                    return 0.0
                if v > 1:
                    return 1.0
                return v
            except Exception:
                continue

    # simple heuristic from views/orders if present
    for key in ("views", "orders", "soldCount"):
        if key in m:
            try:
                v = float(m[key])
                if v <= 0:
                    return 0.3
                return max(0.3, min(1.0, 0.3 + 0.1 * (v ** 0.5)))
            except Exception:
                continue

    return 0.5


# -------------------------------------------------------------------
# /ai/recs/suggest
# -------------------------------------------------------------------


@router.post("/ai/recs/suggest", response_model=RecsOut)
async def recs_suggest(body: RecsIn) -> RecsOut:
    """
    Recommend product VARIANTS given:
      - an anchor product slug (similar-to-this)
      - and/or a free-text query
      - plus optional filters (type/tier/color/size/price_min/price_max).

    final_score = 0.5 * sim_score
                + 0.3 * pop_score
                + 0.2 * avail_score
    """
    trace_id = new_trace_id()

    filters = body.filters or RecsFilters()
    top_k = max(1, min(body.top_k or 8, 24))

    has_price_filters = filters.price_min is not None or filters.price_max is not None
    had_filters = any(
        [
            filters.type,
            filters.tier,
            filters.color,
            filters.size,
            has_price_filters,
        ]
    )

    # ----- Everything that touches Postgres is inside this block -----
    with get_conn() as conn:
        # 1) Anchor lookup (optional)
        anchor_meta: Optional[dict] = None
        anchor_slug = (body.anchor_slug or "").strip()
        if anchor_slug:
            anchor_meta = _get_product_meta(conn, anchor_slug)
            if not anchor_meta:
                log.warning("recs_suggest: anchor slug %s not found", anchor_slug)

        # 2) Build retrieval query
        retrieval_query: str = ""
        if anchor_meta:
            retrieval_query = _build_anchor_query_text(anchor_meta.get("meta") or {})
        if not retrieval_query:
            retrieval_query = (body.query or "").strip()
        if not retrieval_query:
            emit(
                "recs_empty_query",
                trace_id,
                {"reason": "no_anchor_no_query", "filters": filters.dict()},
            )
            return RecsOut(items=[])

        # 3) Run search using existing helpers
        USE_KEYWORD_ONLY = os.getenv("DISABLE_EMBEDDING", "false").lower() == "true"

        if USE_KEYWORD_ONLY:
            docs = search_keyword(
                conn,
                query=retrieval_query,
                kind="product",
                top_k=top_k * 4,
            )
        else:
            docs = search_hybrid(
                conn,
                query=retrieval_query,
                kind="product",
                top_k=top_k * 4,
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

            # type
            if filters.type:
                if (m.get("type") or "").lower().strip() != filters.type.lower().strip():
                    return False

            # tier
            if filters.tier:
                if (m.get("tier") or "").lower().strip() != filters.tier.lower().strip():
                    return False

            # color
            if filters.color:
                if (m.get("colorName") or "").lower().strip() != filters.color.lower().strip():
                    return False

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
                slug_from_url = _extract_slug(d.get("url", "") or "") or ""
                if not slug_from_url:
                    continue

                prod = _get_product_meta(conn, slug_from_url, preferred_color=filters.color)
                if not prod:
                    continue
                meta = prod.get("meta") or {}

            # variantId is OPTIONAL for recs; we keep it if present
            variant_id = _pick_variant_id(meta)

            slug = meta.get("groupSlug") or _extract_slug(d.get("url", "") or "") or ""

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
                    slug_from_url = _extract_slug(d.get("url", "") or "") or ""
                    if not slug_from_url:
                        continue
                    prod = _get_product_meta(conn, slug_from_url, preferred_color=None)
                    if not prod:
                        continue
                    meta = prod.get("meta") or {}

                variant_id = _pick_variant_id(meta)
                slug = meta.get("groupSlug") or _extract_slug(d.get("url", "") or "") or ""

                if variant_id and "variantId" not in meta:
                    meta = dict(meta)
                    meta["variantId"] = variant_id

                candidates.append((d, meta))

    # ----- From here on, it's all in-memory; no DB needed -----

    if not candidates:
        emit("recs_no_candidates_after_filter", trace_id, {"filters": filters.dict()})
        return RecsOut(items=[])

    raw_sim_scores = [float(c[0].get("score", 0) or 0) for c in candidates]
    norm_sim_scores = _normalize_score_range(raw_sim_scores)

    scored_items: List[Tuple[float, RecItem]] = []

    for (doc, meta), sim in zip(candidates, norm_sim_scores):
        meta = meta or {}

        sim_score = float(sim)
        pop_score = _compute_popularity_score(meta)
        avail_score = _compute_availability_score(meta, filters.size)

        final_score = 0.5 * sim_score + 0.3 * pop_score + 0.2 * avail_score

        slug = meta.get("groupSlug") or _extract_slug(doc.get("url", "") or "") or ""
        url = meta.get("url") or doc.get("url") or (f"/product/{slug}" if slug else "")
        title_raw = meta.get("name") or doc.get("title", "Product")
        title = _clean_title(title_raw)

        color_name = _pick_primary_color(meta, filters.color)
        variant_id = _pick_variant_id(meta)

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
