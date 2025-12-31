# app/routes/rag.py
# Triggering reload to clear type config cache
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, NamedTuple

from fastapi import APIRouter
from pathlib import Path
from pydantic import BaseModel

from app.agent.verify import apply_guardrails, cross_check
from app.core.config import RERANK_MODEL
from app.core.catalog import (
    get_product_meta,
    clean_title,
    ordered_size_names,
    extract_slug,
)
from app.providers.llm import LLMClient
from app.telemetry.trace import emit
from app.vector.store import get_conn_sync, search_hybrid
from app.nlp.ordinals import parse_ordinal_from_text

# Optional rerank
try:
    import httpx
    from app.core.config import COHERE_API_KEY
except ImportError:
    COHERE_API_KEY = None

RAG_DEBUG = os.getenv("RAG_DEBUG", "false").lower() == "true"

router = APIRouter()
_llm = LLMClient()
log = logging.getLogger("cove.rag")

# ------------------ I/O ------------------

class RAGIn(BaseModel):
    query: str
    top_k: int = 6
    context_slugs: Optional[List[str]] = None

# ------------------ Rerank ------------------

async def rerank(query: str, docs: list[dict]) -> list[dict]:
    if os.getenv("DISABLE_RERANK", "false").lower() == "true":
        return docs
    if not COHERE_API_KEY or not docs:
        return docs
    try:
        async with httpx.AsyncClient(timeout=15) as cx:
            r = await cx.post(
                "https://api.cohere.ai/v1/rerank",
                headers={
                    "Authorization": f"Bearer {COHERE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": RERANK_MODEL or "rerank-3",
                    "query": query,
                    "documents": [d.get("text", "") for d in docs],
                },
            )
        r.raise_for_status()
        order = [x["index"] for x in r.json().get("results", [])]
        return [docs[i] for i in order] if order else docs
    except Exception as e:
        log.warning("Cohere rerank skipped: %s", e)
        return docs

# ------------------ Helpers ------------------

async def _answer_for_ordinal_product(
    conn,
    trace_id: str,
    query: str,
    context_slugs: Optional[List[str]],
) -> Optional[Dict[str, Any]]:
    if not context_slugs:
        return None

    idx = parse_ordinal_from_text(query)
    if idx is None or idx < 0 or idx >= len(context_slugs):
        return None

    slug = context_slugs[idx]
    prod = get_product_meta(conn, slug)
    if not prod:
        return None

    meta = prod.get("meta") or {}
    sizes_map = meta.get("sizes") or {}
    if not isinstance(sizes_map, dict) or not sizes_map:
        return None

    size_names = ordered_size_names(list(sizes_map.keys()))
    if not size_names:
        return None

    title = clean_title(prod.get("title") or meta.get("name") or "this product")
    ord_label = f"{idx + 1}st" if idx == 0 else f"{idx + 1}nd" if idx == 1 else f"{idx + 1}rd" if idx == 2 else f"{idx + 1}th"

    answer_text = (
        f"The {ord_label} product, {title}, has sizes {', '.join(size_names)} available."
    )

    citations = [
        {
            "title": prod.get("title") or title,
            "url": prod.get("url") or f"/product/{slug}",
            "score": 1.0,
        }
    ]

    corrections = await cross_check(answer_text, citations)
    final_answer = apply_guardrails(answer_text, corrections)
    emit(
        "verification_done",
        trace_id,
        {"had_corrections": bool(corrections), "corrections": corrections},
    )

    return {
        "answer": final_answer,
        "citations": citations,
    }

def _fallback_cites(docs: list[dict]) -> list[dict]:
    return [
        {
            "title": d.get("title", ""),
            "url": d.get("url", ""),
            "score": float(d.get("score", 0)),
        }
        for d in docs
    ]

def _normalize_citations(raw: Any, docs: list[dict]) -> list[dict]:
    if isinstance(raw, list) and raw and isinstance(raw[0], dict) and "title" in raw[0]:
        return raw
    idxs: List[int] = []
    for x in (raw or []):
        if isinstance(x, int):
            idxs.append(x - 1)
        elif isinstance(x, str):
            m = re.search(r"\[(\d+)\]", x)
            if m:
                idxs.append(int(m.group(1)) - 1)
    out: List[dict] = []
    for i in idxs:
        if 0 <= i < len(docs):
            d = docs[i]
            out.append(
                {
                    "title": d.get("title", ""),
                    "url": d.get("url", ""),
                    "score": float(d.get("score", 0)),
                }
            )
    return out or _fallback_cites(docs)

from app.core.rules import get_prompt

def _build_system_prompt(intent_kind: str) -> str:
    base = get_prompt("rag", default="You are Cove AI. Return JSON: {answer, citations}.")
    
    ik = (intent_kind or "generic").lower()
    if ik == "policy":
        return base + " Focus on store policies (shipping, returns)."
    elif ik == "size_fit":
        return base + " Focus on size and fit information."
    elif ik == "lookup_product":
        return base + " Focus on product details (material, price)."
    return base

def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.S).strip()
    return s

# ------------------ Endpoints ------------------

@router.post("/ai/rag/query")
async def rag_query(body: RAGIn):
    """
    Standard RAG endpoint.
    """
    # 1. Retrieval (Async)
    # Search all kinds (product, policy, etc.)
    docs = await search_hybrid(body.query, kind=None, top_k=body.top_k)
    
    # 2. Rerank (Async)
    docs = await rerank(body.query, docs)
    
    # 3. LLM Generation
    context_text = "\n\n".join(
        f"[{i+1}] {d.get('title','')}\n{d.get('text','')}" 
        for i, d in enumerate(docs)
    )
    
    sys_prompt = _build_system_prompt("generic")
    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {body.query}"}
    ]
    
    raw = await _llm.generate(messages)
    
    # 4. Parse response (supports both JSON and plain text)
    try:
        clean = _strip_code_fences(raw)
        # Try JSON parsing first (backwards compatibility)
        if clean.startswith("{"):
            import json
            data = json.loads(clean)
        else:
            # Plain text response (new behavior)
            data = {"answer": clean, "citations": []}
    except Exception:
        # Fallback: treat as plain text
        data = {"answer": raw.strip(), "citations": []}
        
    # 5. Normalize citations
    if not data.get("citations"):
        data["citations"] = _fallback_cites(docs[:3])
    else:
        data["citations"] = _normalize_citations(data["citations"], docs)
        
    return data


