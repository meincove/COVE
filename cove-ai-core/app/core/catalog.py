# app/core/catalog.py
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Union
from psycopg.rows import dict_row

# ---------------------------------------------------------------------
# CONSTANTS
# ---------------------------------------------------------------------

SIZES = {"XS", "S", "M", "L", "XL", "XXL"}

COMMON_COLOR_WORDS = {
    "black", "white", "gray", "grey", "cream", "beige", "red", "maroon",
    "crimson", "pink", "hotpink", "rose", "orange", "amber", "yellow",
    "gold", "mustard", "green", "lime", "olive", "teal", "blue", "navy",
    "azure", "cyan", "purple", "violet", "lavender", "magenta",
}

_TITLE_PAREN_RE = re.compile(r"\s*\([^)]*\)\s*$")

# ---------------------------------------------------------------------
# TEXT HELPERS
# ---------------------------------------------------------------------

def extract_slug(url: str) -> Optional[str]:
    """
    Extract slug from URLs like '/product/hoodie-casual-fleece-59.99'.
    """
    if not url:
        return None
    m = re.search(r"/product/([^?\s]+)", url)
    return m.group(1) if m else None


def clean_title(t: str) -> str:
    """
    Remove trailing parentheticals like ' (100% Cotton)' to keep titles tidy.
    """
    return _TITLE_PAREN_RE.sub("", (t or "").strip())


def ordered_size_names(names: List[str]) -> List[str]:
    order = ["XS", "S", "M", "L", "XL", "XXL"]
    have = {n.upper() for n in names}
    return [s for s in order if s in have]

# ---------------------------------------------------------------------
# DB FETCHERS
# ---------------------------------------------------------------------

def get_product_meta(
    conn,
    slug: str,
    preferred_color: Optional[str] = None,
) -> Optional[dict]:
    """
    Fetch a representative product doc (or variant doc) by slug/groupSlug.
    
    If preferred_color is provided, attempts to find a variant matching that color.
    Returns a dict with: {title, url, price, meta}
    """
    # We use a unified query that handles both product and variant docs
    # Logic adapted from recs.py and rag.py
    
    with conn.cursor(row_factory=dict_row) as cur:
        # 1. Try to find specific variant if color requested
        if preferred_color:
            cur.execute(
                """
                SELECT title, meta, url
                FROM ai_core.docs
                WHERE kind = 'product'
                  AND meta->>'groupSlug' = %s
                  AND LOWER(meta->>'colorName') = LOWER(%s)
                LIMIT 1
                """,
                (slug, preferred_color),
            )
            row = cur.fetchone()
            if row:
                return _fmt_product_row(row, slug)

        # 2. Fallback: find any product doc with this slug/groupSlug
        cur.execute(
            """
            SELECT title, meta, url
            FROM ai_core.docs
            WHERE kind = 'product'
              AND (meta->>'groupSlug' = %s OR meta->>'slug' = %s)
            LIMIT 1
            """,
            (slug, slug),
        )
        row = cur.fetchone()
        
    if not row:
        return None
        
    return _fmt_product_row(row, slug)


def _fmt_product_row(row: dict, slug: str) -> dict:
    title = row.get("title")
    meta = row.get("meta") or {}
    url = row.get("url") or f"/product/{slug}"
    
    return {
        "title": title or meta.get("name", ""),
        "url": url,
        "price": meta.get("price"),
        "meta": meta,
    }

# ---------------------------------------------------------------------
# LOGIC HELPERS
# ---------------------------------------------------------------------



def pick_variant_id(meta: Dict[str, Any], preferred_color: Optional[str] = None) -> Optional[str]:
    """
    Resolve a variantId from product meta.
    Handles both flat variant docs (meta.variant_id) and nested product docs (meta.colors[].variantId).
    """
    # 1. Flat variant doc - check snake_case FIRST (what we store in embeddings)
    if meta.get("variant_id"):
        return meta["variant_id"]
    if meta.get("variantId"):  # Fallback to camelCase
        return meta["variantId"]
        
    # 2. Nested product doc
    colors = meta.get("colors") or []
    if not isinstance(colors, list):
        return None
        
    wanted = (preferred_color or "").lower().strip()
    
    # Try exact color match
    if wanted:
        for c in colors:
            if not isinstance(c, dict): continue
            name = (c.get("colorName") or "").lower().strip()
            if name == wanted:
                return c.get("variantId") or c.get("variant_id")
                
    # Fallback: first available
    for c in colors:
        if isinstance(c, dict) and (c.get("variantId") or c.get("variant_id")):
            return c.get("variantId") or c.get("variant_id")
            
    return None


def pick_primary_color(meta: dict, desired_color: Optional[str] = None) -> Optional[str]:
    """
    Pick a representative color name.
    """
    # Flat variant
    if meta.get("colorName"):
        return meta["colorName"]
        
    # Nested
    colors = meta.get("colors") or []
    if not isinstance(colors, list):
        return None
        
    wanted = (desired_color or "").lower().strip()
    fallback = None
    
    for c in colors:
        name = (c.get("colorName") or "").strip()
        if not name: continue
        if not fallback: fallback = name
        if wanted and name.lower() == wanted:
            return name
            
    return fallback


def compute_availability_score(meta: dict, desired_size: Optional[str]) -> float:
    """
    Score [0, 1]: 1.0 if requested size in stock, 0.7 if other sizes, 0.0 if none.
    """
    sizes = meta.get("sizes") or {}
    if not isinstance(sizes, dict) or not sizes:
        return 0.0
        
    ds = (desired_size or "").upper().strip()
    in_requested = False
    any_other = False
    
    for k, v in sizes.items():
        # Check if stock > 0
        try:
            if int(v) <= 0: continue
        except (ValueError, TypeError):
            continue
            
        ku = k.upper().strip()
        if ds and ku == ds:
            in_requested = True
        else:
            any_other = True
            
    if in_requested: return 1.0
    if any_other: return 0.7
    return 0.0


def compute_popularity_score(meta: dict) -> float:
    """
    Score [0, 1] based on popularity/views/orders.
    """
    # Explicit score
    for k in ("popularityScore", "popularity", "popularity_score"):
        if k in meta:
            try:
                val = float(meta[k])
                return max(0.0, min(1.0, val))
            except (ValueError, TypeError):
                pass
                
    # Heuristic from counts
    for k in ("views", "orders", "soldCount"):
        if k in meta:
            try:
                val = float(meta[k])
                if val <= 0: return 0.3
                # Log-like scaling: 100 views -> ~0.4, 10000 -> ~0.5
                return max(0.3, min(1.0, 0.3 + 0.1 * (val ** 0.5)))
            except (ValueError, TypeError):
                pass
                
    return 0.5


def normalize_score_range(scores: List[float]) -> List[float]:
    if not scores: return []
    mn, mx = min(scores), max(scores)
    if mx <= mn:
        return [0.5 for _ in scores]
    return [(s - mn) / (mx - mn) for s in scores]
