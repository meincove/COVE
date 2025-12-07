# 🚀 Production Deployment Checklist

**CRITICAL**: Read this before deploying to production

---

## ⚠️ CACHE LIMITATION - ACTION REQUIRED

### Current Status
The cache implementation uses **in-memory Python dictionaries**.

**This works for**:
- ✅ Development (single process)
- ✅ Production with single worker only

**This FAILS for**:
- ❌ Multiple Uvicorn workers (standard production)
- ❌ Horizontal scaling (multiple servers)
- ❌ Serverless deployments

---

## 🎯 Action Required Before Production

### Option 1: Single Worker Deployment (Quick Fix)
```bash
# Deploy with ONLY 1 worker
uvicorn app.main:app --workers 1 --port 8000
```

**Pros**:
- No code changes needed
- Works immediately

**Cons**:
- Cannot handle high traffic
- Single point of failure
- Limited performance

**Use when**: <1000 requests/day, testing, MVP

---

### Option 2: Redis Cache (Recommended) 🎯

**Required for**:
- Multiple workers (standard production)
- High availability
- Horizontal scaling

**Setup Steps**:

1. **Add Redis to infrastructure**:
```yaml
# docker-compose.yml or equivalent
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: always
```

2. **Install Redis client**:
```bash
cd cove-ai-core
source .venv/bin/activate
pip install redis
pip freeze > requirements.txt
```

3. **Set environment variables**:
```bash
export USE_REDIS_CACHE=true
export REDIS_HOST=your-redis-host
export REDIS_PORT=6379
```

4. **Deploy Redis cache adapter** (code provided below)

5. **Deploy with multiple workers**:
```bash
uvicorn app.main:app --workers 4 --port 8000
```

---

## 📝 Redis Implementation Code

### File: `app/core/cache_redis.py` (NEW)

```python
"""
Redis-backed cache for production deployments.
Shares cache across all workers and servers.
"""
import os
import json
import redis
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Redis client (lazy init)
_redis_client = None

def get_redis_client():
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=0,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    return _redis_client


def get_cached(key: str) -> Optional[Any]:
    """Get cached value from Redis."""
    try:
        client = get_redis_client()
        value = client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.warning(f"Redis get failed: {e}")
        return None


def set_cached(key: str, value: Any, ttl: float = 600.0) -> None:
    """Set cached value in Redis with TTL."""
    try:
        client = get_redis_client()
        client.setex(
            name=key,
            time=int(ttl),
            value=json.dumps(value, default=str)
        )
    except Exception as e:
        logger.warning(f"Redis set failed: {e}")


def clear_cache() -> None:
    """Clear all cached values."""
    try:
        client = get_redis_client()
        client.flushdb()
        logger.info("Redis cache cleared")
    except Exception as e:
        logger.warning(f"Redis clear failed: {e}")


def get_cache_stats() -> dict:
    """Get cache statistics from Redis."""
    try:
        client = get_redis_client()
        info = client.info("stats")
        return {
            "size": client.dbsize(),
            "hits": info.get("keyspace_hits", 0),
            "misses": info.get("keyspace_misses", 0),
            "hit_rate": f"{info.get('keyspace_hits', 0) / max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 1), 1):.1%}"
        }
    except Exception as e:
        logger.warning(f"Redis stats failed: {e}")
        return {"error": str(e)}
```

### File: `app/core/cache.py` (MODIFY)

Add at the top:
```python
import os

# Feature flag for cache backend
USE_REDIS = os.getenv("USE_REDIS_CACHE", "false").lower() == "true"

if USE_REDIS:
    # Import Redis implementation
    from app.core.cache_redis import (
        get_cached,
        set_cached,
        clear_cache,
        get_cache_stats,
    )
else:
    # Use existing in-memory implementation (keep current code)
    pass
```

---

## 🧪 Testing Redis Cache

### 1. Start Redis locally:
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### 2. Enable Redis cache:
```bash
export USE_REDIS_CACHE=true
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

### 3. Restart server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Test cache works:
```bash
curl -X POST http://localhost:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "how long is shipping", "clerkUserId": "test"}'
```

Check logs for `policy_cache_hit=True`

### 5. Test with multiple workers:
```bash
uvicorn app.main:app --workers 4 --port 8000
```

All workers should share the same cache.

---

## 📊 Deployment Scenarios

### Scenario A: Vercel / Railway / Render (Single Instance)
```
Single instance → Use in-memory cache (current) ✅
```
**Config**: Nothing needed, works as-is

---

### Scenario B: AWS / GCP / Azure (Multi-instance)
```
Load Balancer → Multiple servers → NEED Redis ❌
```
**Config**:
1. Deploy Redis instance (ElastiCache/MemoryStore/Azure Cache)
2. Set `USE_REDIS_CACHE=true`
3. Set `REDIS_HOST` to Redis endpoint
4. Deploy code changes above

---

### Scenario C: Docker Compose
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    restart: always
  
  api:
    build: .
    environment:
      - USE_REDIS_CACHE=true
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
```

---

## ⏰ When to Upgrade

**Upgrade to Redis when you experience**:
- Cache hit rate dropping
- Different responses from same query
- Workers behaving inconsistently

**Or when you deploy with**:
- More than 1 Uvicorn worker
- Multiple server instances
- Kubernetes/Docker Swarm

---

## 💰 Cost Estimate

| Provider | Redis Service | Monthly Cost |
|----------|---------------|--------------|
| AWS | ElastiCache (cache.t3.micro) | ~$12 |
| GCP | Memory Store (1GB) | ~$15 |
| Azure | Azure Cache (Basic) | ~$16 |
| Railway | Redis plugin | ~$5 |
| Redis Cloud | Free tier (30MB) | Free |

**Recommendation**: Start with free tier for testing

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] Decided on deployment strategy (single/multi worker)
- [ ] If multi-worker: Redis infrastructure provisioned
- [ ] If multi-worker: Redis client added to requirements.txt
- [ ] If multi-worker: cache_redis.py implemented
- [ ] If multi-worker: Environment variables configured
- [ ] If multi-worker: Tested with multiple workers locally
- [ ] Cache hit rate monitored
- [ ] Error logs checked for cache issues

---

## 🆘 Troubleshooting

### Cache not working after deployment
1. Check worker count: `ps aux | grep uvicorn`
2. If >1 worker without Redis → Cache won't work
3. Solution: Add Redis or reduce to 1 worker

### Redis connection errors
1. Check Redis is running: `redis-cli ping`
2. Check host/port configured correctly
3. Check firewall allows connection
4. Check Redis auth if required

### Low cache hit rate
1. Check TTL not too short
2. Check cache keys stable
3. Check workers sharing Redis
4. Monitor with `get_cache_stats()`

---

## 📞 Need Help?

**Before Production Deployment**:
1. Review this document
2. Test with multiple workers locally
3. Monitor cache hit rates
4. Contact team if issues

**File Location**: `/cove-ai-core/DEPLOYMENT_CACHE.md`

**Last Updated**: 2025-12-06  
**Priority**: 🔴 HIGH - Required for production multi-worker deployment
