# Week 6 - Hardening & Safe Optimizations

**Goal**: Production-ready improvements with measurable impact

**Duration**: 7 days  
**Risk Level**: 🟢 Low (all safe, proven techniques)

---

## Overview

Week 5 delivered amazing results (78% token reduction, 273ms first-token). Now we make it bulletproof and squeeze out more performance through safe, proven optimizations.

**Focus Areas**:
1. **Hardening** - Better error handling, timeouts, monitoring
2. **Caching** - Cache common responses for instant replies
3. **Optimization** - Intent classification improvements
4. **Monitoring** - Better metrics and observability
5. **Documentation** - Update all docs

---

## Phase 1: MCP Hardening (Days 1-2)

### Goal: Make MCP integration production-ready

#### 1.1 Error Handling Improvements

**Current State**: Basic try/catch in MCP client  
**Target**: Comprehensive error handling with retries

**Files to Modify**:
- `app/core/mcp_client.py`
- `app/cove_mcp/commerce_server.py`

**Changes**:

```python
# Add retry logic
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=0.1, max=2)
)
async def call_tool_with_retry(tool_name, args):
    # Existing call logic
    pass

# Better error messages
try:
    result = await call_tool(tool_name, args)
except ToolNotFoundError as e:
    return {
        "error": "tool_not_found",
        "message": f"Tool '{tool_name}' is not available",
        "available_tools": list(config["tools"].keys())
    }
except ValidationError as e:
    return {
        "error": "invalid_arguments",
        "message": str(e),
        "expected_schema": get_tool_schema(tool_name)
    }
```

#### 1.2 Timeout Management

**Add timeouts to all MCP calls**:

```python
# In mcp_client.py
async def call_tool(self, tool_name, args, timeout=30):
    try:
        return await asyncio.wait_for(
            self._do_call(tool_name, args),
            timeout=timeout
        )
    except asyncio.TimeoutError:
        logger.error(f"Tool '{tool_name}' timed out after {timeout}s")
        raise ToolTimeoutError(tool_name, timeout)
```

#### 1.3 Enhanced Logging

**Add structured logging**:

```python
# Log all tool calls
logger.info("mcp_tool_call", extra={
    "tool_name": tool_name,
    "route": "mcp" if use_mcp else "direct",
    "user_id": context.get("user_id"),
    "latency_ms": duration_ms,
    "success": success,
    "error": error_msg if error else None
})
```

**Success Criteria**:
- [ ] All tool calls have timeouts
- [ ] Retry logic for transient failures
- [ ] Structured error responses
- [ ] Comprehensive logging

---

## Phase 2: Response Caching (Days 2-3)

### Goal: Cache common responses for instant replies

#### 2.1 Identify Cacheable Intents

**High-value targets**:
- `greeting` - "hi", "hello" → Always same response
- `generic` - "what is cove", "tell me about brand" → Rarely changes
- `policy` - "return policy", "shipping" → Static info

**Implementation**:

```python
# File: app/core/response_cache.py (NEW)

from app.core.cache import get_cached, set_cached
import hashlib

CACHEABLE_INTENTS = {
    "greeting": 3600,      # 1 hour TTL
    "generic": 7200,       # 2 hours
    "policy": 86400,       # 24 hours
    "small_talk": 3600,    # 1 hour
}

def get_cache_key(intent: str, message: str) -> str:
    """Generate cache key from intent + message."""
    # Normalize message
    normalized = message.lower().strip()
    
    # Hash for consistent keys
    message_hash = hashlib.md5(normalized.encode()).hexdigest()[:8]
    
    return f"response_cache:{intent}:{message_hash}"


async def get_cached_response(
    intent: str,
    message: str
) -> Optional[str]:
    """Get cached response if available."""
    if intent not in CACHEABLE_INTENTS:
        return None
    
    cache_key = get_cache_key(intent, message)
    cached = get_cached(cache_key)
    
    if cached:
        logger.info(f"Cache hit for {intent}: {message[:30]}...")
        return cached.get("response")
    
    return None


async def cache_response(
    intent: str,
    message: str,
    response: str
) -> None:
    """Cache response for future use."""
    if intent not in CACHEABLE_INTENTS:
        return
    
    cache_key = get_cache_key(intent, message)
    ttl = CACHEABLE_INTENTS[intent]
    
    set_cached(cache_key, {
        "response": response,
        "intent": intent,
        "cached_at": time.time()
    }, ttl=ttl)
    
    logger.info(f"Cached response for {intent} (TTL: {ttl}s)")
```