from app.nlp.ordinals import parse_ordinal_from_text

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from app.agent.orchestrator import classify
from app.agent.verify import apply_guardrails, cross_check
from app.core.config import COHERE_API_KEY, EMBED_MODEL, OPENAI_API_KEY, RERANK_MODEL
from app.core.rerank import mmr_rerank_from_vectors
from app.providers.llm import LLMClient
from app.telemetry.trace import emit, new_trace_id
from app.vector.store import get_conn, search_hybrid, search_keyword

# Optional: dynamic vocab (colors/types) from DB; we fallback if not present
try:
    from app.vector.store import catalog_vocab  # type: ignore
except Exception:  # pragma: no cover
    catalog_vocab = None  # type: ignore

RAG_DEBUG = os.getenv("RAG_DEBUG", "false").lower() == "true"

router = APIRouter()
_llm = LLMClient()
log = logging.getLogger("cove.rag")


# ------------------ I/O ------------------


class RAGIn(BaseModel):
    query: str
    top_k: int = 6
    # NEW: optional context from UI / orchestrator
    context_slugs: Optional[List[str]] = None



# ------------------ Embeddings (async, kept for completeness) ------------------

EMBED_MODEL = os.getenv("EMBED_MODEL", "openrouter:openai/text-embedding-3-small")

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
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")


