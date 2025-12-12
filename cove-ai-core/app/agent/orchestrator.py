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
from app.core.rules import get_prompt

def _get_classifier_prompt() -> str:
    return get_prompt("classifier", default="You are an intent classifier. Output JSON only.")






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

from app.core.rules import get_regex_rules

def _looks_like_price_filter(q: str) -> bool:
    """
    Lightweight detector for explicit price filters.
    """
    rules = get_regex_rules().get("price", {})
    ql = q.lower()
    
    # Helper to check regex match
    def _matches(key: str) -> bool:
        pattern = rules.get(key)
        if not pattern: return False
        return bool(re.search(pattern, ql, re.IGNORECASE))

    if _matches("under") and _matches("number"):
        return True
    if _matches("between"):
        return True
    if _matches("currency"):
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
) -> Tuple[Optional[str], Optional[bool]]:
    """
    Optional refinement using a small router LLM.

    We keep this LLM prompt minimal and derive the allowed intent labels
    dynamically from the loaded config, so we don't hardcode keyword or
    label knowledge here.
    """
    if not USE_LLM_ROUTER:
        return None, None  # FIX: Return tuple, not None

    try:
        llm = _get_router_llm()
        # Prefer all labels except "unknown" for routing
        allowed_labels = [k for k in _ALLOWED_KINDS if k != "unknown"] or list(
            _ALLOWED_KINDS
        )
        labels_str = ", ".join(sorted(allowed_labels))

        # We now use the external prompt file, but we still inject the valid labels dynamically
        # to ensure the LLM knows exactly which JSON values are valid.
        base_prompt = _get_classifier_prompt()
        
        system_prompt = (
            f"{base_prompt}\n\n"
            f"VALID INTENT LABELS: {labels_str}.\n"
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
            return None, None  # FIX: Return tuple, not None

        # Allow bare label or quoted string
        label = raw.strip().strip('"').strip("'").lower()
        if label not in _ALLOWED_KINDS:
            log.warning("Router LLM returned invalid label %r", label)
            return None, None  # FIX: Return tuple, not None

        return label, None

    except Exception as e:
        log.warning("LLM router classify failed: %s", e, exc_info=True)
        return None, None


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
                has_price_filter=has_price_filter,
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

