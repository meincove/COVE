# app/cove_ai_tools/size_fit.py

from __future__ import annotations

from typing import Any, Dict
import os
import logging

import httpx

log = logging.getLogger("cove.tools.size_fit")

FIT_BASE_URL = os.getenv("FIT_BASE_URL", "http://127.0.0.1:8000")


async def get_size_fit_advice(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tool wrapper for Cove's size & fit engine.

    Expected payload keys (matching /ai/fit/recommend):
      - gender (optional)
      - height_cm (float)
      - weight_kg (float)
      - fit_preference (str)
      - product_type (str | None)
      - slug (str | None)

    Returns:
      A dict with fields like:
        - size (e.g. "M")
        - confidence (0..1)
        - notes (list[str])
        - citations (list[...])
    """
    url = f"{FIT_BASE_URL.rstrip('/')}/ai/fit/recommend"

    async with httpx.AsyncClient(timeout=8) as cx:
        r = await cx.post(url, json=payload)

    r.raise_for_status()
    data = r.json()

    if not isinstance(data, dict):
        raise ValueError(f"Unexpected size_fit response type: {type(data)}")

    return data