#### 2.2 Integration with Streaming Endpoint

**Modify `app/routes/streaming.py`**:

```python
from app.core.response_cache import get_cached_response, cache_response

async def agent_query_stream(body: AgentIn):
    # 1. Classify intent
    intent_kind = classify_intent_simple(body.message)
    
    # 2. Check cache
    cached = await get_cached_response(intent_kind, body.message)
    if cached:
        # Stream cached response token by token
        yield f"event: intent\n"
        yield f"data: {{...}}\n\n"
        
        yield f"event: stream_start\n"
        yield f"data: {{}}\n\n"
        
        for token in cached.split():
            yield f"event: token\n"
            yield f"data: {{\"token\": \"{token} \"}}\n\n"
        
        yield f"event: stream_end\n"
        yield f"data: {{\"cached\": true}}\n\n"
        return
    
    # 3. Generate response (existing logic)
    messages, prompt_meta = build_messages_for_intent(...)
    
    accumulated = ""
    async for token in stream_openai_completion(...):
        accumulated += token
        yield f"event: token\n"
        yield f"data: {{\"token\": \"{token}\"}}\n\n"
    
    # 4. Cache for future
    await cache_response(intent_kind, body.message, accumulated)
```

**Success Criteria**:
- [ ] Caching module created
- [ ] Integrated with streaming endpoint
- [ ] Cache hit/miss logged
- [ ] Estimated 30-40% cache hit rate for common queries

---

## Phase 3: Intent Optimization (Days 3-4)

### Goal: Improve intent classification accuracy & speed

#### 3.1 Better Intent Classification

**Current**: Simple regex/keyword matching  
**Target**: Lightweight LLM classification with caching

```python
# File: app/core/intent_classifier.py (NEW)

from app.core.cache import get_cached, set_cached
from app.providers.llm import LLMClient

# Cache intent classifications
def get_intent_cache_key(message: str) -> str:
    normalized = message.lower().strip()
    return f"intent:{hashlib.md5(normalized.encode()).hexdigest()[:12]}"


async def classify_intent_llm(message: str) -> str:
    """
    Use lightweight LLM for intent classification.
    
    Benefits:
    - More accurate than regex
    - Handles edge cases
    - Still fast (uses gpt-4o-mini)
    """
    # Check cache first
    cache_key = get_intent_cache_key(message)
    cached = get_cached(cache_key)
    if cached:
        return cached["intent"]
    
    # Use small, fast model for classification
    client = LLMClient(model="openrouter:openai/gpt-4o-mini")
    
    prompt = f"""Classify this message intent. Return ONLY the intent name.

Intents: greeting, small_talk, discover, lookup_product, size_fit, policy, history_meta, generic, unknown

Message: {message}

Intent:"""
    
    result = await client.generate([
        {"role": "user", "content": prompt}
    ])
    
    intent = result.strip().lower()
    
    # Cache for 1 hour
    set_cached(cache_key, {"intent": intent}, ttl=3600)
    
    return intent
```

#### 3.2 Hybrid Approach

```python
# Use regex for obvious cases, LLM for ambiguous
async def classify_intent_hybrid(message: str) -> str:
    # Fast path: obvious cases
    if message.lower() in ["hi", "hello", "hey"]:
        return "greeting"
    
    if "hoodie" in message or "show me" in message:
        return "discover"
    
    if "return" in message and "policy" in message:
        return "policy"
    
    # Slow path: use LLM for ambiguous
    return await classify_intent_llm(message)
```

**Success Criteria**:
- [ ] LLM-based intent classifier
- [ ] Classic intent classification cached
- [ ] Hybrid approach for best of both worlds
- [ ] Measured accuracy improvement

---

## Phase 4: Enhanced Monitoring (Days 4-5)

### Goal: Better visibility into system performance

#### 4.1 Metrics Dashboard Endpoint

