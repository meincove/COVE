# app/core/rules.py
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

log = logging.getLogger("cove.core.rules")

# Resolve data directory
try:
    # mirror fit.py pattern: /COVE root ~ parents[3] if this file is app/core/rules.py
    _ROOT_DIR = Path(__file__).resolve().parents[2]
except IndexError:
    _ROOT_DIR = Path(__file__).resolve().parent

_DATA_DIR = Path(os.getenv("COVE_DATA_DIR", str(_ROOT_DIR / "data")))

# Cache for loaded rules
_PROMPTS: Dict[str, str] = {}
_REGEX_RULES: Dict[str, Any] = {}
_SEARCH_CONFIG: Dict[str, Any] = {}

def get_prompt(name: str, default: str = "") -> str:
    """
    Load a prompt from data/prompts/{name}.txt.
    Returns default if file not found.
    """
    if name in _PROMPTS:
        return _PROMPTS[name]

    path = _DATA_DIR / "prompts" / f"{name}.txt"
    if not path.exists():
        log.warning("Prompt file not found: %s", path)
        return default

    try:
        content = path.read_text(encoding="utf-8").strip()
        _PROMPTS[name] = content
        return content
    except Exception as e:
        log.error("Failed to read prompt %s: %s", path, e)
        return default

def get_regex_rules() -> Dict[str, Any]:
    """
    Load regex patterns from data/regex_rules.json.
    """
    global _REGEX_RULES
    if _REGEX_RULES:
        return _REGEX_RULES

    path = _DATA_DIR / "regex_rules.json"
    if not path.exists():
        log.warning("Regex rules file not found: %s", path)
        return {}

    try:
        content = path.read_text(encoding="utf-8")
        _REGEX_RULES = json.loads(content)
        return _REGEX_RULES
    except Exception as e:
        log.error("Failed to parse regex rules %s: %s", path, e)
        return {}

def get_search_config() -> Dict[str, Any]:
    """
    Load search configuration (searchable fields, filters) from data/search_config.json.
    """
    global _SEARCH_CONFIG
    if _SEARCH_CONFIG:
        return _SEARCH_CONFIG

    path = _DATA_DIR / "search_config.json"
    if not path.exists():
        log.warning("Search config file not found: %s", path)
        return {}

    try:
        content = path.read_text(encoding="utf-8")
        _SEARCH_CONFIG = json.loads(content)
        return _SEARCH_CONFIG
    except Exception as e:
        log.error("Failed to parse search config %s: %s", path, e)
        return {}

def reload_rules():
    """Clear caches to force reload from disk."""
    _PROMPTS.clear()
    _REGEX_RULES.clear()
    _SEARCH_CONFIG.clear()
    log.info("Rules and prompts reloaded from %s", _DATA_DIR)
