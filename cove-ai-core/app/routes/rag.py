# app/routes/rag.py
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Optional, Dict, List, Tuple
import httpx, json, os, re, logging

from app.providers.llm import LLMClient
from app.vector.store import connect, search_hybrid

# Optional: dynamic vocab (colors/types) from DB; we fallback if not present
try:
    from app.vector.store import catalog_vocab  # optional helper
except Exception:  # pragma: no cover
    catalog_vocab = None  # type: ignore

from app.core.config import OPENAI_API_KEY, EMBED_MODEL, RERANK_MODEL, COHERE_API_KEY

router = APIRouter()
_llm = LLMClient()
_conn = None
log = logging.getLogger("cove.rag")

# ------------------ I/O ------------------

class RAGIn(BaseModel):
    query: str
    top_k: int = 6

# ------------------ Embeddings (async, kept for completeness) ------------------

EMBED_MODEL = os.getenv("EMBED_MODEL","openrouter:openai/text-embedding-3-small")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY","")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY","")
COHERE_API_KEY = os.getenv("COHERE_API_KEY","")

async def embed(texts: list[str]) -> list[list[float]]:
    if EMBED_MODEL.startswith("openrouter:"):
        model = EMBED_MODEL.split("openrouter:",1)[1]
        url = "https://openrouter.ai/api/v1/embeddings"
        headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type":"application/json"}
        payload = {"model": model, "input": texts}
    elif EMBED_MODEL.startswith("cohere:"):
        model = EMBED_MODEL.split("cohere:",1)[1]
        url = "https://api.cohere.ai/v1/embed"
        headers = {"Authorization": f"Bearer {COHERE_API_KEY}", "Content-Type":"application/json"}
        payload = {"model": model, "texts": texts}
    else:
        model = EMBED_MODEL.split("openai:",1)[1] if EMBED_MODEL.startswith("openai:") else EMBED_MODEL
        url = "https://api.openai.com/v1/embeddings"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type":"application/json"}
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
    if not COHERE_API_KEY or not docs:
        return docs
    try:
        async with httpx.AsyncClient(timeout=15) as cx:
            r = await cx.post(
                "https://api.cohere.ai/v1/rerank",
                headers={"Authorization": f"Bearer {COHERE_API_KEY}","Content-Type":"application/json"},
                json={"model": RERANK_MODEL or "rerank-3","query": query,"documents": [d.get("text","") for d in docs]},
            )
        r.raise_for_status()
        order = [x["index"] for x in r.json().get("results", [])]
        return [docs[i] for i in order] if order else docs
    except Exception as e:
        log.warning("Cohere rerank skipped: %s", e)
        return docs

# ------------------ Helpers ------------------

def _fallback_cites(docs: list[dict]) -> list[dict]:
    return [{"title": d.get("title",""), "url": d.get("url",""), "score": float(d.get("score",0))} for d in docs]

def _normalize_citations(raw: Any, docs: list[dict]) -> list[dict]:
    if isinstance(raw, list) and raw and isinstance(raw[0], dict) and "title" in raw[0]:
        return raw
    idxs = []
    for x in (raw or []):
        if isinstance(x, int):
            idxs.append(x - 1)
        elif isinstance(x, str):
            m = re.search(r"\[(\d+)\]", x)
            if m: idxs.append(int(m.group(1)) - 1)
    out = []
    for i in idxs:
        if 0 <= i < len(docs):
            d = docs[i]
            out.append({"title": d.get("title",""), "url": d.get("url",""), "score": float(d.get("score",0))})
    return out or _fallback_cites(docs)

def _clip(txt: str, n: int = 1200) -> str:
    return txt[:n] + ("..." if len(txt) > n else "")

def _extract_slug(url: str) -> Optional[str]:
    # expects "/product/<slug>"
    if not url: return None
    m = re.search(r"/product/([^?\s]+)", url)
    return m.group(1) if m else None

# ------------------ Dynamic vocab & intent ------------------

_SIZES = {"XS","S","M","L","XL","XXL"}

# under Dynamic vocab & intent
_COMMON_COLOR_WORDS = {
    "black","white","gray","grey","cream","beige",
    "red","maroon","crimson","pink","hotpink","rose",
    "orange","amber","yellow","gold","mustard",
    "green","lime","olive","teal",
    "blue","navy","azure","cyan",
    "purple","violet","lavender","magenta"
}

