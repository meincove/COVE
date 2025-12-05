# app/agent/orchestrator.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional
import re
import os
import json
import logging
from pathlib import Path

from app.providers.llm import LLMClient
CLASSIFIER_SYSTEM_PROMPT = """
You are an intent classifier for Cove AI, a fashion e-commerce assistant.

INPUT
You receive a JSON object:

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

-----------------------------
Valid "kind" values and rules
-----------------------------

1) "greeting"
   - The message is ONLY a greeting / polite phrase or brief thanks.
   - There is NO concrete shopping intent, no product type and no question.
   - Examples:
       "hi"
       "hello"
       "hey cove"
       "good evening"
       "thanks"
       "thank you so much"
   - If the user also asks for products in the same message
     (e.g. "hi, do you have black hoodies?") then this is NOT "greeting".
     In that case choose "discover" / "size_fit" / "policy" etc.

2) "small_talk"
   - Casual chit-chat unrelated to buying products.
   - Examples:
       "how are you"
       "tell me a joke"
       "who created you"
       "what can you do"
   - If there is a clear product intent together with chit-chat
     (e.g. "how are you, can you show me some tees"), DO NOT use "small_talk".
     Prefer the shopping-related kind instead (usually "discover").

3) "discover"
   - User wants to BROWSE or SEE product options.
   - The goal is to surface a list of items (recommendations).
   - Examples:
       "show me some black bombers"
       "what hoodies do you have in green?"
       "recommend some cargos under 50 euros"
       "i'm looking for relaxed joggers for travel"
   - Choose "discover" ONLY if the primary intent is to see products/options.

4) "lookup_product"
   - User is asking ABOUT product properties, features, care, or shrinkage,
     not to browse options.
   - Examples:
       "what material is this bomber made of?"
       "do any of your cargos have RFID-protected pockets?"
       "will your cotton bombers shrink heavily in the dryer?"
       "can I put your soft cotton tees in the dryer?"
   - If the user mainly asks about features/capabilities/care, choose
     "lookup_product" even if a product type is mentioned.

5) "size_fit"
   - User asks which size to buy or how something fits.
   - Examples:
       "which size should I pick?"
       "I'm 175cm and 70kg, will M be too tight for your bombers?"
       "does this fit oversized or regular?"

6) "policy"
   - User asks about returns, shipping, delivery, payment, etc.
   - Examples:
       "what is your return policy?"
       "how long does delivery take?"
       "can I return a bomber if it doesn’t fit?"
       "do you ship to France?"

7) "history_meta"
   - User asks about previous conversation context.
   - Examples:
       "what did I ask you earlier about bombers?"
       "what were we talking about before?"
       "remind me what I said about joggers"

8) "generic"
   - Brand or store questions not covered above.
   - Examples:
       "tell me about your brand"
       "what makes Cove different?"
       "are you a premium or budget brand?"

9) "unknown"
   - Use this only if you really cannot decide.

-----------------------------
Price filters
-----------------------------

has_price_filter = true if the user clearly constrains price/budget, e.g.:

  "under 40 euros"
  "between 30 and 50"
  "around 30"
  "max 25€"
  "for 30-40 euro"

Otherwise has_price_filter = false.

Return ONLY the JSON object, with fields:
  - "kind": string (one of the above)
  - "has_price_filter": boolean
No extra text or explanation.
""".strip()





log = logging.getLogger("cove.agent.intent")


# ---------------- Intent dataclass ----------------


@dataclass
class Intent:
    """
    High-level intent classification for Cove AI.

    kind is one of (by default):
      - "discover"       – browse / see product options
      - "lookup_product" – ask about product features / care / shrinkage
      - "size_fit"       – size & fit questions
      - "policy"         – shipping / returns / payments
      - "history_meta"   – ask about previous conversation
      - "generic"        – brand questions or misc
      - "unknown"        – fallback when unclear

    The actual set of kinds comes from intent_config.json; the values above
    are the intended baseline and public contract.
    """

    kind: str
    has_price_filter: bool = False
    subqueries: Optional[List[str]] = None
    attrs: Optional[Dict[str, List[str]]] = None


# ---------------- Router LLM config ----------------

