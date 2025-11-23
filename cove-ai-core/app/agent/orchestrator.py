# app/agent/orchestrator.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional
import re
import os
import json
import logging
from pathlib import Path

from app.providers.llm import LLMClient  # ✅ NEW: import LLM client

log = logging.getLogger("cove.agent.intent")


@dataclass
@dataclass
class Intent:
    # kind is now one of:
    #  "discover" | "lookup_product" | "size_fit" | "policy"
    #  | "history_meta" | "generic" | "unknown"
    kind: str
    has_price_filter: bool = False
    subqueries: Optional[List[str]] = None
    attrs: Optional[Dict[str, List[str]]] = None


CLASSIFIER_SYSTEM_PROMPT = """
You are an intent classifier for Cove AI, a fashion e-commerce assistant.

Input you receive (as user message) is a JSON object:

{
  "message": "<raw user message>",
  "attrs": {
    "colors": [...],
    "types": [...],
    "sizes": [...]
  }
}

You must output ONLY a JSON object like:

{
  "kind": "...",
  "has_price_filter": false
}

Valid "kind" values:

- "discover": user wants to BROWSE or SEE product options.
  The goal is to surface a list of items (recommendations).
  Examples:
    - "show me some black bombers"
    - "what hoodies do you have in green?"
    - "recommend some cargos under 50 euros"
    - "i'm looking for relaxed joggers for travel"
  IMPORTANT: choose "discover" ONLY if the user is primarily asking to see products / options.

- "lookup_product": user is asking ABOUT product properties, features, care, materials, or shrinkage,
  not to browse options.
  Examples:
    - "what material is this bomber made of?"
    - "do any of your cargo jeans have smart heating or RFID-protected pockets?"
    - "will your cotton bombers shrink heavily in the dryer?"
    - "can I put your soft cotton tees in the dryer?"
  IMPORTANT: if the user is mainly asking about features, capabilities, or care/shrinkage,
  choose "lookup_product", NOT "discover", even if a product type is mentioned.

- "size_fit": user asks which size to buy or how something fits.
  Examples:
    - "which size should I pick?"
    - "I'm 175cm and 70kg, will M be too tight for your bombers?"

- "policy": user asks about returns, shipping, delivery, payment, etc.
  Examples:
    - "what is your return policy?"
    - "how long does delivery take?"
    - "can I return a bomber if it doesn’t fit?"

- "history_meta": user asks about previous conversation context.
  Examples:
    - "what did I ask you earlier about bombers?"
    - "what were we talking about before?"
    - "remind me what I said about joggers"

- "generic": normal chit-chat or brand questions not covered above.
  Examples:
    - "hi", "how are you?"
    - "tell me about your brand"

- "unknown": if you really cannot decide.

has_price_filter = true if the user clearly constrains price/budget:
  - "under 40 euros"
  - "between 30 and 50"
  - "around 30"
  - "max 25€"
  - "for 30-40 euro" etc.

Return ONLY the JSON object, no extra text.
"""



# ---------------- config loading ----------------

try:
    # fit.py also uses parents[3] → /COVE; we mirror that so data lives in /COVE/data
    _ROOT_DIR = Path(__file__).resolve().parents[3]
except IndexError:
    # fallback: closest parent
    _ROOT_DIR = Path(__file__).resolve().parent

_DATA_DIR = Path(os.getenv("COVE_DATA_DIR", str(_ROOT_DIR / "data")))

try:
    _INTENT_KEYWORDS = json.loads(
        (_DATA_DIR / "intentKeywords.json").read_text(encoding="utf-8")
    )
except FileNotFoundError:
    log.warning(
        "intentKeywords.json not found in %s; using in-code defaults",
        _DATA_DIR,
    )
    _INTENT_KEYWORDS: Dict[str, List[str]] = {}
except Exception as e:
    log.warning(
        "failed to load intentKeywords.json from %s (%s); using in-code defaults",
        _DATA_DIR,
        e,
    )
    _INTENT_KEYWORDS = {}


def _kw_list(key: str, default: List[str]) -> List[str]:
    """
    Get keyword list for a given intent category, with a simple JSON override.
    """
    raw = _INTENT_KEYWORDS.get(key)
    if isinstance(raw, list):
        return [str(w).lower() for w in raw]
    return [w.lower() for w in default]


_POLICY_KEYS = tuple(
    _kw_list(
        "policy",
        [
            "return",
            "refund",
            "shipping",
            "delivery",
            "dispatch",
            "tax",
            "customs",
            "vat",
            "duty",
            "warranty",
            "privacy",
            "gdpr",
            "cancel",
            "cancellation",
        ],
    )
)

_SIZE_FIT_KEYS = tuple(
    _kw_list(
        "size_fit",
        [
            "size",
            "fit",
            "tight",
            "loose",
            "regular",
            "measure",
            "measurement",
            "height",
            "weight",
            "cm",
            "kg",
            "inches",
            "lbs",
        ],
    )
)

_MULTI_JOINERS = tuple(_kw_list("multi_joiners", [" and ", "&"]))


# ---------------- helpers ----------------

def _looks_multi(q: str) -> bool:
    """
    Very simple detector for multi-part questions, e.g.
    'What sizes do you have and how long is shipping?'
    """
    ql = q.lower()

    # multiple question marks → almost certainly multi
    if "?" in ql and re.search(r"\?\s+\w", ql):
        return True

    # joiners like "and" / "&" plus a second wh-word → multi
    if any(j in ql for j in _MULTI_JOINERS) and re.search(
        r"\b(what|do|is|are|how|when|where|which)\b",
        ql,
    ):
        return True

    return False


def _split_multi(q: str) -> List[str]:
    """
    Trivially split multi-part queries on '?', ' and ', '&', etc.
    We keep at most 4 subqueries as a guardrail.
    """
    pattern_parts = [r"\?\s+"]
    for j in _MULTI_JOINERS:
        pattern_parts.append(re.escape(j))
    pattern = "|".join(pattern_parts)

    parts = [p.strip() for p in re.split(pattern, q) if p.strip()]
    return parts[:4]


# ---------------- main classifier (LLM-based) ----------------

async def classify(message: str, attrs: Dict[str, List[str]]) -> Intent:
    """
    LLM-based intent classifier.

    Uses LLMClient with a strict system prompt and expects a small JSON
    with fields: kind, has_price_filter.
    """
    client = LLMClient()

    user_payload = {
        "message": message,
        "attrs": attrs or {},
    }

    messages = [
        {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT.strip()},
        {
            "role": "user",
            "content": json.dumps(user_payload, ensure_ascii=False),
        },
    ]

    try:
        # ✅ async call into LLM
        raw = await client.generate(messages)

        # Try to extract a JSON object from the response
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            raw_json = raw[start : end + 1]
        else:
            raw_json = raw

        data = json.loads(raw_json)

        kind = str(data.get("kind", "unknown")).strip() or "unknown"
        has_price_filter = bool(data.get("has_price_filter", False))

        return Intent(
            kind=kind,
            has_price_filter=has_price_filter,
            subqueries=None,
            attrs=attrs,
        )

    except Exception as e:
        log.warning("classify failed, falling back to unknown: %s", e, exc_info=True)
        return Intent(
            kind="unknown",
            has_price_filter=False,
            subqueries=None,
            attrs=attrs,
        )