async def embed(texts: list[str]) -> list[list[float]]:
    if EMBED_MODEL.startswith("openrouter:"):
        model = EMBED_MODEL.split("openrouter:", 1)[1]
        url = "https://openrouter.ai/api/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"model": model, "input": texts}
    elif EMBED_MODEL.startswith("cohere:"):
        model = EMBED_MODEL.split("cohere:", 1)[1]
        url = "https://api.cohere.ai/v1/embed"
        headers = {
            "Authorization": f"Bearer {COHERE_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"model": model, "texts": texts}
    else:
        model = (
            EMBED_MODEL.split("openai:", 1)[1]
            if EMBED_MODEL.startswith("openai:")
            else EMBED_MODEL
        )
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"model": model, "input": texts}

    async with httpx.AsyncClient(timeout=30) as cx:
        r = await cx.post(url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()

    if "data" in data and data["data"] and "embedding" in data["data"][0]:
        return [d["embedding"] for d in data["data"]]
    if "embeddings" in data:  # Cohere
        return data["embeddings"]

    raise RuntimeError(f"Unexpected embedding response keys: {list(data.keys())}")


# ------------------ Optional rerank ------------------


async def rerank(query: str, docs: list[dict]) -> list[dict]:
    # Short-circuit via env
    if os.getenv("DISABLE_RERANK", "false").lower() == "true":
        return docs
    if not COHERE_API_KEY or not docs:
        return docs
    try:
        async with httpx.AsyncClient(timeout=15) as cx:
            r = await cx.post(
                "https://api.cohere.ai/v1/rerank",
                headers={
                    "Authorization": f"Bearer {COHERE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": RERANK_MODEL or "rerank-3",
                    "query": query,
                    "documents": [d.get("text", "") for d in docs],
                },
            )
        r.raise_for_status()
        order = [x["index"] for x in r.json().get("results", [])]
        return [docs[i] for i in order] if order else docs
    except Exception as e:
        log.warning("Cohere rerank skipped: %s", e)
        return docs


# ------------------ Helpers ------------------
async def _answer_for_ordinal_product(
    conn,
    trace_id: str,
    query: str,
    context_slugs: Optional[List[str]],
) -> Optional[Dict[str, Any]]:
    """
    Handle follow-ups like 'what sizes available for second product?'
    by grounding into the *explicit* context_slugs provided by caller.
    """
    if not context_slugs:
        return None

    idx = parse_ordinal_from_text(query)
    if idx is None or idx < 0 or idx >= len(context_slugs):
        return None

    slug = context_slugs[idx]
    prod = _get_product_meta(conn, slug)
    if not prod:
        return None

    meta = prod.get("meta") or {}
    sizes_map = meta.get("sizes") or {}
    if not isinstance(sizes_map, dict) or not sizes_map:
        return None

    size_names = _ordered_size_names(list(sizes_map.keys()))
    if not size_names:
        return None

    title = _clean_title(prod.get("title") or meta.get("name") or "this product")
    ord_label = ordinal_label_for_index(idx)  # e.g. '2nd'

    answer_text = (
        f"The {ord_label} product, {title}, has sizes {', '.join(size_names)} available."
    )

    citations = [
        {
            "title": prod.get("title") or title,
            "url": prod.get("url") or f"/product/{slug}",
            "score": 1.0,
        }
    ]

    corrections = await cross_check(answer_text, citations)
    final_answer = apply_guardrails(answer_text, corrections)
    emit(
        "verification_done",
        trace_id,
        {"had_corrections": bool(corrections), "corrections": corrections},
    )

    return {
        "answer": final_answer,
        "citations": citations,
    }


def _fallback_cites(docs: list[dict]) -> list[dict]:
    return [
        {
            "title": d.get("title", ""),
            "url": d.get("url", ""),
            "score": float(d.get("score", 0)),
        }
        for d in docs
    ]


def _normalize_citations(raw: Any, docs: list[dict]) -> list[dict]:
    if isinstance(raw, list) and raw and isinstance(raw[0], dict) and "title" in raw[0]:
        return raw
    idxs: List[int] = []
    for x in (raw or []):
        if isinstance(x, int):
            idxs.append(x - 1)
        elif isinstance(x, str):
            m = re.search(r"\[(\d+)\]", x)
            if m:
                idxs.append(int(m.group(1)) - 1)
    out: List[dict] = []
    for i in idxs:
        if 0 <= i < len(docs):
            d = docs[i]
            out.append(
                {
                    "title": d.get("title", ""),
                    "url": d.get("url", ""),
                    "score": float(d.get("score", 0)),
                }
            )
    return out or _fallback_cites(docs)


def _clip(txt: str, n: int = 1200) -> str:
    return txt[:n] + ("..." if len(txt) > n else "")


def _extract_slug(url: str) -> Optional[str]:
    # expects "/product/<slug>"
    if not url:
        return None
    m = re.search(r"/product/([^?\s]+)", url)
    return m.group(1) if m else None


def _pick_primary_slug_for_fit(
    conn,
    docs: List[dict],
    attrs: Dict[str, List[str]],
) -> Optional[str]:
    """
    Choose a representative product slug for fit recommendation.
    Priority:
      - matches requested type (e.g. hoodie)
      - otherwise, just first product with a valid slug.
    """
    wanted_types = set(attrs.get("types") or [])

    # First pass: match requested type
    for d in docs:
        slug = _extract_slug(d.get("url", "") or "") or ""
        if not slug:
            continue
        prod = _get_product_meta(conn, slug)
        if not prod:
            continue
        meta = prod.get("meta") or {}
        ptype = (meta.get("type") or "").lower().strip()
        if wanted_types and ptype in wanted_types:
            return slug

    # Fallback: any slug is fine
    for d in docs:
        slug = _extract_slug(d.get("url", "") or "") or ""
        if slug:
            return slug

    return None


async def _call_fit_recommend(
    params: _FitParams,
    *,
    product_type: Optional[str],
    slug: Optional[str],
) -> Optional[Dict[str, Any]]:

    """
    Internal call to /ai/fit/recommend so we can reuse the fit rules from routes/fit.py.
    """
    pref = (params.fit_preference or "regular").lower()
    if pref in (None, ""):
        pref = "regular"

    payload = {
        "gender": params.gender,
        "height_cm": params.height_cm,
        "weight_kg": params.weight_kg,
        "fit_preference": pref,
        "product_type": product_type,
        "slug": slug,
    }

    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            r = await cx.post("http://127.0.0.1:8000/ai/fit/recommend", json=payload)
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        log.warning("fit.recommend call failed: %s", e)

    return None


def _build_suggestions_for_unknown(
    conn,
    docs: List[dict],
    attrs: Dict[str, List[str]],
    max_items: int = 2,
) -> Tuple[List[str], List[dict]]:
    """
    Build a short list of similar items when we don't have a direct answer.
    Preference:
      - same requested type (hoodie, bomber, etc.)
      - list available colors per product.
    """
    wanted_types = set(attrs.get("types") or [])
    lines: List[str] = []
    selected_cites: List[dict] = []
    seen_slugs: set[str] = set()

    for d in docs:
        if len(lines) >= max_items:
            break

        slug = _extract_slug(d.get("url", "") or "") or ""
        if not slug or slug in seen_slugs:
            continue

        prod = _get_product_meta(conn, slug)
        if not prod:
            continue

        meta = prod.get("meta") or {}
        ptype = (meta.get("type") or "").lower().strip()

        if wanted_types and ptype not in wanted_types:
            continue

        colors: List[str] = []
        if meta.get("colors"):
            for c in (meta.get("colors") or []):
                name = (c.get("colorName") or "").strip()
                if name:
                    colors.append(name.title())
        else:
            cname = (meta.get("colorName") or "").strip()
            if cname:
                colors.append(cname.title())

        title_raw = meta.get("name") or d.get("title", "Product")
        title = _clean_title(title_raw)

        if colors:
            line = f"{title}: {', '.join(sorted(set(colors)))}."
        else:
            line = title + "."

        lines.append(line)

        selected_cites.append(
            {
                "title": prod.get("title") or title,
                "url": prod.get("url") or f"/product/{slug}",
                "score": float(d.get("score", 0) or 0),
            }
        )

        seen_slugs.add(slug)

    return lines, selected_cites


def _build_system_prompt(intent_kind: str) -> str:
    """Build system prompt from config file (no hardcoded JSON!)"""
    from app.core.rules import get_prompt
    
    base = get_prompt("rag", default="You are Cove AI. Answer questions helpfully using only the provided context.")
    
    ik = (intent_kind or "generic").lower()

    if ik == "policy":
        return (
            base
            + " Focus on explaining store policies such as shipping, delivery times, returns, and refunds. "
              "Do NOT invent policy details that are not present in the context."
        )
    elif ik == "size_fit":
        return (
            base
            + " Focus on size and fit information (which sizes exist, general fit notes). "
              "If you don't have the user's measurements, ask for them warmly to give better advice. "
              "Do NOT invent new sizes or discuss store policies unless clearly present in the context."
        )
    elif ik == "lookup_product":
        return (
            base
            + " Focus on summarizing product details such as type, material, colors, and price. "
              "Do NOT describe store policies unless clearly present in the context."
        )
    elif ik == "multi":
        return (
            base
            + " If the question has multiple parts (e.g. product plus shipping), answer each part briefly. "
              "Keep the answer concise and grounded in the context."
        )
    else:
        return base


def _strip_code_fences(s: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers if present."""
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.S).strip()
    return s


def _get_product_meta(conn, slug: str) -> Optional[dict]:
    """
    Fetch product metadata by slug/groupSlug directly from ai_core.docs.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT title, meta, url
            FROM ai_core.docs
            WHERE kind = 'product'
              AND (
                meta->>'groupSlug' = %s
                OR meta->>'slug' = %s
              )
            LIMIT 1
            """,
            (slug, slug),
        )
        row = cur.fetchone()

    if not row:
        return None

    title, meta, url = row
    meta = meta or {}

    return {
        "title": title or (meta.get("name") if isinstance(meta, dict) else ""),
        "url": url or f"/product/{slug}",
        "price": (meta.get("price") if isinstance(meta, dict) else None),
        "meta": meta,
    }


_TITLE_PAREN_RE = re.compile(r"\s*\([^)]*\)\s*$")


def _clean_title(t: str) -> str:
    """Remove trailing parentheticals like ' (100% Cotton)' to keep titles tidy."""
    return _TITLE_PAREN_RE.sub("", (t or "").strip())


def _ordered_size_names(names: List[str]) -> List[str]:
    order = ["XS", "S", "M", "L", "XL", "XXL"]
    have = {n.upper() for n in names}
    return [s for s in order if s in have]


# ------------------ Dynamic vocab & intent ------------------

_SIZES = {"XS", "S", "M", "L", "XL", "XXL"}

_COMMON_COLOR_WORDS = {
    "black",
    "white",
    "gray",
    "grey",
    "cream",
    "beige",
    "red",
    "maroon",
    "crimson",
    "pink",
    "hotpink",
    "rose",
    "orange",
    "amber",
    "yellow",
    "gold",
    "mustard",
    "green",
    "lime",
    "olive",
    "teal",
    "blue",
    "navy",
    "azure",
    "cyan",
    "purple",
    "violet",
    "lavender",
    "magenta",
}


def _get_vocab(conn) -> Dict[str, set]:
    if catalog_vocab:
        v = catalog_vocab(conn)
        return {
            "colors": set(v.get("colors", set())) | _COMMON_COLOR_WORDS,
            "types": set(v.get("types", set())),
            "sizes": _SIZES,
        }
    # fallback
    colors, types = set(), set()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT lower(c->>'colorName')
            FROM ai_core.docs, jsonb_array_elements(meta->'colors') c
            WHERE kind='product'
            """
        )
        colors = {r[0] for r in cur.fetchall() if r[0]}
        cur.execute(
            """
            SELECT DISTINCT lower(COALESCE(meta->>'type', split_part(lower(title),' ',1)))
            FROM ai_core.docs
            WHERE kind='product'
            """
        )
        types = {r[0] for r in cur.fetchall() if r[0]}
    return {"colors": colors | _COMMON_COLOR_WORDS, "types": types, "sizes": _SIZES}


def _ask_shrinkage(q: str) -> bool:
    ql = q.lower()
    return any(w in ql for w in ("shrink", "shrinkage", "wash", "washing", "dryer", "drying"))


def _looks_discovery_question(q: str, attrs: Dict[str, List[str]]) -> bool:
    """
    Detector for 'what do you have / show me options' type queries.
    """
    ql = (q or "").lower()
    has_q_word = any(w in ql for w in ("what", "which", "show", "see", "any"))
    mentions_type = bool(attrs.get("types"))
    asks_color_word = any(w in ql for w in ("color", "colour", "colourway"))

    return asks_color_word or (has_q_word and mentions_type)


from difflib import get_close_matches


def _normalize_type_token(tok: str, catalog_types: set[str]) -> Optional[str]:
    tok = (tok or "").lower()
    print(f"🔍 [NORMALIZE] Input token: '{tok}', catalog has {len(catalog_types)} types")
    
    if not tok or not catalog_types:
        print(f"🔍 [NORMALIZE] Empty token or catalog, returning None")
        return None

    if tok in catalog_types:
        print(f"🔍 [NORMALIZE] ✓ Direct match found: '{tok}'")
        return tok
    
    # Load type synonyms from config (NO HARDCODING!)
    config = _get_type_normalization_config()
    synonyms = config.get('type_synonyms', {})
    
    # Check if token is a synonym for any canonical type
    for canonical_type, synonym_list in synonyms.items():
        if tok in [s.lower() for s in synonym_list]:
            if canonical_type in catalog_types:
                print(f"🔍 [NORMALIZE] ✓ Synonym match: '{tok}' → '{canonical_type}'")
                return canonical_type
    
    # Check broad category map (e.g., "shoes" → ["boots", "heels", "loafers", "sneakers"])
    broad_map = config.get('broad_category_map', {})
    if tok in broad_map:
        mapped_types = broad_map[tok]
        if isinstance(mapped_types, list):
            for mt in mapped_types:
                if mt.lower() in catalog_types:
                    print(f"🔍 [NORMALIZE] ✓ Broad category match: '{tok}' → '{mt}'")
                    return mt.lower()
            print(f"🔍 [NORMALIZE] ✗ Broad category '{tok}' has no catalog matches: {mapped_types}")

    candidates = {tok}
    if tok.endswith("ies") and len(tok) > 3:
        candidates.add(tok[:-3] + "y")
    if tok.endswith("es") and len(tok) > 2:
        candidates.add(tok[:-2])
    if tok.endswith("s") and len(tok) > 1:
        candidates.add(tok[:-1])

    print(f"🔍 [NORMALIZE] Candidates after pluralization: {candidates}")
    
    for c in candidates:
        if c in catalog_types:
            print(f"🔍 [NORMALIZE] ✓ Candidate match found: '{c}'")
            return c

    match = get_close_matches(tok, list(catalog_types), n=1, cutoff=0.84)
    if match:
        print(f"🔍 [NORMALIZE] ✓ Fuzzy match found: '{match[0]}'")
        return match[0]

    print(f"🔍 [NORMALIZE] ✗ No match found for '{tok}'")
    return None


def _parse_query_attrs(conn, q: str) -> Dict[str, List[str]]:
    print(f"🔍 [PARSE] Starting _parse_query_attrs for query: '{q}'")
    v = _get_vocab(conn)
    print(f"🔍 [PARSE] Vocabulary types ({len(v['types'])} total): {sorted(list(v['types']))[:20]}...")  # Show first 20
    print(f"🔍 [PARSE] Is 'skirt' in vocab? {'skirt' in v['types']}")
    
    raw = re.findall(r"[a-zA-Z]+", q.lower())
    toks = set(raw)
    print(f"🔍 [PARSE] Extracted tokens: {toks}")

    # Color synonym mapping - expand simple colors to catalog variants
    COLOR_SYNONYMS = {
        "blue": ["mid blue", "ink navy"],
        "navy": ["ink navy", "mid blue"],
        "white": ["optical white", "off-white"],
        "black": ["jet black", "black"],
        "grey": ["stone grey", "charcoal"],
        "gray": ["stone grey", "charcoal"],
    }
    
    # Direct matches from vocab
    colors = sorted({t for t in toks if t in v["colors"]})
    print(f"🔍 [PARSE] Direct color matches from vocab: {colors}")
    
    # Expand via synonyms
    expanded_colors = []
    for tok in toks:
        if tok in COLOR_SYNONYMS:
            print(f"🔍 [PARSE] Found synonym key '{tok}', expanding to: {COLOR_SYNONYMS[tok]}")
            for catalog_color in COLOR_SYNONYMS[tok]:
                if catalog_color in v["colors"] and catalog_color not in colors:
                    expanded_colors.append(catalog_color)
                    print(f"🔍 [PARSE]   ✓ Added '{catalog_color}' (in catalog)")
                elif catalog_color not in v["colors"]:
                    print(f"🔍 [PARSE]   ✗ Skipped '{catalog_color}' (not in catalog)")
    
    colors.extend(expanded_colors)
    print(f"🔍 [PARSE] Colors after synonym expansion: {colors}")
    
    if "hot" in toks and "pink" in toks:
        colors.append("hotpink")
    
    # Re-sort after expansion
    colors = sorted(set(colors))

    sizes = sorted({t.upper() for t in toks if t.upper() in v["sizes"]})

    catalog_types = v["types"]
    norm_types: set[str] = set()
    for t in toks:
        norm = _normalize_type_token(t, catalog_types)
        if norm:
            norm_types.add(norm)

    types = sorted(norm_types)
    
    result = {"colors": colors, "sizes": sizes, "types": types}
    print(f"🔍 [PARSE] Final parsed attrs: {result}")
    return result


class _FitParams(NamedTuple):
    height_cm: float
    weight_kg: float
    gender: Optional[str]
    fit_preference: Optional[str]


def _parse_fit_params(q: str) -> Optional[_FitParams]:
    ql = q.lower()

    mh = re.search(r"(\d{2,3})\s*cm", ql)
    mw = re.search(r"(\d{2,3})\s*kg", ql)

    if not (mh and mw):
        return None

    try:
        height_cm = float(mh.group(1))
        weight_kg = float(mw.group(1))
    except ValueError:
        return None

    gender = None
    if re.search(r"\b(female|woman|women|girl)\b", ql):
        gender = "female"
    elif re.search(r"\b(male|man|men|boy)\b", ql):
        gender = "male"

    fit_pref = None
    if re.search(r"\bslim\b", ql):
        fit_pref = "slim"
    elif re.search(r"\b(oversized|baggy|loose)\b", ql):
        fit_pref = "oversized"
    elif re.search(r"\bregular\b", ql):
        fit_pref = "regular"

    return _FitParams(
        height_cm=height_cm,
        weight_kg=weight_kg,
        gender=gender,
        fit_preference=fit_pref,
    )

async def _generate_greeting(message: str, user_name: Optional[str]) -> str:
    """
    Use the LLM to answer pure greeting / small-talk in ONE short line.
    No catalog / DB calls here.
    """
    name_hint = (
        f" Address the user once as {user_name}."
        if user_name
        else ""
    )

    sys_prompt = (
        "You are Cove AI, a friendly fashion assistant.\n"
        "The user is greeting you or making small talk, not asking a concrete shopping question.\n"
        "Reply in ONE short sentence: warm, concise, and end by inviting them to say "
        "what they are looking for (products, sizes, outfits)."
        + name_hint
    )

    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": message},
    ]

    try:
        out = await _llm.generate(messages)
        # keep first line, trimmed, reasonably short
        line = out.strip().split("\n")[0]
        return line[:280]
    except Exception as e:
        log.warning("greeting LLM failed, using fallback: %s", e)
        # ultra-rare fallback only
        if user_name:
            return (
                f"Hey {user_name}, I’m Cove AI. "
                "I can help with Cove products, sizes, or outfit ideas — what are you looking for today?"
            )
        return (
            "Hey, I’m Cove AI. I can help with Cove products, sizes, or outfit ideas — "
            "what are you looking for today?"
        )

