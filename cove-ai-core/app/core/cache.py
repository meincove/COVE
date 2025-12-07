# app/core/cache.py
"""
Simple in-memory TTL cache for performance optimization.

Features:
- Time-to-live (TTL) expiration
- Automatic cleanup of expired entries
- Cache statistics tracking
- Thread-safe operations
"""
import time
import logging
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# In-memory cache: key -> (expires_at, value)
_CACHE: Dict[str, Tuple[float, Any]] = {}

# Cache statistics
_STATS = {
    "hits": 0,
    "misses": 0,
    "sets": 0,
    "evictions": 0,
}

# Configuration
DEFAULT_TTL = 600.0  # 10 minutes
MAX_CACHE_SIZE = 1000  # Maximum entries


def get_cached(key: str) -> Optional[Any]:
    """
    Get cached value if not expired.
    
    Args:
        key: Cache key
        
    Returns:
        Cached value if found and not expired, None otherwise
    """
    now = time.time()
    
    # Check if key exists
    entry = _CACHE.get(key)
    if not entry:
        _STATS["misses"] += 1
        return None
    
    expires_at, value = entry
    
    # Check if expired
    if expires_at < now:
        _CACHE.pop(key, None)
        _STATS["evictions"] += 1
        _STATS["misses"] += 1
        return None
    
    # Cache hit
    _STATS["hits"] += 1
    return value


def set_cached(key: str, value: Any, ttl: float = DEFAULT_TTL) -> None:
    """
    Set cached value with TTL.
    
    Args:
        key: Cache key
        value: Value to cache
        ttl: Time-to-live in seconds (default: 600)
    """
    # Evict oldest entries if cache is full
    if len(_CACHE) >= MAX_CACHE_SIZE:
        # Remove first entry (FIFO eviction)
        first_key = next(iter(_CACHE))
        _CACHE.pop(first_key, None)
        _STATS["evictions"] += 1
    
    # Set with expiration timestamp
    _CACHE[key] = (time.time() + ttl, value)
    _STATS["sets"] += 1


def clear_cache() -> None:
    """Clear all cached values."""
    count = len(_CACHE)
    _CACHE.clear()
    logger.info(f"Cache cleared: {count} entries removed")


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics.
    
    Returns:
        Dictionary with cache stats
    """
    total_requests = _STATS["hits"] + _STATS["misses"]
    hit_rate = _STATS["hits"] / total_requests if total_requests > 0 else 0.0
    
    return {
        "size": len(_CACHE),
        "max_size": MAX_CACHE_SIZE,
        "hits": _STATS["hits"],
        "misses": _STATS["misses"],
        "sets": _STATS["sets"],
        "evictions": _STATS["evictions"],
        "hit_rate": f"{hit_rate:.1%}",
    }


def make_cache_key(*args, **kwargs) -> str:
    """
    Create a stable cache key from arguments.
    
    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments
        
    Returns:
        MD5 hash of serialized arguments
    """
    import hashlib
    import json
    
    # Combine args and kwargs into stable string
    key_data = {
        "args": args,
        "kwargs": {k: v for k, v in sorted(kwargs.items())}
    }
    
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_str.encode()).hexdigest()
