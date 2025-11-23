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

You receive a single USER message that is a JSON object of the form:

{
  "message": "<raw user message>",
  "attrs": {
    "colors": [...],
    "types": [...],
    "sizes": [...]
  }
}

Your job is to classify this message and detect whether it contains a price/budget constraint.

You MUST respond with ONLY a JSON object (no prose, no explanation):

{
  "kind": "...",
  "has_price_filter": false
}

Valid "kind" values:

- "discover":
    The user is browsing or exploring products in a general way.
    Examples:
      - "show me some black bombers"
      - "what hoodies do you have under 50 euro?"
      - "can you suggest some streetwear outfits?"

- "lookup_product":
    The user asks about a specific product or specific feature of products.
    Examples:
      - "what material is this bomber made of?"
      - "do your jackets have zips?"
      - "are your hoodies 100% cotton?"

- "size_fit":
    The user asks about which size to buy or how a product fits.
    Examples:
      - "which size should I pick?"
      - "I'm 175cm and 70kg, will M be too tight?"
      - "does this fit oversized or regular?"

- "policy":
    The user asks about returns, refunds, shipping, delivery, payment, warranty, privacy, etc.
    Examples:
      - "what is your return policy?"
      - "how long does shipping take to Germany?"
      - "do you offer cash on delivery?"
      - "how do refunds work?"

- "history_meta":
    The user asks about previous conversation context.
    Examples:
      - "what did I ask you earlier about bombers?"
      - "what were we talking about before?"
      - "remind me what I said about joggers"

- "generic":
    Normal chit-chat, greetings, or questions not clearly covered above.
    Examples:
      - "hi"
      - "how are you?"
      - "tell me about your brand"
      - "what kind of style is Cove?"

- "unknown":
    Use this only if you really cannot decide between the categories above.

---------------------------
has_price_filter detection
---------------------------

Set "has_price_filter": true if the user clearly constrains price or budget for products, such as:

  - explicit upper bounds:
      "under 40 euros", "less than 30", "max 25€"
  - explicit ranges:
      "between 30 and 50 euros", "for 30-40 euro"
  - approximate budgets:
      "around 30 euros", "roughly 50€", "about 45 euro"

DO NOT set has_price_filter = true when numbers are mentioned but NOT as a budget constraint, e.g.:

  - "I spent 40 euros last time"
  - "I bought 2 hoodies and 3 joggers"
  - "this hoodie is 380 GSM"

---------------------------
Output format
---------------------------

Return ONLY a compact JSON object, for example:

{"kind": "discover", "has_price_filter": true}
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