# ------------------ Catalog fetchers (verified stock & colors) ------------------


async def _fetch_product(http: httpx.AsyncClient, slug: str) -> Optional[dict]:
    try:
        r = await http.get(
            "http://127.0.0.1:8000/ai/tools/product.get", params={"slug": slug}
        )
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        log.warning("product.get failed for %s: %s", slug, e)
    return None

def _color_matches(query_color: str, catalog_color: str) -> bool:
    """
    Relaxed color match:
      - exact match (blue == blue)
      - token match (blue in 'mid blue')
    """
    q = (query_color or "").lower().strip()
    c = (catalog_color or "").lower().strip()
    if not q or not c:
        return False

    if q == c:
        return True

    # token-based: 'blue' in 'mid blue'
    if q in c.split():
        return True

    return False

async def _verify_color_stock_for_citations(
    citations: list[dict],
    colors: List[str],
    *,
    prod_cache: Dict[str, dict] | None = None,
    conn=None,
) -> Tuple[Dict[str, bool], Dict[str, Dict[str, int]], Dict[str, List[str]]]:
    """
    Returns:
      available: {color -> bool}
      color_sizes: {color -> {size -> stock}}
      all_colors_by_slug: {slug -> [colorName, ...]}
    """
    available = {c: False for c in colors}
    color_sizes: Dict[str, Dict[str, int]] = {c: {} for c in colors}
    all_colors_by_slug: Dict[str, List[str]] = {}
    prod_cache = prod_cache or {}

    for d in citations:
        slug = _extract_slug(d.get("url", "")) or ""
        if not slug:
            continue

        # 1) cache, 2) DB, 3) optional HTTP
        prod = prod_cache.get(slug)
        if not prod and conn is not None:
            prod = _get_product_meta(conn, slug)
            if prod:
                prod_cache[slug] = prod

        if not prod and os.getenv("DISABLE_TOOLS_HTTP_FALLBACK", "true").lower() != "true":
            try:
                async with httpx.AsyncClient(timeout=5) as cx:
                    prod = await _fetch_product(cx, slug)
                    if prod:
                        prod_cache[slug] = prod
            except Exception:
                prod = None

        if not prod:
            continue

        meta = prod.get("meta") or {}
        color_list = [(c.get("colorName") or "").lower() for c in (meta.get("colors") or [])]
        all_colors_by_slug[slug] = [c for c in color_list if c]

        for col in colors:
            # relaxed match: 'blue' should match 'mid blue'
            if not any(_color_matches(col, name) for name in color_list):
                continue

            available[col] = True
            sizes = meta.get("sizes") or {}

            checked_any = False
            any_decimal = False
            all_intlike = True
            int_values: List[int] = []

            for k, v in sizes.items():
                ku = (k or "").upper()
                if ku not in _SIZES:
                    continue
                checked_any = True

                if isinstance(v, float):
                    any_decimal = True
                    all_intlike = False
                    break
                if isinstance(v, int):
                    iv = v
                else:
                    s = str(v).strip()
                    if "." in s or "," in s:
                        any_decimal = True
                        all_intlike = False
                        break
                    if not s.isdigit():
                        all_intlike = False
                        break
                    iv = int(s)

                int_values.append(iv)

            looks_like_stock = (
                checked_any
                and all_intlike
                and not any_decimal
                and len(int_values) > 0
                and max(int_values) <= 50
            )

            filt: Dict[str, int] = {}
            if looks_like_stock:
                for k, v in sizes.items():
                    ku = (k or "").upper()
                    if ku in _SIZES:
                        try:
                            iv = int(v) if isinstance(v, int) else int(str(v).strip())
                            if 0 <= iv <= 50:
                                filt[ku] = iv
                        except Exception:
                            continue

            color_sizes[col].update(filt)

    if RAG_DEBUG:
        log.warning("[RAG_DEBUG] color_sizes=%s", color_sizes)

    return available, color_sizes, all_colors_by_slug