def _get_vocab(conn) -> Dict[str, set]:
    if catalog_vocab:
        v = catalog_vocab(conn)
        return {
            "colors": set(v.get("colors", set())) | _COMMON_COLOR_WORDS,  # <-- merge
            "types": set(v.get("types", set())),
            "sizes": _SIZES,
        }
    # fallback
    colors, types = set(), set()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT lower(c->>'colorName')
            FROM ai_core.docs, jsonb_array_elements(meta->'colors') c
            WHERE kind='product'
        """)
        colors = {r[0] for r in cur.fetchall() if r[0]}
        cur.execute("""
            SELECT DISTINCT lower(COALESCE(meta->>'type', split_part(lower(title),' ',1)))
            FROM ai_core.docs
            WHERE kind='product'
        """)
        types = {r[0] for r in cur.fetchall() if r[0]}
    return {"colors": colors | _COMMON_COLOR_WORDS, "types": types, "sizes": _SIZES}  # <-- merge here

def _parse_query_attrs(conn, q: str) -> Dict[str, List[str]]:
    v = _get_vocab(conn)
    raw = re.findall(r"[a-zA-Z]+", q.lower())
    toks = set(raw)
    colors = sorted({t for t in toks if t in v["colors"]})
    if "hot" in toks and "pink" in toks:
        colors.append("hotpink")
    sizes  = sorted({t.upper() for t in toks if t.upper() in v["sizes"]})
    types  = sorted({t for t in toks if t in v["types"]})
    return {"colors": colors, "sizes": sizes, "types": types}


def _ask_shrinkage(q: str) -> bool:
    ql = q.lower()
    return any(w in ql for w in ("shrink", "shrinkage", "wash", "washing", "dryer", "drying"))

# ------------------ Catalog fetchers (verified stock & colors) ------------------

async def _fetch_product(http: httpx.AsyncClient, slug: str) -> Optional[dict]:
    try:
        r = await http.get("http://127.0.0.1:8000/ai/tools/product.get", params={"slug": slug})
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        log.warning("product.get failed for %s: %s", slug, e)
    return None

async def _verify_color_stock_for_citations(
    citations: list[dict],
    colors: List[str],
    *,
    prod_cache: Dict[str, dict] | None = None,
) -> Tuple[Dict[str, bool], Dict[str, Dict[str,int]], Dict[str, List[str]]]:
    """
    Returns:
      available: {color -> bool}
      color_sizes: {color -> {size -> stock}}
      all_colors_by_slug: {slug -> [colorName, ...]}
    """
    available = {c: False for c in colors}
    color_sizes: Dict[str, Dict[str,int]] = {c: {} for c in colors}
    all_colors_by_slug: Dict[str, List[str]] = {}
    prod_cache = prod_cache or {}

    async with httpx.AsyncClient(timeout=10) as cx:
        for d in citations:
            slug = _extract_slug(d.get("url","")) or ""
            if not slug:
                continue
            if slug in prod_cache:
                prod = prod_cache[slug]
            else:
                prod = await _fetch_product(cx, slug)
                if prod:
                    prod_cache[slug] = prod
            if not prod:
                continue

            meta = prod.get("meta") or {}
            color_list = [ (c.get("colorName") or "").lower() for c in (meta.get("colors") or []) ]
            all_colors_by_slug[slug] = [c for c in color_list if c]

            for col in colors:
                if col.lower() in color_list:
                    available[col] = True
                    sizes = meta.get("sizes") or {}
                    # keep only known sizes with ints
                    filt = {}
                    for k, v in sizes.items():
                        ku = k.upper()
                        if ku in _SIZES:
                            try:
                                filt[ku] = int(v)
                            except Exception:
                                continue
                    color_sizes[col].update(filt)

    return available, color_sizes, all_colors_by_slug

# ------------------ RAG endpoints ------------------

@router.post("/ai/rag/query")
async def rag_query(body: RAGIn):
    global _conn
    _conn = _conn or connect()

    # Attribute hints
    attrs = _parse_query_attrs(_conn, body.query)  # {"colors":[],"sizes":[],"types":[]}
    ask_shrink = _ask_shrinkage(body.query)

    # Hybrid retrieval with attrs
    try:
        docs = search_hybrid(_conn, query=body.query, kind="product", top_k=body.top_k, attrs=attrs)  # type: ignore
    except TypeError:
        docs = search_hybrid(_conn, query=body.query, kind="product", top_k=body.top_k)

    if not docs:
        return {"answer": "I don’t have product data for that yet. Please sync the catalog and try again.", "citations": []}

    # Optional rerank
    docs = (await rerank(body.query, docs))[:body.top_k]

    # Build context
    ctx = "\n\n".join([f"[{i+1}] {d['title']}\n{_clip(d.get('text',''))}" for i, d in enumerate(docs)])

    # Model draft (single short sentence, context-only)
    sys = (
        "You are Cove AI. Use ONLY the provided context. If the context doesn't contain the information, reply with 'Unknown'. "
        "Return STRICT JSON: {answer: string, citations: array}. The 'answer' must be a single short sentence."
    )
    messages = [
        {"role":"system","content":sys},
        {"role":"user","content":f"Question: {body.query}\n\nContext (cite by [index]):\n{ctx}\n\nRespond as JSON."}
    ]
    out = await _llm.generate(messages)
    try:
        data = json.loads(out)
    except Exception:
        data = {"answer": out, "citations": _fallback_cites(docs)}

    # Normalize citations
    citations = _normalize_citations(data.get("citations"), docs)

    # -------- Verified composition --------
    lines: List[str] = []
    prod_cache: Dict[str, dict] = {}

    # Shrinkage line
    if ask_shrink:
        if "shrink" in ctx.lower():
            first = data.get("answer","").split(".")[0].strip()
            shrink_line = first if first else "Unknown"
        else:
            shrink_line = "Shrinkage: not stated in catalog."
        lines.append(shrink_line if shrink_line.endswith(".") else shrink_line + ".")

    # Color/stock lines if specific colors requested
    colors = attrs.get("colors", [])
    if colors:
        available, color_sizes, _ = await _verify_color_stock_for_citations(citations, colors, prod_cache=prod_cache)
        for c in colors:
            if available.get(c):
                sizes = color_sizes.get(c, {})
                order = ["XS","S","M","L","XL","XXL"]
                sized = [f"{k}({sizes[k]})" for k in order if k in sizes]
                sizes_str = ", ".join(sized) if sized else "sizes not listed"
                lines.append(f"{c.title()} in stock: {sizes_str}.")
            else:
                lines.append(f"{c.title()} not found in cited products.")
    else:
        # No color requested: list **matching type** colors for top products
        wanted_types = set(attrs.get("types") or [])
        # verify per-citation colors (and cache product)
        _, __, all_colors_by_slug = await _verify_color_stock_for_citations(citations, [], prod_cache=prod_cache)

        listed: List[str] = []
        shown = 0
        MAX_PRODUCTS = 2  # keep UX crisp

        async with httpx.AsyncClient(timeout=10) as cx:
            for d in citations:
                if shown >= MAX_PRODUCTS:
                    break
                slug = _extract_slug(d.get("url","")) or ""
                if not slug:
                    continue
                prod = prod_cache.get(slug)
                if not prod:
                    prod = await _fetch_product(cx, slug)
                    if prod:
                        prod_cache[slug] = prod
                if not prod:
                    continue

                meta = prod.get("meta") or {}
                ptype = (meta.get("type") or "").lower()
                if wanted_types and ptype not in wanted_types:
                    continue  # skip non-matching types if user asked for a type

                colors_here = all_colors_by_slug.get(slug, [])
                if colors_here:
                    t = d.get("title","Product")
                    # dedup and pretty-case
                    listed.append(f"{t}: {', '.join(sorted({c.title() for c in colors_here}))}.")
                    shown += 1

        if listed:
            lines.append("Available colors — " + " ".join(listed))

    # Fallback: if no specific info was needed, keep model’s sentence
    if not lines:
        short = data.get("answer","").strip()
        lines.append(short if short.endswith(".") else short + ".")

    answer = " ".join(lines)
    return {"answer": answer, "citations": citations}


@router.post("/ai/rag/debug")
async def rag_debug(body: RAGIn):
    global _conn
    _conn = _conn or connect()

    attrs = _parse_query_attrs(_conn, body.query)
    try:
        docs = search_hybrid(_conn, query=body.query, kind="product", top_k=body.top_k, attrs=attrs)  # type: ignore
    except TypeError:
        docs = search_hybrid(_conn, query=body.query, kind="product", top_k=body.top_k)

    return {
        "count": len(docs),
        "attrs": attrs,
        "docs": [{"title": d["title"], "len": len(d["text"]), "score": d["score"]} for d in docs]
    }