```python
# File: app/routes/metrics.py (NEW)

from fastapi import APIRouter
from app.core.mcp_client import get_mcp_client
from app.core.prompt_builder import get_optimization_stats
from app.core.cache import get_cache_stats

router = APIRouter()

@router.get("/metrics/dashboard")
async def get_metrics_dashboard():
    """Comprehensive metrics for monitoring."""
    
    # MCP routing metrics
    mcp_client = get_mcp_client()
    mcp_metrics = mcp_client.get_metrics()
    
    # Prompt optimization stats
    prompt_stats = get_optimization_stats()
    
    # Cache performance
    cache_stats = get_cache_stats()
    
    # Response cache (new)
    from app.core.response_cache import get_cache_stats as get_response_cache_stats
    response_cache_stats = get_response_cache_stats()
    
    return {
        "mcp": mcp_metrics,
        "prompts": prompt_stats,
        "cache": cache_stats,
        "response_cache": response_cache_stats,
        "timestamp": time.time()
    }


@router.get("/metrics/streaming")
async def get_streaming_metrics():
    """Streaming-specific metrics."""
    # Collect from logs or in-memory tracker
    return {
        "avg_first_token_ms": 273,
        "avg_total_time_ms": 1200,
        "request_count": 1523,
        "success_rate": 0.98,
        "cache_hit_rate": 0.35
    }
```

#### 4.2 Health Check Endpoint

```python
@router.get("/health")
async def health_check():
    """Comprehensive health check."""
    health = {
        "status": "healthy",
        "checks": {}
    }
    
    # Check OpenRouter API
    try:
        client = LLMClient()
        await client.generate([{"role": "user", "content": "test"}])
        health["checks"]["openrouter"] = "ok"
    except Exception as e:
        health["checks"]["openrouter"] = f"error: {e}"
        health["status"] = "degraded"
    
    # Check cache
    try:
        get_cache_stats()
        health["checks"]["cache"] = "ok"
    except Exception as e:
        health["checks"]["cache"] = f"error: {e}"
    
    # Check MCP tools
    try:
        client = get_mcp_client()
        health["checks"]["mcp_client"] = "ok"
    except Exception as e:
        health["checks"]["mcp_client"] = f"error: {e}"
    
    return health
```

**Success Criteria**:
- [ ] Metrics dashboard endpoint
- [ ] Health check endpoint
- [ ] Structured logging enabled
- [ ] Easy monitoring setup

---

## Phase 5: Production Deployment Prep (Days 5-7)

### Goal: Everything ready for production

#### 5.1 Environment Variable Validation

```python
# File: app/core/config_validator.py (NEW)

import os
import logging

logger = logging.getLogger(__name__)

REQUIRED_VARS = {
    "OPENROUTER_API_KEY": "OpenRouter API key for LLM calls",
    "GEN_MODEL": "Default LLM model to use",
}

OPTIONAL_VARS = {
    "USE_MCP_TOOLS": "Enable MCP tool routing (default: false)",
    "NEXT_PUBLIC_USE_STREAMING": "Enable streaming (default: false)",
    "REDIS_HOST": "Redis host for cache (optional)",
    "LOG_LEVEL": "Logging level (default: INFO)",
}

def validate_config():
    """Validate all required configuration."""
    errors = []
    warnings = []
    
    # Check required
    for var, description in REQUIRED_VARS.items():
        if not os.getenv(var):
            errors.append(f"Missing required env var: {var} ({description})")
    
    # Check optional
    for var, description in OPTIONAL_VARS.items():
        if not os.getenv(var):
            warnings.append(f"Optional env var not set: {var} ({description})")
    
    if errors:
        logger.error("Configuration validation failed:")
        for error in errors:
            logger.error(f"  - {error}")
        raise RuntimeError("Invalid configuration")
    
    if warnings:
        logger.warning("Configuration warnings:")
        for warning in warnings:
            logger.warning(f"  - {warning}")
    
    logger.info("✅ Configuration validated successfully")

# Run on startup
validate_config()
```

#### 5.2 Graceful Degradation

```python
# File: app/core/graceful_degradation.py (NEW)

async def safe_stream_response(body: AgentIn):
    """
    Stream response with multiple fallback layers.
    """
    try:
        # Layer 1: Try streaming with cache
        return await stream_with_cache(body)
    except Exception as e:
        logger.warning(f"Streaming failed: {e}, trying without cache")
        
        try:
            # Layer 2: Try streaming without cache
            return await stream_without_cache(body)
        except Exception as e:
            logger.error(f"All streaming failed: {e}, using blocking")
            
            # Layer 3: Fallback to blocking
            return await blocking_response(body)
```

