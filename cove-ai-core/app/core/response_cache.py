# app/core/response_cache.py
"""
Response caching for Week 6 optimization.

Caches common agent responses to reduce latency and LLM costs.
Only caches stable, non-personalized responses.
"""
import hashlib
import logging
import time
from typing import Optional

from app.core.cache import get_cached, set_cached

log = logging.getLogger("cove.response_cache")

# Cacheable intents with TTL (in seconds)
CACHEABLE_INTENTS = {
    "greeting": 3600,       # 1 hour - greetings rarely change
    "generic": 7200,        # 2 hours - brand info is stable
    "policy": 86400,        # 24 hours - policies change infrequently
    "small_talk": 3600,     # 1 hour - general Q&A
}


def get_cache_key(intent: str, message: str) -> str:
    """
    Generate cache key from intent + normalized message.
    
    Args:
        intent: Intent classification
        message: User message
        
    Returns:
        Cache key string
    """
    # Normalize message (lowercase, strip whitespace)
    normalized = message.lower().strip()
    
    # Hash for consistent keys
    message_hash = hashlib.md5(normalized.encode()).hexdigest()[:8]
    
    return f"response_cache:{intent}:{message_hash}"


async def get_cached_response(
    intent: str,
    message: str
) -> Optional[str]:
    """
    Get cached response if available.
    
    Args:
        intent: Intent classification
        message: User message
        
    Returns:
        Cached response text or None
    """
    # Only cache specific intents
    if intent not in CACHEABLE_INTENTS:
        return None
    
    cache_key = get_cache_key(intent, message)
    cached = get_cached(cache_key)
    
    if cached:
        log.info(f"Cache hit for {intent}: {message[:30]}...", extra={
            "intent": intent,
            "message_preview": message[:50],
            "cache_key": cache_key,
            "cached_at": cached.get("cached_at")
        })
        return cached.get("response")
    
    log.debug(f"Cache miss for {intent}: {message[:30]}...", extra={
        "intent": intent,
        "cache_key": cache_key
    })
    return None


async def cache_response(
    intent: str,
    message: str,
    response: str
) -> None:
    """
    Cache response for future use.
    
    Args:
        intent: Intent classification
        message: User message
        response: Generated response text
    """
    # Only cache specific intents
    if intent not in CACHEABLE_INTENTS:
        return
    
    cache_key = get_cache_key(intent, message)
    ttl = CACHEABLE_INTENTS[intent]
    
    set_cached(cache_key, {
        "response": response,
        "intent": intent,
        "message": message[:100],  # Store preview
        "cached_at": time.time()
    }, ttl=ttl)
    
    log.info(f"Cached response for {intent} (TTL: {ttl}s)", extra={
        "intent": intent,
        "cache_key": cache_key,
        "ttl": ttl,
        "response_length": len(response)
    })


def get_cache_stats() -> dict:
    """
    Get response cache statistics.
    
    Returns:
        Dict with cache metrics
    """
    # This would be enhanced to track hits/misses
    # For now, return basic info
    return {
        "cacheable_intents": list(CACHEABLE_INTENTS.keys()),
        "ttls": CACHEABLE_INTENTS,
        "enabled": True
    }
