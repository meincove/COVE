# app/cove_ai_tools/recommendations.py
from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict


import logging

import httpx

from app.config import COVE_CORE_BASE_URL

log = logging.getLogger("cove.tools.recs")


class RecommendProductsInput(TypedDict, total=False):
    """
    Input contract for product recommendations.

    Mirrors what /ai/recs/suggest expects today:
    - query: free-text query or rec_query
    - filters: structured filters (tier, type, color, size, price, etc.)
    - top_k: max number of items to return
    """
    query: str
    filters: Dict[str, Any]
    top_k: int


class RecommendProductItem(TypedDict, total=False):
    """
    One recommended product variant.

    Keys should follow the recs JSON you already use in the frontend.
    You can tighten this later as the schema stabilises.
    """
    variantId: Optional[str]
    slug: Optional[str]
    name: Optional[str]
    tier: Optional[str]
    type: Optional[str]
    color: Optional[str]
    size: Optional[str]
    price: Optional[float]
    score: Optional[float]
    reason: Optional[str]
    url: Optional[str]


class RecommendProductsOutput(TypedDict):
    items: List[RecommendProductItem]


async def recommend_products(
    params: RecommendProductsInput,
) -> RecommendProductsOutput:
    """
    Tool-style wrapper around /ai/recs/suggest.

    This is the canonical entrypoint for recommendations inside Cove AI.

    Later:
      - MCP will expose this as `cove.recommend_products`.
      - The agent (or code-exec) will call this via MCP or directly.
    """
    base = COVE_CORE_BASE_URL.rstrip("/")
    url = f"{base}/ai/recs/suggest"

    try:
        async with httpx.AsyncClient(timeout=10) as cx:
            resp = await cx.post(url, json=params)
    except Exception as e:
        log.warning("recommend_products HTTP error: %s", e)
        return {"items": []}

    if resp.status_code != 200:
        log.warning(
            "recommend_products non-200 %s: %s",
            resp.status_code,
            resp.text,
        )
        return {"items": []}

    try:
        data = resp.json()
    except Exception:
        log.warning("recommend_products: invalid JSON response")
        return {"items": []}

    raw_items = data.get("items") or []
    if not isinstance(raw_items, list):
        return {"items": []}

    items: List[RecommendProductItem] = []
    for it in raw_items:
        if isinstance(it, dict):
            items.append(it)  # type: ignore[list-item]

    return {"items": items}
