# app/agent/verify.py
from __future__ import annotations
from typing import Dict, List, Optional, Tuple
import re
import httpx

_PRICE_RE = re.compile(r"(?<!\d)(\d{1,4}(?:\.\d{1,2})?)")
_SIZE_TOKS = {"XS","S","M","L","XL","XXL"}

def extract_entities(answer_text: str) -> Dict[str, List[str]]:
    text = answer_text or ""
    prices = _PRICE_RE.findall(text)
    sizes = [tok for tok in re.findall(r"[A-Z]{1,3}", text) if tok in _SIZE_TOKS]
    # colors: naive lowercase words; orchestrator/rag already parsed colors from query though
    colors = [t for t in re.findall(r"[a-z]+", text.lower()) if t.isalpha()]
    return {"prices": prices, "sizes": sizes, "colors": colors}

async def _get_product(slug: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            r = await cx.get("http://127.0.0.1:8000/ai/tools/product.get", params={"slug": slug})
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return None

def _extract_slug(url: str) -> Optional[str]:
    m = re.search(r"/product/([^?\s]+)", url or "")
    return m.group(1) if m else None

async def cross_check(answer_text: str, citations: List[dict]) -> Dict[str, str]:
    """
    Returns mapping of 'incorrect_fragment' -> 'correct_fragment'
    (for prices and size availability). If we cannot verify, we won't correct.
    """
    ents = extract_entities(answer_text)
    price_corrections: Dict[str,str] = {}
    size_guard: Dict[str,str] = {}

    # Load cited products
    products = []
    for c in citations:
        slug = _extract_slug(c.get("url","") or "")
        if not slug: 
            continue
        prod = await _get_product(slug)
        if prod:
            products.append(prod)

    # Price verification: if answer mentions a price, ensure it matches any cited product price
    catalog_prices = { str(p.get("price")) for p in products if p.get("price") is not None }
    if catalog_prices:
        for pr in ents["prices"]:
            # allow minor formatting differences; we just replace if mismatch
            if pr not in catalog_prices:
                # choose a representative catalog price (if multiple, first)
                price_corrections[pr] = next(iter(catalog_prices))

    # Size guard: if answer lists size tokens, make sure they exist in at least one cited product
    catalog_sizes = set()
    for p in products:
        meta = p.get("meta") or {}
        sizes = meta.get("sizes") or {}
        catalog_sizes |= {k.upper() for k in sizes.keys()}
    for s in ents["sizes"]:
        if catalog_sizes and s not in catalog_sizes:
            size_guard[s] = ""  # signal removal

    corrections = {}
    corrections.update({k: f"{v}" for k,v in price_corrections.items()})
    corrections.update(size_guard)
    return corrections

def apply_guardrails(answer: str, corrections: Dict[str, str]) -> str:
    out = answer
    for wrong, right in corrections.items():
        if right == "":
            # remove stray token (size not in catalog)
            out = re.sub(rf"\b{re.escape(wrong)}\b", "", out)
        else:
            out = re.sub(rf"\b{re.escape(wrong)}\b", right, out)
    # clean double spaces from removals
    out = re.sub(r"\s{2,}", " ", out).strip()
    return out
