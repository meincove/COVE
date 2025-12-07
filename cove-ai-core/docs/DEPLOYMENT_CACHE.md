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

## Week 4 Success Validation

Once deployed to production with Redis (or single-worker in-memory), verify:

1. **Policy cache working**: Ask "what is your return policy?" - should respond instantly (<100ms)
2. **Cache stats logged**: Check logs for hit/miss rates
3. **Performance improved**: Compare Week 4 vs Week 3 response times
4. **No regressions**: All existing features still work

---

## Week 5: Streaming & Prompt Optimization Deployment

**New Features**:
- Real-time streaming responses (SSE)
- 78% token reduction via optimized prompts
- Feature-flagged MCP tool routing

### Prerequisites

✅ Week 4 deployed and stable  
✅ OpenRouter API configured (`OPENROUTER_API_KEY`)  
✅ All servers running (AI core, frontend, backend)

### Deployment Steps

#### Step 1: Verify Week 5 Code Deployed

```bash
# Check backend files exist
ls cove-ai-core/app/core/llm_streaming.py
ls cove-ai-core/app/routes/streaming.py
ls cove-ai-core/app/core/prompt_builder.py
ls cove-ai-core/data/prompt_config.json

# Check frontend files exist
ls frontend/src/hooks/useAgentStreaming.ts
ls frontend/src/app/api/agent-dev/query/stream/route.ts
```

#### Step 2: Streaming Endpoint (Already Live)

The streaming endpoint is **already active** on deployment:
```
POST /ai/agent/query/stream
```

Test it:
```bash
curl -N -X POST http://your-domain.com/ai/agent/query/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "hi"}'

# Expected: SSE events streaming tokens
```

#### Step 3: Prompt Optimization (Already Active)

Prompt optimization is **enabled by default**.

Verify:
```bash
cd cove-ai-core
python3 test_prompt_optimization.py

# Expected: "✅ PASSED! Achieved 78.3% reduction"
```

**To disable** (not recommended):
Edit `data/prompt_config.json`:
```json
{
  "features": {
    "use_optimized_prompts": false
  }
}
```

#### Step 4: Enable Streaming (Frontend) - OPTIONAL

**Default**: Streaming is **OFF** (uses blocking endpoint)

**To enable**:

1. **Add to production `.env`**:
```bash
NEXT_PUBLIC_USE_STREAMING=true
AI_CORE_URL=https://your-ai-core-domain.com
```

2. **Rebuild frontend**:
```bash
cd frontend
npm run build
pm2 restart frontend  # or your process manager
```

3. **Verify**: Visit agent-dev page, type "hi", should see word-by-word animation

#### Step 5: MCP Tool Routing (Optional)

MCP routing is **OFF by default** (uses direct tool calls).

**To enable** (optional):

Add to `.env`:
```bash
USE_MCP_TOOLS=true
```

Restart AI core:
```bash
pm2 restart ai-core
```

### Feature Flags Summary

| Feature | Flag | Default | Recommended |
|---------|------|---------|-------------|
| **Prompt Optimization** | `use_optimized_prompts` in config | ON | Keep ON ✅ |
| **Streaming** | `NEXT_PUBLIC_USE_STREAMING` | OFF | Enable gradually |
| **MCP Routing** | `USE_MCP_TOOLS` | OFF | Keep OFF (not needed) |

### Gradual Rollout (Recommended)

**Week 1: Internal Testing**
- Enable streaming on agent-dev only
- Monitor metrics for 3-7 days
- Gather team feedback

**Week 2: Beta Users**  
- Enable for 10% of users via feature flag
- A/B test streaming vs blocking
- Monitor: first token time, error rate, user satisfaction

**Week 3: Full Rollout**
- Gradually increase to 50%, then 100%
- Keep blocking endpoint as fallback
- Continue monitoring

### Monitoring Week 5 Features

**Streaming Metrics** (check AI core logs):
```bash
tail -f logs/app.log | grep "first_token"

# Look for:
# "🚀 First token in XXXms" (expect: 200-500ms)
# "✅ Streaming complete" (success confirmations)
```

**Prompt Optimization Metrics**:
```bash
tail -f logs/app.log | grep "template"

# Look for:
# "📝 Using template: greeting" (template selection)
# "system_prompt_tokens=~7" (token counts)
```

**Success Indicators**:
- First token time: <2s (expect: 200-500ms)
- Token reduction: 70-80% vs baseline
- Error rate: <1%
- User satisfaction maintained/improved

### Rollback Plan

**If streaming causes issues**:

1. **Quick disable** (frontend):
```bash
# Set in .env
NEXT_PUBLIC_USE_STREAMING=false

# Rebuild
npm run build && pm2 restart frontend
```

2. **Backend still works** - blocking endpoint `/ai/agent/query` untouched

**If prompts cause issues**:

Edit `data/prompt_config.json`:
```json
{
  "features": {
    "use_optimized_prompts": false
  }
}
```

Restart AI core - will fall back to default prompts.

### Week 5 Success Validation

Once deployed, verify:

1. **Streaming works**: Test in browser, see word-by-word text
2. **First token fast**: Check logs, should be 200-500ms
3. **Prompts optimized**: Verify 70-80% token reduction in logs
4. **No regressions**: All Week 4 features still work
5. **Cost savings**: Monitor API usage, should see ~78% reduction in input tokens

### Troubleshooting

**Problem**: Streaming not working  
**Check**: Frontend env variable set, frontend restarted  
**Fix**: Verify `NEXT_PUBLIC_USE_STREAMING=true` in `.env`, rebuild frontend

**Problem**: Slow responses  
**Check**: OpenRouter API status, prompt optimization enabled  
**Fix**: Verify templates exist in `data/prompts/`, check `prompt_config.json`

**Problem**: High error rate  
**Check**: Logs for specific errors  
**Fix**: Disable streaming temporarily, investigate, re-enable when fixed

### Additional Resources

- **Deployment Guide**: `WEEK5_DEPLOYMENT.md`
- **Complete Walkthrough**: `week5_complete_walkthrough.md`
- **Test Scripts**: `test_prompt_optimization.py`, `test_mcp_routing.py`

---

## Production Deployment Summary

| Week | Features | Deployment Status | Flags |
|------|----------|-------------------|-------|
| Week 4 | Cache, commerce tools | ✅ Deployed | `REDIS_URL` (optional) |
| **Week 5** | **Streaming, optimized prompts** | ✅ **Code deployed, features optional** | `NEXT_PUBLIC_USE_STREAMING` (OFF) |

**Current State**: Week 5 code is deployed, prompt optimization is ON, streaming is OFF (safe default).

**Recommended Action**: Keep as-is for stability, enable streaming gradually for testing.

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
