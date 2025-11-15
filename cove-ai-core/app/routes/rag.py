# app/routes/rag.py
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Optional, Dict, List, Tuple
import httpx, json, os, re, logging
import asyncio

from app.providers.llm import LLMClient
from app.vector.store import connect, search_hybrid
from app.agent.orchestrator import classify
from app.agent.verify import cross_check, apply_guardrails
from app.telemetry.trace import new_trace_id, emit
from app.vector.store import search_keyword
from app.core.rerank import mmr_rerank_from_vectors

# Optional: dynamic vocab (colors/types) from DB; we fallback if not present
try:
    from app.vector.store import catalog_vocab  # optional helper
except Exception:  # pragma: no cover
    catalog_vocab = None  # type: ignore

from app.core.config import OPENAI_API_KEY, EMBED_MODEL, RERANK_MODEL, COHERE_API_KEY
RAG_DEBUG = os.getenv("RAG_DEBUG", "false").lower() == "true"

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
    # Short-circuit via env
    if os.getenv("DISABLE_RERANK", "false").lower() == "true":
        return docs
    if not COHERE_API_KEY or not docs:
        return docs
    try:
        async with httpx.AsyncClient(timeout=15) as cx:
            r = await cx.post(
                "https://api.cohere.ai/v1/rerank",
                headers={"Authorization": f"Bearer {COHERE_API_KEY}", "Content-Type": "application/json"},
                json={"model": RERANK_MODEL or "rerank-3", "query": query, "documents": [d.get("text","") for d in docs]},
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

def _strip_code_fences(s: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers if present."""
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.S).strip()
    return s

def _get_product_meta(conn, slug: str) -> Optional[dict]:
    """Fetch product title+meta by slug directly from ai_core.docs to avoid loopback HTTP."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT title, meta
            FROM ai_core.docs
            WHERE kind='product' AND meta->>'slug' = %s
            LIMIT 1
        """, (slug,))
        row = cur.fetchone()
    if not row:
        return None
    title, meta = row
    return {
        "title": title or (meta.get("name") if isinstance(meta, dict) else ""),
        "url": f"/product/{slug}",
        "price": (meta.get("price") if isinstance(meta, dict) else None),
        "meta": meta or {}
    }

_TITLE_PAREN_RE = re.compile(r"\s*\([^)]*\)\s*$")

def _clean_title(t: str) -> str:
    """Remove trailing parentheticals like ' (100% Cotton)' to keep titles tidy."""
    return _TITLE_PAREN_RE.sub("", (t or "").strip())

def _ordered_size_names(names: List[str]) -> List[str]:
    order = ["XS","S","M","L","XL","XXL"]
    have = {n.upper() for n in names}
    return [s for s in order if s in have]
    

# ------------------ Dynamic vocab & intent ------------------

_SIZES = {"XS","S","M","L","XL","XXL"}

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
            "colors": set(v.get("colors", set())) | _COMMON_COLOR_WORDS,
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
    return {"colors": colors | _COMMON_COLOR_WORDS, "types": types, "sizes": _SIZES}

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
    conn=None,  # pass DB conn to avoid loopback HTTP
) -> Tuple[Dict[str, bool], Dict[str, Dict[str,int]], Dict[str, List[str]]]:
    """
    Returns:
      available: {color -> bool}
      color_sizes: {color -> {size -> stock}}   # ONLY when confidently stock (small ints)
      all_colors_by_slug: {slug -> [colorName, ...]}
    """
    available = {c: False for c in colors}
    color_sizes: Dict[str, Dict[str,int]] = {c: {} for c in colors}
    all_colors_by_slug: Dict[str, List[str]] = {}
    prod_cache = prod_cache or {}

    for d in citations:
        slug = _extract_slug(d.get("url","")) or ""
        if not slug:
            continue

        # 1) cache, 2) DB, 3) (optional) loopback HTTP
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
            if col.lower() not in color_list:
                continue

            available[col] = True
            sizes = meta.get("sizes") or {}

            # ---------- Decide if sizes look like STOCK (small non-negative INTs) vs PRICES ----------
            checked_any = False
            any_decimal = False
            all_intlike = True
            int_values: List[int] = []

            for k, v in sizes.items():
                ku = (k or "").upper()
                if ku not in _SIZES:
                    continue
                checked_any = True

                # numeric types: floats => price, large ints => likely price code/size chart
                if isinstance(v, float):
                    any_decimal = True
                    all_intlike = False
                    break
                if isinstance(v, int):
                    iv = v
                else:
                    s = str(v).strip()
                    # reject decimals or comma-decimals outright
                    if "." in s or "," in s:
                        any_decimal = True
                        all_intlike = False
                        break
                    if not s.isdigit():  # negatives or non-numeric
                        all_intlike = False
                        break
                    iv = int(s)

                int_values.append(iv)

            # conservative cap for per-variant stock
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
                            # re-parse strictly to int
                            iv = int(v) if isinstance(v, int) else int(str(v).strip())
                            if 0 <= iv <= 50:
                                filt[ku] = iv
                        except Exception:
                            continue

            color_sizes[col].update(filt)

    if RAG_DEBUG:
        log.warning("[RAG_DEBUG] color_sizes=%s", color_sizes)

    return available, color_sizes, all_colors_by_slug




@router.post("/ai/rag/query")
async def rag_query(body: RAGIn):
    global _conn
    _conn = _conn or connect()
    trace_id = new_trace_id()

    # --- small localized helper for nicer "Unknown" UX ---
    def _friendly_unknown(reason: str = "", *, attrs: Dict[str, List[str]] | None = None) -> str:
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
            return "We couldn’t complete the answer right now, but here are the closest matches."
        return "We couldn’t find that in the catalog."

    # Parse attrs (colors, sizes, types) and classify intent
    attrs = _parse_query_attrs(_conn, body.query)
    ask_shrink = _ask_shrinkage(body.query)
    intent = classify(body.query, attrs)
    emit("query_received", trace_id, {"q": body.query, "attrs": attrs, "intent": intent.kind})

    USE_KEYWORD_ONLY = os.getenv("DISABLE_EMBEDDING", "false").lower() == "true"
    RAG_DEBUG = os.getenv("RAG_DEBUG", "false").lower() == "true"

    try:
        if USE_KEYWORD_ONLY:
            docs = search_keyword(_conn, query=body.query, kind="product", top_k=body.top_k)
        else:
            docs = search_hybrid(_conn, query=body.query, kind="product", top_k=body.top_k, attrs=attrs)  # type: ignore
    except TypeError:
        # legacy signature
        docs = search_keyword(_conn, query=body.query, kind="product", top_k=body.top_k) if USE_KEYWORD_ONLY \
            else search_hybrid(_conn, query=body.query, kind="product", top_k=body.top_k)

    emit("retrieval_done", trace_id, {
        "count": len(docs),
        "top_titles": [d.get("title","") for d in docs[:5]],
        "scores": [float(d.get("score",0) or 0) for d in docs[:5]],
    })

    # -------- Soft type gate to avoid misleading answers --------
    catalog_types = _get_vocab(_conn)["types"]
    tokens = set(re.findall(r"[a-zA-Z]+", body.query.lower()))
    mentioned_types = sorted({t for t in tokens if t in catalog_types})

    if not mentioned_types:
        # If user mentions some type-like word not in catalog, bail out early.
        maybe_type = max((t for t in tokens if t not in _COMMON_COLOR_WORDS), key=len, default="")
        if maybe_type and maybe_type not in catalog_types:
            return {"answer": _friendly_unknown("ood_type", attrs=attrs), "citations": _fallback_cites(docs)}

    if attrs.get("types"):
        first_type: Optional[str] = None
        for d in docs:
            slug = _extract_slug(d.get("url","") or "") or ""
            if not slug:
                continue
            prod = _get_product_meta(_conn, slug)
            if prod:
                first_type = (prod.get("meta", {}).get("type") or "").lower().strip()
                break
        if first_type and first_type not in set(attrs["types"]):
            return {"answer": _friendly_unknown("ood_type", attrs=attrs), "citations": _fallback_cites(docs)}

    if not docs:
        return {"answer": _friendly_unknown("no_docs", attrs=attrs), "citations": []}

    # Optional rerank
    reranked = await rerank(body.query, docs)
    emit("rerank_applied" if reranked is not docs else "rerank_skipped", trace_id, {})
    docs = reranked[:body.top_k]

    # Build short context
    ctx = "\n\n".join([
        f"[{i+1}] {_clean_title(d['title'])}\n{_clip(d.get('text',''))}"
        for i, d in enumerate(docs)
    ])

    # Single-sentence draft (context-only)
    sys = (
        "You are Cove AI. Use ONLY the provided context. If the context doesn't contain the information, reply with 'Unknown'. "
        "Return STRICT JSON: {answer: string, citations: array}. The 'answer' must be a single short sentence."
    )
    messages = [
        {"role":"system","content":sys},
        {"role":"user","content":f"Question: {body.query}\n\nContext (cite by [index]):\n{ctx}\n\nRespond as JSON."}
    ]

    # ---- LLM draft (offline-safe & bounded) ----
    if os.getenv("LLM_OFFLINE", "false").lower() == "true":
        data = {"answer": _friendly_unknown("llm_fail", attrs=attrs), "citations": _fallback_cites(docs)}
    else:
        _llm_timeout = int(os.getenv("LLM_HARD_TIMEOUT_SECS", "12"))
        _llm_bypass  = os.getenv("LLM_BYPASS_ON_FAIL", "false").lower() == "true"
        try:
            out = await asyncio.wait_for(_llm.generate(messages), timeout=_llm_timeout)
        except (asyncio.TimeoutError, httpx.ReadTimeout) as e:
            log.warning("LLM timeout: %s", e)
            if _llm_bypass:
                data = {"answer": _friendly_unknown("llm_fail", attrs=attrs), "citations": _fallback_cites(docs)}
            else:
                return {"answer": "Sorry—our language model timed out. Here are the top matches.", "citations": _fallback_cites(docs)}
        except Exception as e:
            log.warning("LLM generate failed: %s", e)
            if _llm_bypass:
                data = {"answer": _friendly_unknown("llm_fail", attrs=attrs), "citations": _fallback_cites(docs)}
            else:
                return {"answer": "Sorry—having trouble reaching the language model. Here are the top matches.", "citations": _fallback_cites(docs)}
        else:
            raw = _strip_code_fences(out)
            try:
                data = json.loads(raw)
            except Exception:
                data = {"answer": out, "citations": _fallback_cites(docs)}

    # Normalize citations
    citations = _normalize_citations(data.get("citations"), docs)

    # -------- Verified composition (shrinkage + colors/sizes) --------
    lines: List[str] = []
    prod_cache: Dict[str, dict] = {}

    # Shrinkage line (never guess)
    if ask_shrink:
        if "shrink" in ctx.lower():
            first = (data.get("answer","") or "").split(".")[0].strip()
            shrink_line = first if first else _friendly_unknown("shrink", attrs=attrs)
        else:
            shrink_line = "Shrinkage: not stated in catalog."
        lines.append(shrink_line if shrink_line.endswith(".") else shrink_line + ".")

    # ---- Color/stock section (NO RAW COUNTS IN OUTPUT) ----
    FEW_LEFT_ENABLED    = os.getenv("FEW_LEFT_ENABLED", "false").lower() == "true"
    LOW_STOCK_THRESHOLD = int(os.getenv("LOW_STOCK_THRESHOLD", "3"))

    debug_notes: List[str] = []   # optional breadcrumbs
    colors = attrs.get("colors", [])

    def _sanitize_counts(raw: Dict[str, Any]) -> Dict[str, int]:
        """Keep only integer stock counts in [0,100]; drop floats like 19.99."""
        if not raw:
            return {}
        out: Dict[str, int] = {}
        for k, v in raw.items():
            ku = (k or "").upper()
            if ku not in ("XS","S","M","L","XL","XXL"):
                continue
            try:
                s = str(v).strip()
                if "." in s or "," in s:
                    continue  # looks like a price, not stock
                iv = int(v)
                if 0 <= iv <= 100:
                    out[ku] = iv
            except Exception:
                continue
        return out

    if colors:
        available, color_sizes, _ = await _verify_color_stock_for_citations(
            citations, colors, prod_cache=prod_cache, conn=_conn
        )
        for c in colors:
            if not available.get(c):
                lines.append(f"{c.title()} not found in cited products.")
                if RAG_DEBUG: debug_notes.append(f"{c}:not_available")
                continue

            # we only use counts internally for "(few left)" signal; never display numbers
            counts_raw = color_sizes.get(c, {}) or {}
            counts = _sanitize_counts(counts_raw)

            # figure out ordered size names
            size_names: List[str] = []
            if counts:
                ordered = ["XS","S","M","L","XL","XXL"]
                size_names = [s for s in ordered if s in counts] or list(counts.keys())
            else:
                # names-only fallback from cited product meta
                for d in citations:
                    slug = _extract_slug(d.get("url","") or "") or ""
                    if not slug:
                        continue
                    prod = prod_cache.get(slug) or (_get_product_meta(_conn, slug) if _conn else None)
                    if not prod:
                        continue
                    meta = prod.get("meta") or {}
                    color_list = [(x.get("colorName") or "").lower() for x in (meta.get("colors") or [])]
                    if c.lower() in color_list:
                        size_map = meta.get("sizes") or {}
                        size_names = _ordered_size_names(list(size_map.keys()))
                        if size_names:
                            break

            if not size_names:
                lines.append(f"{c.title()} available.")
                if RAG_DEBUG: debug_notes.append(f"{c}:sizes=none")
            else:
                note = ""
                if FEW_LEFT_ENABLED and counts:
                    # mark few-left if any size count <= threshold
                    if any(counts.get(s, 99) <= LOW_STOCK_THRESHOLD for s in size_names):
                        note = " (few left)"
                lines.append(f"{c.title()} available sizes: {', '.join(size_names)}{note}.")
                if RAG_DEBUG: debug_notes.append(f"{c}:sizes={size_names},fewLeft={bool(note)}")
    else:
        # No color specified → list colors per product (type-restricted), names only
        wanted_types = set(attrs.get("types") or [])
        _, __, all_colors_by_slug = await _verify_color_stock_for_citations(
            citations, [], prod_cache=prod_cache, conn=_conn
        )

        anchor_type: Optional[str] = None
        listed: List[str] = []
        shown, MAX_PRODUCTS = 0, 2

        for d in citations:
            if shown >= MAX_PRODUCTS:
                break
            slug = _extract_slug(d.get("url","") or "") or ""
            if not slug:
                continue
            prod = prod_cache.get(slug) or (_get_product_meta(_conn, slug) if _conn else None)
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
                t_raw = (meta.get("name") or d.get("title","Product"))
                t = _clean_title(t_raw)
                listed.append(f"{t}: {', '.join(sorted({c.title() for c in colors_here}))}.")
                shown += 1
                if RAG_DEBUG: debug_notes.append(f"listColors:{t} -> {colors_here}")

        if listed:
            lines.append("Available colors — " + " ".join(listed))

    # If nothing special requested, keep model’s sentence
    if not lines:
        short = (data.get("answer","") or "").strip()
        lines.append(short if short.endswith(".") else short + ".")

    draft_answer = " ".join(lines)

    # ===== Numeric/entity verifier (prices/sizes) =====
    corrections = await cross_check(draft_answer, citations)
    final_answer = apply_guardrails(draft_answer, corrections)
    emit("verification_done", trace_id, {"had_corrections": bool(corrections), "corrections": corrections})

    if RAG_DEBUG:
        log.warning("[RAG_DEBUG] composed=%s", final_answer)

    resp: Dict[str, Any] = {"answer": final_answer, "citations": citations}
    if RAG_DEBUG:
        # attach notes if we created them above
        resp["debug"] = {"notes": debug_notes}
    return resp


@router.post("/ai/rag/debug")
async def rag_debug(body: RAGIn):
    global _conn
    _conn = _conn or connect()

    attrs = _parse_query_attrs(_conn, body.query)
    # Always pure keyword here so no external HTTP happens
    docs = search_keyword(_conn, query=body.query, kind="product", top_k=body.top_k)

    return {
        "count": len(docs),
        "attrs": attrs,
        "docs": [{
            "title": d.get("title",""),
            "len": len(d.get("text","")),
            "score": float(d.get("score", 0) or 0)
        } for d in docs]
    }
