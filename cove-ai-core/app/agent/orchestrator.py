# app/agent/orchestrator.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import re

@dataclass
class Intent:
    kind: str  # 'lookup_product' | 'size_fit' | 'policy' | 'multi' | 'unknown'
    subqueries: Optional[List[str]] = None
    attrs: Optional[Dict[str, List[str]]] = None

_POLICY_KEYS = (
    "return", "refund", "shipping", "delivery", "dispatch", "tax", "customs",
    "vat", "duty", "warranty", "privacy", "gdpr", "cancel", "cancellation"
)
_SIZE_FIT_KEYS = (
    "size", "fit", "tight", "loose", "regular", "measure", "measurement",
    "height", "weight", "cm", "kg", "inches", "lbs"
)

def _looks_multi(q: str) -> bool:
    # crude: looks like two questions or contains two major topics
    return bool(re.search(r"\?\s+\w|\band\b.*\b(what|do|is|are|how)\b", q.lower()))

def _split_multi(q: str) -> List[str]:
    # very simple splitter on ' and ' and '?'
    parts = [p.strip() for p in re.split(r"\?\s+| and ", q) if p.strip()]
    return parts[:4]  # guardrail

def classify(query: str, attrs: Dict[str, List[str]]) -> Intent:
    q = query.lower()
    # policy?
    if any(k in q for k in _POLICY_KEYS):
        return Intent(kind="policy", attrs=attrs)
    # size/fit?
    if any(k in q for k in _SIZE_FIT_KEYS) or attrs.get("sizes"):
        return Intent(kind="size_fit", attrs=attrs)
    # multi?
    if _looks_multi(query):
        return Intent(kind="multi", subqueries=_split_multi(query), attrs=attrs)
    # default
    return Intent(kind="lookup_product", attrs=attrs)
