# app/vector/hybrid.py
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import psycopg
from psycopg.rows import dict_row

# ---- Types ----
@dataclass
class Hit:
    id: str
    kind: str
    title: str
    text: str
    url: str
    meta: Dict[str, Any]
    score_dense: float = 0.0
    score_bm25: float = 0.0
    score_attr: float = 0.0     # NEW
    score_final: float = 0.0

# ---- Weights ----
W_DENSE = 0.45
W_BM25  = 0.35
W_ATTR  = 0.20   # attribute (colors/sizes) boost; set to 0 to disable
# (freshness hook removed for now; keep it in W_ATTR if you reintroduce freshness)

def _min_max_norm(values: List[float]) -> List[float]:
    if not values:
        return values
    lo, hi = min(values), max(values)
    if abs(hi - lo) < 1e-9:
        return [0.0 for _ in values]
    return [(v - lo) / (hi - lo) for v in values]

def _mmr(items: List[Hit], k: int, lambda_diversity: float = 0.75) -> List[Hit]:
    if not items:
        return []
    selected: List[Hit] = []
    candidates = items[:]

    def text_sim(a: str, b: str) -> float:
        at = set(a.split())
        bt = set(b.split())
        if not at or not bt:
            return 0.0
        inter = len(at & bt)
        denom = (len(at) * len(bt)) ** 0.5
        return inter / (denom + 1e-9)

    while candidates and len(selected) < k:
        best = None
        best_score = -1e9
        for c in candidates:
            relevance = c.score_final
            redundancy = max((text_sim(c.text, s.text) for s in selected), default=0.0)
            score = lambda_diversity * relevance - (1 - lambda_diversity) * redundancy
            if score > best_score:
                best_score = score
                best = c
        selected.append(best)
        candidates.remove(best)
    return selected

def _attr_overlap(
    meta: Dict[str, Any],
    attrs: Optional[Dict[str, List[str]]]
) -> float:
    """
    Compute a soft 0..1 boost based on overlap between requested attrs and product meta.
    - colors: meta['colors'] is a list of {colorName, ...}
    - sizes:  meta['sizes'] is a dict of {size: stock}
    Scoring:
      color_hit = (#requested_colors_matched / #requested_colors)  (or 0 if none requested)
      size_hit  = (#requested_sizes_matched  / #requested_sizes)   (or 0 if none requested)
      return mean of non-empty parts, else 0.
    """
    if not attrs:
        return 0.0

    req_colors = [c.lower() for c in (attrs.get("colors") or [])]
    req_sizes  = [s.upper() for s in (attrs.get("sizes")  or [])]

    scores: List[float] = []

    # colors
    if req_colors:
        meta_colors = []
        for c in (meta.get("colors") or []):
            name = (c.get("colorName") or "").lower()
            if name:
                meta_colors.append(name)
        if meta_colors:
            hits = sum(1 for rc in req_colors if rc in meta_colors)
            scores.append(hits / max(1, len(req_colors)))
        else:
            scores.append(0.0)

    # sizes
    if req_sizes:
        meta_sizes = {k.upper() for k in (meta.get("sizes") or {}).keys()}
        if meta_sizes:
            hits = sum(1 for rs in req_sizes if rs in meta_sizes)
            scores.append(hits / max(1, len(req_sizes)))
        else:
            scores.append(0.0)

    if not scores:
        return 0.0
    return sum(scores) / len(scores)

