# Week 4 - Phase 5: Performance & Optimization Plan

**Status**: Planning  
**Date**: 2025-12-06

---

## 🎯 Objectives

Optimize agent response time and resource usage through:
1. **Parallel Execution** - Run independent operations concurrently
2. **TTL Caching** - Cache expensive operations with time-to-live
3. **Performance Measurement** - Track and log response times

**Target Improvements**:
- 30-50% faster response on complex queries
- <100ms cache hits for common queries
- Clear performance metrics for monitoring

---

## 📋 Optimizations

### 1. Parallel Retrieval with `asyncio.gather`

**Problem**: Sequential calls waste time
```python
# Current (SLOW):
recs = await _call_recs_suggest(...)  # 500ms
rag = await _call_rag(...)            # 300ms
# Total: 800ms
```

**Solution**: Run concurrently
```python
# Optimized (FAST):
recs, rag = await asyncio.gather(
    _call_recs_suggest(...),
    _call_rag(...)
)
# Total: 500ms (max of both)
```

**Where to Apply**:
- Recommendations + RAG queries
- Cart + order history queries
- Any independent async operations

---

### 2. TTL Cache for Recommendations

**Problem**: Same queries repeated frequently

**Solution**: Simple in-memory cache with TTL

```python
# app/core/cache.py
import time
from typing import Any, Dict, Optional

_CACHE: Dict[str, tuple[float, Any]] = {}
DEFAULT_TTL = 600.0  # 10 minutes

def get_cached(key: str) -> Optional[Any]:
    """Get cached value if not expired."""
    now = time.time()
    entry = _CACHE.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if expires_at < now:
        _CACHE.pop(key, None)
        return None
    return value

def set_cached(key: str, value: Any, ttl: float = DEFAULT_TTL) -> None:
    """Set cached value with TTL."""
    _CACHE[key] = (time.time() + ttl, value)

def clear_cache() -> None:
    """Clear all cached values."""
    _CACHE.clear()
```

**Cache Key Strategy**:
```python
def make_cache_key(query: str, filters: dict) -> str:
    """Create stable cache key from query params."""
    import hashlib
    import json
    
    # Sort filters for consistent keys
    sorted_filters = json.dumps(filters, sort_keys=True)
    key_str = f"{query}:{sorted_filters}"
    return hashlib.md5(key_str.encode()).hexdigest()
```

**Usage**:
```python
# In recommendations flow
cache_key = make_cache_key(query, rec_filters)
cached_result = get_cached(cache_key)

if cached_result:
    return cached_result  # <100ms

# Not cached, fetch fresh
result = await _call_recs_suggest(payload)
set_cached(cache_key, result, ttl=600)
return result
```

---

### 3. Static Policy Cache

**Problem**: Same policy questions asked repeatedly

**Solution**: Pre-computed answers for common questions

```python
# app/core/policy_cache.py
POLICY_ANSWERS = {
    "shipping_time": {
        "answer": "We offer 2-5 business days shipping within the EU, and 5-10 business days worldwide.",
        "keywords": ["shipping", "delivery", "how long", "when will"]
    },
    "return_policy": {
        "answer": "30-day return policy. Items must be unworn with tags attached. Free returns within EU.",
        "keywords": ["return", "refund", "exchange", "send back"]
    },
    "wash_care": {
        "answer": "Machine wash cold, tumble dry low. Do not bleach. Iron on low heat if needed.",
        "keywords": ["wash", "care", "clean", "shrink"]
    },
    "sizing": {
        "answer": "Our items fit true to size. Check our size guide for measurements. Free exchanges if size doesn't fit.",
        "keywords": ["size", "fit", "measurements", "sizing"]
    }
}

def get_policy_answer(query: str) -> Optional[str]:
    """Check if query matches known policy question."""
    query_lower = query.lower()
    
    for policy_id, policy in POLICY_ANSWERS.items():
        if any(kw in query_lower for kw in policy["keywords"]):
            return policy["answer"]
    
    return None
```

---

### 4. Performance Measurement

**Solution**: Add timing decorators and logging

```python
# app/core/performance.py
import time
import logging
from functools import wraps
from typing import Callable

log = logging.getLogger("cove.performance")

def measure_time(operation_name: str):
    """Decorator to measure and log execution time."""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start) * 1000
                log.info(f"{operation_name} completed in {duration_ms:.0f}ms")
                return result
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                log.error(f"{operation_name} failed after {duration_ms:.0f}ms: {e}")
                raise
        return wrapper
    return decorator
```

**Usage**:
```python
@measure_time("recommend_products")
async def _call_recs_suggest(payload):
    # ... implementation
    pass
```

---

## 🔨 Implementation Steps

### Step 1: Create Cache Layer

**File**: `app/core/cache.py`
- TTL cache implementation
- Cache key generation
- Cache stats tracking

**File**: `app/core/policy_cache.py`
- Static policy answers
- Keyword matching

**Test**:
```python
# Test TTL expiry
set_cached("test", "value", ttl=1)
assert get_cached("test") == "value"
time.sleep(2)
assert get_cached("test") is None
```

---

### Step 2: Add Parallel Execution

**File**: `app/routes/agent.py`

**Before**:
```python
# Sequential (SLOW)
if wants_recs:
    rec_resp = await _call_recs_suggest(...)
    # 500ms

# Also might need RAG
if needs_info:
    rag_resp = await _call_rag(...)
    # 300ms
```