USE_LLM_ROUTER = os.getenv("USE_LLM_ROUTER", "false").lower() == "true"
LLM_ROUTER_MODEL = (
    os.getenv("LLM_ROUTER_MODEL")
    or os.getenv("LLM_MAIN_MODEL")
    or os.getenv("GEN_MODEL", "openrouter:openai/gpt-4o-mini")
)

_router_llm: Optional[LLMClient] = None


def _get_router_llm() -> LLMClient:
    """
    Lazy-init router LLM so we don't create clients at import time.
    """
    global _router_llm
    if _router_llm is None:
        _router_llm = LLMClient(model=LLM_ROUTER_MODEL)
        log.info("Initialized router LLM with model=%s", LLM_ROUTER_MODEL)
    return _router_llm


# ---------------- Config loading (data-driven rules) ----------------

try:
    # mirror fit.py pattern: /COVE root ~ parents[3]
    _ROOT_DIR = Path(__file__).resolve().parents[3]
except IndexError:
    _ROOT_DIR = Path(__file__).resolve().parent

_DATA_DIR = Path(os.getenv("COVE_DATA_DIR", str(_ROOT_DIR / "data")))


@dataclass
class IntentRule:
    name: str
    priority: int
    keywords: List[str]


_INTENT_RULES: List[IntentRule] = []
_ALLOWED_KINDS: List[str] = []
_BRAND_ALIASES: List[str] = []


def _load_intent_config() -> None:
    """
    Load intent_config.json into in-memory rules.

    This is the only place where intent keywords live. There are no
    keyword lists hardcoded in Python.
    """
    global _INTENT_RULES, _ALLOWED_KINDS, _BRAND_ALIASES

    cfg_path = _DATA_DIR / "intent_config.json"
    if not cfg_path.exists():
        log.warning(
            "intent_config.json not found in %s; "
            "intent classification will fall back to generic/unknown.",
            _DATA_DIR,
        )
        _INTENT_RULES = []
        _ALLOWED_KINDS = [
            "discover",
            "lookup_product",
            "size_fit",
            "policy",
            "history_meta",
            "generic",
            "unknown",
        ]
        _BRAND_ALIASES = []
        return

    try:
        raw = json.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception as e:
        log.warning(
            "Failed to parse intent_config.json from %s (%s); "
            "falling back to minimal defaults.",
            cfg_path,
            e,
        )
        _INTENT_RULES = []
        _ALLOWED_KINDS = [
            "discover",
            "lookup_product",
            "size_fit",
            "policy",
            "history_meta",
            "generic",
            "unknown",
        ]
        _BRAND_ALIASES = []
        return

    intents = raw.get("intents") or []
    rules: List[IntentRule] = []

    for entry in intents:
        if not isinstance(entry, dict):
            continue

        name = str(entry.get("name", "")).strip()
        if not name:
            continue  # skip nameless entries

        # we allow any name; downstream decides how to use it
        priority_raw = entry.get("priority", 0)
        try:
            priority = int(priority_raw)
        except (TypeError, ValueError):
            priority = 0

        kws_raw = entry.get("keywords") or []
        if not isinstance(kws_raw, list):
            kws_raw = []

        keywords = [
            str(k).lower()
            for k in kws_raw
            if isinstance(k, str) and k.strip()
        ]

        rules.append(IntentRule(name=name, priority=priority, keywords=keywords))

    # Sort by priority (high → low) so the first match wins deterministically.
    rules.sort(key=lambda r: r.priority, reverse=True)
    _INTENT_RULES = rules

    _ALLOWED_KINDS = sorted({r.name for r in rules} | {"unknown"})

    brand_aliases = raw.get("brand_aliases") or []
    if isinstance(brand_aliases, list):
        _BRAND_ALIASES = [
            str(b).lower()
            for b in brand_aliases
            if isinstance(b, str) and b.strip()
        ]
    else:
        _BRAND_ALIASES = []

    log.info(
        "Loaded intent_config.json from %s with intents=%s",
        cfg_path,
        [r.name for r in _INTENT_RULES],
    )


# Load config once per process
_load_intent_config()


# ---------------- Stable, non-business helpers ----------------

