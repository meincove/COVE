"""
Simple in-memory LLM cache for performance optimization.
Caches LLM responses to avoid redundant API calls.
"""

import hashlib
import json
import logging
from typing import Any, Dict, Optional
from datetime import datetime, timedelta

log = logging.getLogger("cove.cache")


class LLMCache:
    """Simple in-memory cache for LLM responses with TTL."""
    
    def __init__(self, maxsize: int = 1000, ttl_seconds: int = 3600):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.maxsize = maxsize
        self.ttl_seconds = ttl_seconds
        self.hits = 0
        self.misses = 0
    
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
        if key not in self.cache:
            self.misses += 1
            return None
        
        entry = self.cache[key]
        
        # Check TTL
        if datetime.now() > entry["expires"]:
            del self.cache[key]
            self.misses += 1
            return None
        
        self.hits += 1
        hit_rate = (self.hits / (self.hits + self.misses)) * 100
        log.info(f"✅ LLM cache hit: {key[:8]}... (hit rate: {hit_rate:.1f}%)")
        return entry["response"]
    
    def set(self, key: str, response: Any):
        """Cache response with TTL."""
        # Evict oldest if at capacity
        if len(self.cache) >= self.maxsize:
            oldest_key = min(
                self.cache.keys(),
                key=lambda k: self.cache[k]["created"]
            )
            del self.cache[oldest_key]
            log.debug(f"Evicted oldest cache entry: {oldest_key[:8]}...")
        
        self.cache[key] = {
            "response": response,
            "created": datetime.now(),
            "expires": datetime.now() + timedelta(seconds=self.ttl_seconds)
        }
        log.debug(f"💾 Cached LLM response: {key[:8]}...")
    
    def clear(self):
        """Clear all cached entries."""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        log.info("🗑️ Cache cleared")
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "size": len(self.cache),
            "maxsize": self.maxsize,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": hit_rate,
            "ttl_seconds": self.ttl_seconds
        }


# Global cache instance
llm_cache = LLMCache(maxsize=1000, ttl_seconds=3600)

log.info("✓ LLM cache initialized (maxsize=1000, ttl=3600s)")
