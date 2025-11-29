# app/nlp/ordinals.py
from __future__ import annotations

import os
import re
from typing import Optional, Dict

# Base English mapping. This is *language config*, not business logic.
# You can later move this to a JSON/YAML config or env if you want.
_BASE_ORDINAL_WORDS: Dict[str, int] = {
    "first": 1,
    "second": 2,
    "third": 3,
    "fourth": 4,
    "fifth": 5,
    "sixth": 6,
    "seventh": 7,
    "eighth": 8,
    "ninth": 9,
    "tenth": 10,
}

def _load_extra_ordinal_words() -> Dict[str, int]:
    """
    Optional: load overrides/additions from env so you can extend
    per-deployment or per-language without touching code.

    Example env:
      ORDINAL_WORDS_JSON='{"11th": 11, "eleventh": 11}'
    """
    raw = os.getenv("ORDINAL_WORDS_JSON", "").strip()
    if not raw:
        return {}
    try:
        import json  # local import to avoid spreading deps
        data = json.loads(raw)
        out: Dict[str, int] = {}
        for k, v in data.items():
            try:
                n = int(v)
            except Exception:
                continue
            if n >= 1:
                out[k.lower()] = n
        return out
    except Exception:
        return {}


# Single merged map that can be reused anywhere
ORDINAL_WORDS: Dict[str, int] = {
    **{k.lower(): v for k, v in _BASE_ORDINAL_WORDS.items()},
    **_load_extra_ordinal_words(),
}


def parse_ordinal_from_text(text: str) -> Optional[int]:
    """
    Parse things like:
      - 'second product'
      - '3rd option'
      - 'product 2'
      - 'the first and third items' (returns the first match: 0)

    Returns a zero-based index or None if nothing recognized.
    """
    if not text:
        return None
    ql = text.lower()

    # 1) Word-based ordinals: first, second, third, ...
    for word, one_based in ORDINAL_WORDS.items():
        if re.search(rf"\b{re.escape(word)}\b", ql):
            return one_based - 1

    # 2) Numeric ordinals: 1st, 2nd, 3rd, 4th, ...
    m = re.search(r"\b(\d+)(st|nd|rd|th)\b", ql)
    if m:
        try:
            n = int(m.group(1))
            if n >= 1:
                return n - 1
        except ValueError:
            pass

    # 3) Plain numbers after 'product/item/option': 'product 2'
    m2 = re.search(r"\b(?:product|item|option)\s+(\d+)\b", ql)
    if m2:
        try:
            n = int(m2.group(1))
            if n >= 1:
                return n - 1
        except ValueError:
            pass

    return None