# ------------------ Main RAG route ------------------


@router.post("/ai/rag/query")
async def rag_query(body: RAGIn):
    trace_id = new_trace_id()

    def _friendly_unknown(
        reason: str = "", *, attrs: Dict[str, List[str]] | None = None
    ) -> str:
        reason = (reason or "").lower()
        attrs = attrs or {}
        ql = (body.query or "").lower()
        if "shrink" in ql:
            return "Shrinkage info isn’t listed in our catalog."
        if "ood_type" in reason:
            return "We don’t carry that item type yet."
        if "no_docs" in reason:
            return "We couldn’t find matching products in the catalog."
        if "llm_fail" in reason:
            return (
                "We don’t have that information yet. "
                "Here are some similar items from our catalog."
            )
        return "We couldn’t find that in the catalog."

    USE_KEYWORD_ONLY = os.getenv("DISABLE_EMBEDDING", "false").lower() == "true"
    RAG_DEBUG = os.getenv("RAG_DEBUG", "false").lower() == "true"

    # everything that touches Postgres stays under this connection
    with get_conn() as conn:
        # --- Parse attrs & intent ---
        attrs = _parse_query_attrs(conn, body.query)
        ask_shrink = _ask_shrinkage(body.query)
        intent = await classify(body.query, attrs)
        intent_kind = getattr(intent, "kind", "generic")
        emit(
            "query_received",
            trace_id,
            {"q": body.query, "attrs": attrs, "intent": intent_kind},
        )
                # ---- Pure greeting / small-talk: skip RAG, use lightweight LLM reply ----
        if intent_kind in ("greeting", "small_talk"):
            text = await _generate_greeting(body.query, getattr(body, 'userName', None))
            return {
                "answer": text,
                "citations": [],
            }

        # ---- Retrieval ----
        try:
            if USE_KEYWORD_ONLY:
                docs = search_keyword(
                    conn, query=body.query, kind="product", top_k=body.top_k
                )
            else:
                docs = await search_hybrid(
                    query=body.query,
                    kind="product",
                    top_k=body.top_k,
                )
        except TypeError:
            docs = (
                await search_keyword(
                    query=body.query, kind="product", top_k=body.top_k
                )
                if USE_KEYWORD_ONLY
                else await search_hybrid(
                    query=body.query, kind="product", top_k=body.top_k
                )
            )

        emit(
            "retrieval_done",
            trace_id,
            {
                "count": len(docs),
                "top_titles": [d.get("title", "") for d in docs[:5]],
                "scores": [float(d.get("score", 0) or 0) for d in docs[:5]],
            },
        )

        # -------- Soft type gate --------
        if attrs.get("types"):
            wanted_types = set(attrs["types"])
            any_match = False
            for d in docs:
                slug = _extract_slug(d.get("url", "") or "") or ""
                if not slug:
                    continue
                prod = _get_product_meta(conn, slug)
                if not prod:
                    continue
                meta = prod.get("meta") or {}
                ptype = (meta.get("type") or "").lower().strip()
                if ptype in wanted_types:
                    any_match = True
                    break

            if not any_match:
                return {
                    "answer": _friendly_unknown("ood_type", attrs=attrs),
                    "citations": _fallback_cites(docs),
                }

        if not docs:
            return {
                "answer": _friendly_unknown("no_docs", attrs=attrs),
                "citations": [],
            }
                # ----- Ordinal follow-up like "second product" (needs explicit context) -----
        ordinal_resp = await _answer_for_ordinal_product(
            conn,
            trace_id,
            body.query,
            body.context_slugs,
        )
        if ordinal_resp is not None:
            return ordinal_resp

        # -------- Optional rules-based fit recommendation --------
        fit_params = _parse_fit_params(body.query)

        if intent_kind == "size_fit" and fit_params is not None:
            # Generic fallback instead of hardcoded "hoodie"
            product_type = (attrs.get("types") or ["apparel"])[0]
            slug_for_fit = _pick_primary_slug_for_fit(conn, docs, attrs)

            fit_resp = await _call_fit_recommend(
                fit_params,
                product_type=product_type,
                slug=slug_for_fit,
            )

            if fit_resp is not None:
                size = fit_resp.get("size")
                if size:
                    answer_text = (
                        f"Based on your height and weight, we recommend size {size} for this {product_type}."
                        " This is an estimate, not a guaranteed perfect fit."
                    )
                else:
                    answer_text = (
                        "We couldn't confidently recommend a size from your measurements alone."
                    )

                citations = _fallback_cites(docs)
                corrections = await cross_check(answer_text, citations)
                final_answer = apply_guardrails(answer_text, corrections)
                emit(
                    "verification_done",
                    trace_id,
                    {"had_corrections": bool(corrections), "corrections": corrections},
                )

                return {
                    "answer": final_answer,
                    "citations": citations,
                }

        # -------- Rerank (Cohere) --------
        reranked = await rerank(body.query, docs)
        emit(
            "rerank_applied" if reranked is not docs else "rerank_skipped", trace_id, {}
        )
        docs = reranked[: body.top_k]

        # --- Optional MMR diversity rerank ---
        USE_MMR = os.getenv("USE_MMR", "true").lower() == "true"
        if USE_MMR and not USE_KEYWORD_ONLY and len(docs) > 1:
            try:
                vecs = await embed([body.query] + [d.get("text", "") for d in docs])
                if vecs and len(vecs) >= len(docs) + 1:
                    query_vec = vecs[0]
                    doc_vecs = vecs[1:]
                    docs = mmr_rerank_from_vectors(
                        query_embedding=query_vec,
                        doc_embeddings=doc_vecs,
                        docs=docs,
                        lambda_mult=0.55,
                        top_k=min(body.top_k, 8),
                    )
                    emit("mmr_applied", trace_id, {"count": len(docs)})
            except Exception as e:
                log.warning("MMR rerank skipped: %s", e)
                emit("mmr_skipped", trace_id, {"error": str(e)})

        # -------- Build context for LLM --------
        ctx = "\n\n".join(
            [
                f"[{i+1}] {_clean_title(d['title'])}\n{_clip(d.get('text', ''))}"
                for i, d in enumerate(docs)
            ]
        )

        sys_prompt = _build_system_prompt(intent_kind)
        messages = [
            {"role": "system", "content": sys_prompt},
            {
                "role": "user",
                "content": (
                    f"Question: {body.query}\n\n"
                    f"Context (cite by [index]):\n{ctx}\n\nRespond as JSON."
                ),
            },
        ]

        # ---- LLM draft (offline-safe & bounded) ----
        if os.getenv("LLM_OFFLINE", "false").lower() == "true":
            data: Dict[str, Any] = {
                "answer": _friendly_unknown("llm_fail", attrs=attrs),
                "citations": _fallback_cites(docs),
            }
        else:
            _llm_timeout = int(os.getenv("LLM_HARD_TIMEOUT_SECS", "12"))
            _llm_bypass = (
                os.getenv("LLM_BYPASS_ON_FAIL", "false").lower() == "true"
            )
            try:
                out = await asyncio.wait_for(
                    _llm.generate(messages), timeout=_llm_timeout
                )
            except (asyncio.TimeoutError, httpx.ReadTimeout) as e:
                log.warning("LLM timeout: %s", e)
                if _llm_bypass:
                    data = {
                        "answer": _friendly_unknown("llm_fail", attrs=attrs),
                        "citations": _fallback_cites(docs),
                    }
                else:
                    return {
                        "answer": "Sorry—our language model timed out. Here are the top matches.",
                        "citations": _fallback_cites(docs),
                    }
            except Exception as e:
                log.warning("LLM generate failed: %s", e)
                if _llm_bypass:
                    data = {
                        "answer": _friendly_unknown("llm_fail", attrs=attrs),
                        "citations": _fallback_cites(docs),
                    }
                else:
                    return {
                        "answer": "Sorry—having trouble reaching the language model. Here are the top matches.",
                        "citations": _fallback_cites(docs),
                    }
            else:
                raw = _strip_code_fences(out)
                try:
                    data = json.loads(raw)
                except Exception:
                    data = {"answer": out, "citations": _fallback_cites(docs)}

        # -------- Normalize citations from model --------
        citations = _normalize_citations(data.get("citations"), docs)

        # -------- Friendly "Unknown" UX with suggested alternatives --------
        raw_answer = (data.get("answer", "") or "").strip()
        normalized = raw_answer.lower().strip().strip(".! ")
        is_unknown = normalized == "unknown"

        if (
            is_unknown
            and not ask_shrink
            and not attrs.get("colors")
            and intent_kind != "policy"
        ):
            alt_lines, alt_cites = _build_suggestions_for_unknown(
                conn, docs, attrs, max_items=2
            )

            if alt_lines:
                answer_text = (
                    "We don’t have that information yet. "
                    "Here are some similar items from our catalog: "
                    + " ".join(alt_lines)
                )
                citations = alt_cites
            else:
                answer_text = (
                    "We don’t have that information yet. "
                    "Want to see similar items from our catalog?"
                )
                citations = _fallback_cites(docs)

            corrections = await cross_check(answer_text, citations)
            final_answer = apply_guardrails(answer_text, corrections)
            emit(
                "verification_done",
                trace_id,
                {
                    "had_corrections": bool(corrections),
                    "corrections": corrections,
                },
            )

            if RAG_DEBUG:
                log.warning("[RAG_DEBUG] unknown_with_suggestions=%s", final_answer)

            resp: Dict[str, Any] = {"answer": final_answer, "citations": citations}
            if RAG_DEBUG:
                resp["debug"] = {"notes": ["unknown_with_suggestions"]}
            return resp

        # -------- Verified composition (shrinkage + colors/sizes) --------
        lines: List[str] = []
        prod_cache: Dict[str, dict] = {}

        # Shrinkage line (never guess)
        if ask_shrink:
            if "shrink" in ctx.lower():
                first = (data.get("answer", "") or "").split(".")[0].strip()
                shrink_line = (
                    first if first else _friendly_unknown("shrink", attrs=attrs)
                )
            else:
                shrink_line = "Shrinkage: not stated in catalog."
            lines.append(
                shrink_line if shrink_line.endswith(".") else shrink_line + "."
            )

        FEW_LEFT_ENABLED = os.getenv("FEW_LEFT_ENABLED", "false").lower() == "true"
        LOW_STOCK_THRESHOLD = int(os.getenv("LOW_STOCK_THRESHOLD", "3"))

        debug_notes: List[str] = []
        colors = attrs.get("colors", [])

        def _sanitize_counts(raw: Dict[str, Any]) -> Dict[str, int]:
            """Keep only integer stock counts in [0,100]; drop floats like 19.99."""
            if not raw:
                return {}
            out: Dict[str, int] = {}
            for k, v in raw.items():
                ku = (k or "").upper()
                if ku not in ("XS", "S", "M", "L", "XL", "XXL"):
                    continue
                try:
                    s = str(v).strip()
                    if "." in s or "," in s:
                        continue
                    iv = int(v)
                    if 0 <= iv <= 100:
                        out[ku] = iv
                except Exception:
                    continue
            return out

        if colors:
            # Use DB-based verifier first (stock + colors)
            available, color_sizes, _ = await _verify_color_stock_for_citations(
                citations, colors, prod_cache=prod_cache, conn=conn
            )

            for c in colors:
                # ---------- Fallback: if DB-based checker says "False", do a soft scan ----------
                if not available.get(c):
                    color_found = False

                    for d in citations:
                        slug = _extract_slug(d.get("url", "") or "") or ""
                        prod = None

                        if slug:
                            prod = prod_cache.get(slug) or _get_product_meta(conn, slug)
                            if prod:
                                prod_cache[slug] = prod

                        if prod:
                            meta = prod.get("meta") or {}
                            # group-style colors array
                            for x in (meta.get("colors") or []):
                                name = (x.get("colorName") or "")
                                if _color_matches(c, name):
                                    color_found = True
                                    break
                            if color_found:
                                break

                        # also allow match directly in title text ("mid blue" etc.)
                        title = (d.get("title") or "")
                        if _color_matches(c, title):
                            color_found = True
                            break

                    if color_found:
                        # treat as available, even if we don't have good stock data
                        available[c] = True
                    else:
                        lines.append(f"{c.title()} not found in cited products.")
                        if RAG_DEBUG:
                            debug_notes.append(f"{c}:not_available")
                        continue  # move on to next color

                # ---------- At this point, color c is considered available ----------
                counts_raw = color_sizes.get(c, {}) or {}
                counts = _sanitize_counts(counts_raw)

                size_names: List[str] = []
                if counts:
                    ordered = ["XS", "S", "M", "L", "XL", "XXL"]
                    size_names = [s for s in ordered if s in counts] or list(counts.keys())
                else:
                    # Fallback: derive size names from meta.sizes even if we didn't trust counts as stock
                    for d in citations:
                        slug = _extract_slug(d.get("url", "") or "") or ""
                        if not slug:
                            continue
                        prod = prod_cache.get(slug) or _get_product_meta(conn, slug)
                        if not prod:
                            continue
                        meta = prod.get("meta") or {}
                        color_list = [
                            (x.get("colorName") or "").lower()
                            for x in (meta.get("colors") or [])
                        ]
                        if any(_color_matches(c, name) for name in color_list):
                            size_map = meta.get("sizes") or {}
                            size_names = _ordered_size_names(list(size_map.keys()))
                            if size_names:
                                break

                if not size_names:
                    # We found the color, but no reliable size info -> say it's available
                    lines.append(f"{c.title()} available.")
                    if RAG_DEBUG:
                        debug_notes.append(f"{c}:sizes=none")
                else:
                    note = ""
                    if FEW_LEFT_ENABLED and counts:
                        if any(counts.get(s, 99) <= LOW_STOCK_THRESHOLD for s in size_names):
                            note = " (few left)"
                    lines.append(
                        f"{c.title()} available sizes: {', '.join(size_names)}{note}."
                    )
                    if RAG_DEBUG:
                        debug_notes.append(
                            f"{c}:sizes={size_names},fewLeft={bool(note)}"
                        )

        else:
            wants_overview = _looks_discovery_question(body.query, attrs)
            listed: List[str] = []

            if wants_overview:
                wanted_types = set(attrs.get("types") or [])
                _, __, all_colors_by_slug = await _verify_color_stock_for_citations(
                    citations, [], prod_cache=prod_cache, conn=conn
                )

                anchor_type: Optional[str] = None
                shown, MAX_PRODUCTS = 0, 2

                for d in citations:
                    if shown >= MAX_PRODUCTS:
                        break
                    slug = _extract_slug(d.get("url", "") or "") or ""
                    if not slug:
                        continue
                    prod = prod_cache.get(slug) or (
                        _get_product_meta(conn, slug) if conn else None
                    )
                    if not prod:
                        continue

                    meta = prod.get("meta") or {}
                    ptype = (meta.get("type") or "").lower().strip()
                    if wanted_types:
                        if ptype not in wanted_types:
                            continue
                    else:
                        if anchor_type is None:
                            anchor_type = ptype
                        elif ptype != anchor_type:
                            continue

                    colors_here = all_colors_by_slug.get(slug, [])
                    if colors_here:
                        t_raw = (meta.get("name") or d.get("title", "Product"))
                        t = _clean_title(t_raw)
                        listed.append(
                            f"{t}: {', '.join(sorted({c.title() for c in colors_here}))}."
                        )
                        shown += 1
                        if RAG_DEBUG:
                            debug_notes.append(f"listColors:{t} -> {colors_here}")

            if listed:
                lines.append("Available colors — " + " ".join(listed))

        if not lines:
            short = (data.get("answer", "") or "").strip()
            lines.append(short if short.endswith(".") else short + ".")

        draft_answer = " ".join(lines)

        corrections = await cross_check(draft_answer, citations)
        final_answer = apply_guardrails(draft_answer, corrections)
        emit(
            "verification_done",
            trace_id,
            {"had_corrections": bool(corrections), "corrections": corrections},
        )

        if RAG_DEBUG:
            log.warning("[RAG_DEBUG] composed=%s", final_answer)

        resp: Dict[str, Any] = {"answer": final_answer, "citations": citations}
        if RAG_DEBUG:
            resp["debug"] = {"notes": debug_notes}
        return resp