**After**:
```python
# Parallel (FAST)
tasks = []
if wants_recs:
    tasks.append(_call_recs_suggest(...))
if needs_info:
    tasks.append(_call_rag(...))

if tasks:
    results = await asyncio.gather(*tasks)
    rec_resp = results[0] if wants_recs else None
    rag_resp = results[1] if needs_info else None
```

---

### Step 3: Integrate Caching

**Recommendations Cache**:
```python
# In agent.py recommendations flow
cache_key = make_cache_key(rec_query, rec_filters)
cached_recs = get_cached(f"recs:{cache_key}")

if cached_recs:
    debug_plan["cache_hit"] = True
    return AgentOut(
        kind="recommendations",
        answer=cached_recs["answer"],
        items=cached_recs["items"],
        debug_plan=debug_plan
    )

# Not cached, fetch fresh
rec_resp = await _call_recs_suggest(rec_payload)
# Cache for 10 minutes
set_cached(f"recs:{cache_key}", {
    "answer": answer_text,
    "items": items
}, ttl=600)
```

**Policy Cache**:
```python
# In LLM chat fallback
if intent_kind == "policy":
    # Check static cache first
    policy_answer = get_policy_answer(body.message)
    if policy_answer:
        debug_plan["policy_cache_hit"] = True
        return AgentOut(
            kind="answer",
            answer=policy_answer,
            citations=[],
            items=[],
            debug_plan=debug_plan
        )
    
    # Not in cache, use LLM
    llm_resp = await _call_llm_with_history(...)
```

---

### Step 4: Add Performance Logging

**File**: `app/core/performance.py`
- Timing decorator
- Performance metrics collection

**Usage**:
```python
from app.core.performance import measure_time

@measure_time("agent_query")
async def agent_query(body: AgentIn):
    # ... existing implementation
    pass

@measure_time("recs_suggest")
async def _call_recs_suggest(payload):
    # ... existing implementation
    pass
```

---

## 🧪 Testing Plan

### Test 1: Parallel Execution

```python
import asyncio
import time

async def test_parallel():
    start = time.time()
    
    # Sequential
    await slow_task_1()  # 500ms
    await slow_task_2()  # 300ms
    sequential_time = time.time() - start
    
    start = time.time()
    
    # Parallel
    await asyncio.gather(
        slow_task_1(),
        slow_task_2()
    )
    parallel_time = time.time() - start
    
    speedup = sequential_time / parallel_time
    print(f"Speedup: {speedup:.1f}x")
    assert speedup > 1.5  # At least 50% faster
```

---

### Test 2: Cache Effectiveness

```python
async def test_cache():
    # First call (cache miss)
    start = time.time()
    result1 = await recommend_products(query="black hoodie")
    first_call_time = time.time() - start
    
    # Second call (cache hit)
    start = time.time()
    result2 = await recommend_products(query="black hoodie")
    second_call_time = time.time() - start
    
    # Cache should be >5x faster
    speedup = first_call_time / second_call_time
    print(f"Cache speedup: {speedup:.1f}x")
    assert speedup > 5
    assert result1 == result2
```

---

### Test 3: Performance Metrics

```bash
# Run agent query and check logs
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -d '{"message": "black hoodie size M"}'

# Expected logs:
# INFO: agent_query completed in 523ms
# INFO: recs_suggest completed in 487ms
# INFO: cache_hit=False
```

---

## 📊 Success Metrics

| Metric | Before | Target | Method |
|--------|--------|--------|--------|
| Complex query latency | 800ms | 500ms | Parallel execution |
| Common query (cached) | 500ms | <100ms | TTL cache |
| Policy questions | 1200ms | <50ms | Static cache |
| Memory usage | Baseline | <+50MB | Cache size limit |

---

## ⚠️ Risks & Mitigation

### Risk 1: Cache Memory Bloat
**Mitigation**: 
- Max cache size (1000 entries)
- TTL expiry (10 minutes)
- Cache eviction on memory pressure

### Risk 2: Stale Cache Data
**Mitigation**:
- Short TTL (10 minutes)
- Cache invalidation on catalog updates
- Version key in cache entries

### Risk 3: Race Conditions in asyncio.gather
**Mitigation**:
- No shared state between tasks
- Each task independent
- Proper error handling per task

---

## 🔄 Rollback Plan

If issues arise:
1. **Disable caching**: Set TTL=0
2. **Disable parallel**: Comment out asyncio.gather
3. **Revert to sequential**: Use original code path

All optimizations are **additive** and can be disabled independently.

---

## ✅ Phase 5 Checklist

- [ ] Create `app/core/cache.py` with TTL cache
- [ ] Create `app/core/policy_cache.py` with static answers
- [ ] Create `app/core/performance.py` with timing decorators
- [ ] Add parallel execution to recommendations flow
- [ ] Integrate rec cache in agent.py
- [ ] Integrate policy cache in agent.py
- [ ] Add performance logging to key functions
- [ ] Test cache hit/miss rates
- [ ] Test parallel speedup
- [ ] Verify no regression in accuracy
- [ ] Document performance gains

---

## 📝 Notes

- **Cache Strategy**: Simple in-memory, single-process
- **Future**: Redis for multi-process deployments
- **TTL**: Tunable via environment variable
- **Monitoring**: Structured logs for cache hit rates

**Ready to implement**: YES  
**Estimated Time**: 2-3 hours  
**Risk Level**: LOW (all optimizations reversible)
