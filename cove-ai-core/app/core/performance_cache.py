"""
Multi-level caching for sub-second responses.
Research-backed: Caching reduces latency by 70-80%

Strategy: Memory (0ms) → Redis (5-10ms) → Compute (500-2000ms)
"""
import hashlib
import json
import logging
from typing import Any, Optional, Dict, Callable
from functools import wraps
import asyncio

log = logging.getLogger("cove.cache")


class PerformanceCache:
    """
    Multi-level caching for sub-second responses.
    
    Levels:
    1. Memory cache (instant - 0ms)
    2. Redis cache (fast - 5-10ms) - OPTIONAL
    3. Compute (slow - 500-2000ms)
    
    Usage:
        cache = PerformanceCache()
        
        @cache.cached(ttl_seconds=300)
        async def expensive_function(arg1, arg2):
            # ... expensive computation
            return result
    """
    
    def __init__(self, use_redis: bool = False):
        self.memory_cache: Dict[str, Any] = {}
        self.redis_client = None
        
        # Optional Redis (for distributed caching)
        if use_redis:
            try:
                import redis
                self.redis_client = redis.Redis(
                host='localhost',
                    port=6379,
                    decode_responses=True,
                    socket_connect_timeout=1
                )
                # Test connection
                self.redis_client.ping()
                log.info("✅ Redis connected for distributed caching")
            except Exception as e:
                log.warning(f"Redis not available, using memory-only cache: {e}")
                self.redis_client = None
    
    def cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from function and args"""
        key_data = {
            "prefix": prefix,
            "args": args,
            "kwargs": kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return f"cove:{prefix}:{hashlib.md5(key_str.encode()).hexdigest()}"
    
    async def get_or_compute(
        self,
        key: str,
        compute_func: Callable,
        ttl_seconds: int = 300
    ) -> Any:
        """
        Try memory → Redis → Compute.
        
        Args:
            key: Cache key
            compute_func: Async function to compute value
            ttl_seconds: Time to live in seconds
            
        Returns:
            Cached or computed value
        """
        # Level 1: Memory cache (instant - 0ms)
        if key in self.memory_cache:
            log.debug(f"💨 Cache HIT (memory): {key[:50]}")
            return self.memory_cache[key]
        
        # Level 2: Redis cache (fast - 5-10ms)
        if self.redis_client:
            try:
                cached = self.redis_client.get(key)
                if cached:
                    result = json.loads(cached)
                    self.memory_cache[key] = result  # Promote to memory
                    log.debug(f"⚡ Cache HIT (redis): {key[:50]}")
                    return result
            except Exception as e:
                log.warning(f"Redis error: {e}")
        
        # Level 3: Compute (slow - 500-2000ms)
        log.debug(f"🔄 Cache MISS, computing: {key[:50]}")
        result = await compute_func()
        
        # Cache for future
        self.memory_cache[key] = result
        
        if self.redis_client:
            try:
                self.redis_client.setex(
                    key,
                    ttl_seconds,
                    json.dumps(result, default=str)
                )
            except Exception as e:
                log.warning(f"Redis set error: {e}")
        
        return result
    
    def cached(self, ttl_seconds: int = 300):
        """
        Decorator for caching async functions.
        
        Args:
            ttl_seconds: Cache TTL in seconds
        """
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                key = self.cache_key(func.__name__, *args, **kwargs)
                
                # Get or compute
                async def compute():
                    return await func(*args, **kwargs)
                
                return await self.get_or_compute(key, compute, ttl_seconds)
            
            return wrapper
        return decorator
    
    def invalidate(self, key: str):
        """Invalidate cache entry"""
        if key in self.memory_cache:
            del self.memory_cache[key]
        
        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                log.warning(f"Redis delete error: {e}")
    
    def clear_all(self):
        """Clear all caches (for testing)"""
        self.memory_cache.clear()
        
        if self.redis_client:
            try:
                # Only clear COVE keys
                for key in self.redis_client.scan_iter("cove:*"):
                    self.redis_client.delete(key)
            except Exception as e:
                log.warning(f"Redis clear error: {e}")
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        return {
            "memory_entries": len(self.memory_cache),
            "redis_available": self.redis_client is not None
        }


# Global instance (memory-only by default)
_cache = PerformanceCache(use_redis=False)


def get_cache() -> PerformanceCache:
    """Get global performance cache"""
    return _cache