# ------------------ Canary / eval set for RAG ------------------

_CANARY_QUERIES: List[Dict[str, Any]] = [
    {
        "id": "hoodies_discovery",
        "query": "what hoodies do you have?",
        "top_k": 6,
        "expect_substrings": ["available colors", "hoodie"],
        "forbid_substrings": [],
        "min_citations": 1,
    },
    {
        "id": "hoodie_feature_unknown",
        "query": "Do your hoodies come with built-in headphones?",
        "top_k": 6,
        "expect_substrings": [
            "don’t have that information",
            "similar items",
        ],
        "forbid_substrings": ["yes", "built-in headphones"],
        "min_citations": 1,
    },
    {
        "id": "black_hoodie_sizes",
        "query": "black hoodie available sizes?",
        "top_k": 8,
        "expect_substrings": ["black", "available sizes"],
        "forbid_substrings": [],
        "min_citations": 1,
    },
    {
        "id": "size_fit_route",
        "query": "I am 170 cm and 60 kg, male, I like a slim fit hoodie. Which size should I pick?",
        "top_k": 6,
        "expect_substrings": ["recommend size", "hoodie"],
        "forbid_substrings": [],
        "min_citations": 1,
    },
]


def _eval_canary_case(case: Dict[str, Any], resp: Dict[str, Any]) -> Tuple[bool, List[str]]:
    answer = (resp.get("answer") or "").lower()
    citations = resp.get("citations") or []
    notes: List[str] = []
    ok = True

    for s in case.get("expect_substrings", []) or []:
        if s.lower() not in answer:
            ok = False
            notes.append(f"missing substring: {s!r}")

    for s in case.get("forbid_substrings", []) or []:
        if s.lower() in answer:
            ok = False
            notes.append(f"forbidden substring present: {s!r}")

    min_cit = case.get("min_citations")
    if isinstance(min_cit, int) and len(citations) < min_cit:
        ok = False
        notes.append(f"citations < {min_cit} (got {len(citations)})")

    return ok, notes


