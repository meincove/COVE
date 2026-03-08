from __future__ import annotations

import logging
import os
from typing import Optional

import redis

log = logging.getLogger("cove.redis")

_redis_client: Optional[redis.Redis] = None
_redis_failed: bool = False


def get_redis_client() -> Optional[redis.Redis]:
    """
    Return a singleton Redis client or None if unavailable.
    """
    global _redis_client
    global _redis_failed
    if _redis_client is not None:
        return _redis_client
    if _redis_failed:
        return None

    try:
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            client = redis.Redis.from_url(redis_url, decode_responses=True)
        else:
            host = os.getenv("REDIS_HOST", "localhost")
            port = int(os.getenv("REDIS_PORT", "6379"))
            db = int(os.getenv("REDIS_DB", "0"))
            password = os.getenv("REDIS_PASSWORD")
            client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=True,
            )

        client.ping()
        _redis_client = client
        _redis_failed = False
        log.info("✅ Redis connected for session state")
        return _redis_client
    except Exception as e:
        log.warning("Redis not available: %s", e)
        _redis_client = None
        _redis_failed = True
        return None


def redis_available() -> bool:
    """Check if Redis is available and enabled."""
    use_flag = os.getenv("USE_REDIS_SESSION_STATE")
    if use_flag is not None and use_flag.lower() not in ("1", "true", "yes"):
        return False

    client = get_redis_client()
    return client is not None
