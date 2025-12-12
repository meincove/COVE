"""
Central config loader for all JSON configurations.
Eliminates hardcoded values by loading from config files.
"""

import json
from pathlib import Path
from functools import lru_cache
from typing import Dict


_CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "data"


@lru_cache(maxsize=1)
def get_search_config() -> Dict:
    """Load search configuration (overfetch multipliers, limits, defaults)"""
    config_path = _CONFIG_DIR / "search_config.json"
    with open(config_path) as f:
        return json.load(f)


@lru_cache(maxsize=1)
def get_validation_config() -> Dict:
    """Load validation configuration (input validation rules)"""
    config_path = _CONFIG_DIR / "validation_config.json"
    with open(config_path) as f:
        return json.load(f)


@lru_cache(maxsize=1)
def get_fuzzy_matching_config() -> Dict:
    """Load fuzzy matching configuration (typo tolerance)"""
    config_path = _CONFIG_DIR / "fuzzy_matching_config.json"
    with open(config_path) as f:
        return json.load(f)


def get_config_value(config_name: str, *keys, default=None):
    """
    Get a nested config value with fallback.
    Example: get_config_value('search', 'limits', 'max_top_k', default=100)
    """
    configs = {
        'search': get_search_config,
        'validation': get_validation_config,
        'fuzzy': get_fuzzy_matching_config,
    }
    
    if config_name not in configs:
        raise ValueError(f"Unknown config: {config_name}")
    
    config = configs[config_name]()
    
    # Navigate nested keys
    value = config
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return default
    
    return value