@router.post("/ai/rag/canary")
async def rag_canary(limit: int = 0) -> Dict[str, Any]:
    cases = _CANARY_QUERIES[:limit] if limit > 0 else _CANARY_QUERIES
    results: List[Dict[str, Any]] = []
    passed_count = 0

    for case in cases:
        body = RAGIn(query=case["query"], top_k=case.get("top_k", 6))
        resp = await rag_query(body)
        ok, notes = _eval_canary_case(case, resp)
        if ok:
            passed_count += 1
        results.append(
            {
                "id": case["id"],
                "query": case["query"],
                "passed": ok,
                "notes": notes,
                "answer": resp.get("answer"),
                "citations": resp.get("citations", []),
            }
        )

    return {
        "total": len(cases),
        "passed": passed_count,
        "failed": len(cases) - passed_count,
        "results": results,
    }


@router.post("/ai/rag/debug")
async def rag_debug(body: RAGIn):
    with get_conn() as conn:
        attrs = _parse_query_attrs(conn, body.query)
        docs = search_keyword(conn, query=body.query, kind="product", top_k=body.top_k)

        return {
            "count": len(docs),
            "attrs": attrs,
            "docs": [
                {
                    "title": d.get("title", ""),
                    "len": len(d.get("text", "")),
                    "score": float(d.get("score", 0) or 0),
                }
                for d in docs
            ],
        }