#### 5.3 Documentation Updates

**Files to Update**:
- `DEPLOYMENT_CACHE.md` - Add Week 6 improvements
- `WEEK5_DEPLOYMENT.md` - Add caching section
- `README.md` - Update with new features

**New Docs**:
- `docs/monitoring.md` - How to monitor the system
- `docs/caching-strategy.md` - Caching architecture
- `docs/troubleshooting.md` - Common issues & fixes

**Success Criteria**:
- [ ] All docs updated
- [ ] New monitoring guide created
- [ ] Troubleshooting guide available

---

## User Review Required

> [!IMPORTANT]
> **Key Decisions Needed**:
>
> 1. **Response Caching**: Should we cache common responses?
>    - Pros: 30-40% faster for repeated queries
>    - Cons: Responses might feel "canned"
>
> 2. **LLM Intent Classification**: Use lightweight LLM for intent?
>    - Pros: More accurate
>    - Cons: Adds 50-100ms latency
>
> 3. **Monitoring Endpoints**: Make metrics publicly accessible?
>    - Recommend: Add authentication before exposing

---

## Proposed Changes Summary

### New Files (8)
1. `app/core/response_cache.py` - Response caching logic
2. `app/core/intent_classifier.py` - Improved intent classification
3. `app/routes/metrics.py` - Metrics & health endpoints
4. `app/core/config_validator.py` - Config validation
5. `app/core/graceful_degradation.py` - Fallback logic
6. `docs/monitoring.md` - Monitoring guide
7. `docs/caching-strategy.md` - Caching architecture
8. `docs/troubleshooting.md` - Troubleshooting guide

### Modified Files (4)
1. `app/core/mcp_client.py` - Better error handling, timeouts, retries
2. `app/routes/streaming.py` - Integrate caching
3. `app/main.py` - Add metrics router, config validation
4. `DEPLOYMENT_CACHE.md` - Week 6 updates

### Configuration Changes
1. Add to `.env`:
   ```bash
   # Week 6 features
   ENABLE_RESPONSE_CACHE=true
   RESPONSE_CACHE_TTL=3600
   USE_LLM_INTENT_CLASSIFICATION=false  # Optional
   LOG_LEVEL=INFO
   ```

---

## Verification Plan

### Automated Tests
```bash
# Test response caching
python3 test_response_cache.py

# Test intent classification
python3 test_intent_classification.py

# Test metrics endpoints
curl http://localhost:8000/metrics/dashboard
curl http://localhost:8000/health
```

### Manual Testing
1. Test greeting caching (should be instant on 2nd+ request)
2. Test policy caching (should be instant)
3. Verify cache expiry (wait 1 hour, should regenerate)
4. Check metrics dashboard shows accurate stats
5. Test fallback (disable cache, should still work)

### Performance Testing
```bash
# Baseline (no cache)
hey -n 100 -c 10 http://localhost:8000/ai/agent/query/stream

# With cache
hey -n 100 -c 10 http://localhost:8000/ai/agent/query/stream
# Expect: 30-40% faster on average
```

---

## Success Metrics

| Metric | Week 5 | Week 6 Target |
|--------|--------|---------------|
| **First Token Time** | 273ms | <250ms (with cache) |
| **Cache Hit Rate** | 0% | 30-40% |
| **Error Rate** | <1% | <0.5% |
| **Uptime** | 99% | 99.5% |
| **Average Response Time** | 1.2s | <1s (with cache) |

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Cache invalidation bugs | Short TTLs, monitoring |
| Increased complexity | Comprehensive tests |
| Cache storage limits | TTL-based eviction |
| Monitoring overhead | Lazy metrics collection |

---

## Timeline

**Day 1**: MCP hardening (error handling, timeouts)  
**Day 2**: Response caching implementation  
**Day 3**: Intent classification improvements  
**Day 4**: Monitoring & metrics  
**Day 5**: Documentation updates  
**Day 6**: Testing & validation  
**Day 7**: Production deployment prep

**Total**: 7 days, low risk, high value

---

**Status**: ✅ Ready for review and implementation

**Recommendation**: Start with Phase 1 (MCP hardening) and Phase 2 (caching) - highest impact, lowest risk.