_PRICE_UNDER_RE = re.compile(r"\b(under|below|less than|max)\b", re.IGNORECASE)
_PRICE_NUMBER_RE = re.compile(r"\b\d+(\.\d+)?\b")
_PRICE_BETWEEN_RE = re.compile(
    r"\bbetween\s+\d+(\.\d+)?\s+(and|-)\s+\d+(\.\d+)?",
    re.IGNORECASE,
)
_PRICE_CURRENCY_RE = re.compile(
    r"\b\d+(\.\d+)?\s?(eur|euro|€)\b",
    re.IGNORECASE,
)


def _looks_like_price_filter(q: str) -> bool:
    """
    Lightweight detector for explicit price filters.

    This is "code knowledge" (regex heuristics) but not business-specific:
    it doesn't know anything about Cove products or categories.
    """
    ql = q.lower()
    if _PRICE_UNDER_RE.search(ql) and _PRICE_NUMBER_RE.search(ql):
        return True
    if _PRICE_BETWEEN_RE.search(ql):
        return True
    if _PRICE_CURRENCY_RE.search(ql):
        return True
    return False


def _classify_by_rules(message: str) -> str:
    """
    Purely config-driven rule-based classifier.

    Strategy:
      - Lowercase message.
      - For each rule (sorted by priority desc), if any keyword is a
        substring of the message, select that intent.
      - If no rule matches:
          * if message is empty → "unknown"
          * else → "generic" if that kind exists, otherwise "unknown".
    """
    q = message.lower().strip()
    if not q:
        return "unknown"

    for rule in _INTENT_RULES:
        if not rule.keywords:
            continue
        if any(kw in q for kw in rule.keywords):
            return rule.name

    # No rule matched → graceful fallback
    if "generic" in _ALLOWED_KINDS:
        return "generic"
    return "unknown"


async def _classify_with_llm(
    message: str,
    has_price_filter: bool,
) -> Optional[str]:
    """
    Optional refinement using a small router LLM.

    We keep this LLM prompt minimal and derive the allowed intent labels
    dynamically from the loaded config, so we don't hardcode keyword or
    label knowledge here.
    """
    if not USE_LLM_ROUTER:
        return None

    try:
        llm = _get_router_llm()
        # Prefer all labels except "unknown" for routing
        allowed_labels = [k for k in _ALLOWED_KINDS if k != "unknown"] or list(
            _ALLOWED_KINDS
        )
        labels_str = ", ".join(sorted(allowed_labels))

        system_prompt = (
            "You are an intent classifier for a fashion e-commerce assistant.\n"
            f"Valid intent labels are: {labels_str}.\n"
            "Always respond with exactly one label from this set.\n"
            "If you truly cannot decide, respond with 'unknown'."
        )

        payload = {
            "message": message,
            "has_price_filter": has_price_filter,
        }

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ]

        raw = await llm.generate(messages)
        if not raw:
            return None

        # Allow bare label or quoted string
        label = raw.strip().strip('"').strip("'").lower()
        if label not in _ALLOWED_KINDS:
            log.warning("Router LLM returned invalid label %r", label)
            return None

        return label

    except Exception as e:
        log.warning("LLM router classify failed: %s", e, exc_info=True)
        return None


# ---------------- Public API ----------------

async def classify(message: str, attrs: Dict[str, List[str]]) -> Intent:
    """
    Main entry point used by app.agent.agent.

    Strategy:
      1) Detect has_price_filter via regex.
      2) Run config-driven rule-based classifier.
      3) If USE_LLM_ROUTER=true and kind in {"generic", "unknown"},
         ask the router LLM to refine BOTH kind and has_price_filter.
      4) Always return an Intent; never raise.
    """
    try:
        # 1) cheap heuristic
        has_price_filter = _looks_like_price_filter(message)

        # 2) config-driven rules
        kind = _classify_by_rules(message)

        # 3) optional refinement for fuzzy cases
        if USE_LLM_ROUTER and kind in ("generic", "unknown"):
            refined_kind, hp_llm = await _classify_with_llm(
                message=message,
                attrs=attrs,
                has_price_filter_hint=has_price_filter,
            )
            if refined_kind:
                kind = refined_kind
            if hp_llm is not None:
                has_price_filter = hp_llm

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