def hybrid_search(
    conn: psycopg.Connection,
    query: str,
    index_name: str,   # interpreted as `kind`
    k: int = 24,
    k_rerank: int = 6,
    *,
    attrs: Optional[Dict[str, List[str]]] = None,  # NEW (colors/sizes)
) -> List[Hit]:
    """
    1) Dense top-k (pgvector)
    2) BM25 top-k on tsv
    3) Optional attribute boost (colors/sizes) from meta
    4) Normalize, blend, MMR → k_rerank
    """
    from app.vector.store import embed_query  # sync helper
    q_emb = embed_query(query)

    with conn.cursor(row_factory=dict_row) as cur:
        # ---- Dense (proper cast to vector)
        cur.execute(
            """
            SELECT id, kind, title, text, url, meta,
                   (1.0 - (embedding <=> %s::vector)) AS dense_score
            FROM ai_core.docs
            WHERE kind = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (q_emb, index_name, q_emb, k),
        )
        dense_rows = cur.fetchall()

        # ---- BM25 (precomputed tsv)
        cur.execute(
            """
            SELECT id, kind, title, text, url, meta,
                   ts_rank(tsv, plainto_tsquery('simple', lower(%s))) AS bm25_score
            FROM ai_core.docs
            WHERE kind = %s
              AND tsv @@ plainto_tsquery('simple', lower(%s))
            ORDER BY bm25_score DESC
            LIMIT %s
            """,
            (query, index_name, query, k),
        )
        bm_rows = cur.fetchall()

    # ---- Merge by id
    by_id: Dict[str, Hit] = {}

    for r in dense_rows:
        by_id[r["id"]] = Hit(
            id=r["id"],
            kind=r["kind"],
            title=r.get("title") or "",
            text=r.get("text") or "",
            url=r.get("url") or "",
            meta=r.get("meta") or {},
            score_dense=float(r.get("dense_score") or 0.0),
        )

    for r in bm_rows:
        h = by_id.get(r["id"])
        if h is None:
            h = Hit(
                id=r["id"],
                kind=r["kind"],
                title=r.get("title") or "",
                text=r.get("text") or "",
                url=r.get("url") or "",
                meta=r.get("meta") or {},
            )
            by_id[r["id"]] = h
        h.score_bm25 = max(h.score_bm25, float(r.get("bm25_score") or 0.0))

    items = list(by_id.values())
    if not items:
        return []

    # ---- Attribute boost (colors/sizes) BEFORE normalization
    if W_ATTR > 0.0 and attrs:
        for it in items:
            it.score_attr = float(_attr_overlap(it.meta or {}, attrs))
    else:
        for it in items:
            it.score_attr = 0.0

    # ---- Normalize & blend
    dense_norm = _min_max_norm([it.score_dense for it in items])
    bm25_norm  = _min_max_norm([it.score_bm25  for it in items])
    attr_norm  = _min_max_norm([it.score_attr  for it in items]) if any(it.score_attr for it in items) else [0.0]*len(items)

    for it, d, b, a in zip(items, dense_norm, bm25_norm, attr_norm):
        it.score_final = (W_DENSE * d) + (W_BM25 * b) + (W_ATTR * a)

    items.sort(key=lambda x: x.score_final, reverse=True)
    return _mmr(items, k=k_rerank, lambda_diversity=0.75)

# app/vector/hybrid.py
W_ATTR = 0.20

def _attr_overlap(meta: Dict[str, Any], attrs: Optional[Dict[str, List[str]]]) -> float:
    if not attrs: return 0.0
    want_colors = [c.lower() for c in (attrs.get("colors") or [])]
    want_sizes  = [s.upper() for s in (attrs.get("sizes")  or [])]
    want_types  = [t.lower() for t in (attrs.get("types")  or [])]  # NEW

    parts = []

    # colors
    if want_colors:
        have = {(c.get("colorName") or "").lower() for c in (meta.get("colors") or [])}
        hit = sum(1 for wc in want_colors if wc in have)
        parts.append(hit / max(1, len(want_colors)))

    # sizes
    if want_sizes:
        have = {k.upper() for k in (meta.get("sizes") or {}).keys()}
        hit = sum(1 for ws in want_sizes if ws in have)
        parts.append(hit / max(1, len(want_sizes)))

    # types (exact match on meta.type)
    if want_types:
        mtype = (meta.get("type") or "").lower()
        hit = 1.0 if mtype and mtype in want_types else 0.0
        parts.append(hit)

    return sum(parts)/len(parts) if parts else 0.0
