"""
Simple in-memory LLM cache for performance optimization.
Caches LLM responses to avoid redundant API calls.
Delegates to app.core.cache for actual storage.
"""

import hashlib
import json
import logging
from typing import Any, Dict, Optional

from app.core.cache import get_cached, set_cached, clear_cache, get_cache_stats

log = logging.getLogger("cove.cache")


class LLMCache:
    """Simple in-memory cache for LLM responses with TTL."""
    
    def __init__(self, maxsize: int = 1000, ttl_seconds: int = 3600):
        # maxsize is controlled globally by app.core.cache, but we keep the arg for compat
        self.ttl_seconds = ttl_seconds
    
    def _create_key(self, model: str, messages: list, **kwargs) -> str:
        """Create cache key from LLM call parameters."""
        # Only cache based on model and messages (ignore temperature, etc.)
        cache_data = {
            "model": model,
            "messages": json.dumps(messages, sort_keys=True)
        }
        return hashlib.md5(
            json.dumps(cache_data, sort_keys=True).encode()
        ).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached response if exists and not expired."""
        value = get_cached(key)
        if value:
            # We don't track hits/misses here as cache.py handles it globally
            # But we can log for debug if needed
            log.debug(f"✅ LLM cache hit: {key[:8]}...")
        return value
    
    def set(self, key: str, response: Any):
        """Cache response with TTL."""
        set_cached(key, response, ttl=self.ttl_seconds)
        log.debug(f"💾 Cached LLM response: {key[:8]}...")
    
    def clear(self):
        """Clear all cached entries."""
        clear_cache()
        log.info("🗑️ Cache cleared")
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return get_cache_stats()


# Global cache instance
llm_cache = LLMCache(maxsize=1000, ttl_seconds=3600)

log.info("✓ LLM cache initialized (using core cache)")
