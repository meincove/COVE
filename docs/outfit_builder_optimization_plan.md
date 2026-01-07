# Outfit Builder Performance Optimization Plan
**Based on 2024 Multi-Agent LLM Best Practices**

## Current Problem
- Outfit builder takes **30+ seconds** (times out)
- **6+ sequential LLM calls**: Intent → Occasion → Stylist → Budget → Fit → Synthesis
- Each LLM call: 2-5 seconds = **12-30+ seconds total**
- Users see nothing during this time (poor UX)

---

## Research-Backed Solutions

### 🎯 **Priority 1: Parallel Execution** (HIGHEST IMPACT)

**Problem**: Agents run sequentially  
**Solution**: Run independent agents in parallel using LangGraph's fan-out/fan-in

#### Implementation
```python
# Current (Sequential - SLOW)
occasion_result = await occasion_analyzer.analyze()  # 3s
stylist_result = await stylist.build_outfit()        # 5s  
budget_result = await budget.optimize()              # 3s
fit_result = await fit.recommend_sizes()             # 2s
# Total: 13 seconds

# Optimized (Parallel - FAST)
results = await asyncio.gather(
    occasion_analyzer.analyze(),  # Run all
    stylist.build_outfit(),        # in parallel
    budget.optimize(),             # at the same time
    fit.recommend_sizes()
)
# Total: 5 seconds (longest task)
```

**Expected Improvement**: **60-70% latency reduction** (13s → 5s)

**Source**: M1-Parallel Framework shows 60% latency reduction with parallel multi-agent execution[1]

---

### 🎯 **Priority 2: Aggressive Caching** (MEDIUM IMPACT)

**Problem**: Same queries call LLM every time  
**Solution**: Cache LLM responses, product searches, embeddings

#### Implementation
```python
# Cache LLM responses
@lru_cache(maxsize=1000)
def get_occasion_analysis(occasion: str, style: str) -> dict:
    # Cache key: (occasion, style)
    return llm_call(...)

# Cache product searches
@lru_cache(maxsize=500)
def search_products(category: str, filters: dict) -> list:
    # Cache key: (category, filters_hash)
    return vector_search(...)

# Prompt caching (OpenRouter/Anthropic)
# Cache static prompt prefixes
system_prompt = "You are a fashion stylist..."  # Cached
user_query = f"Build outfit for {occasion}"      # Dynamic
```

**Expected Improvement**: **50-80% faster** for repeated queries

**Source**: LangChain docs recommend aggressive caching for LLM responses, retrievals, and embeddings[2]

---

### 🎯 **Priority 3: Streaming Responses** (UX IMPROVEMENT)

**Problem**: User sees nothing for 30 seconds  
**Solution**: Stream intermediate results as they complete

#### Implementation
```python
# Stream thinking steps
yield {"status": "Analyzing occasion..."}
occasion = await occasion_analyzer.analyze()

yield {"status": "Finding products...", "occasion": occasion}
products = await stylist.search_products()

yield {"status": "Optimizing budget...", "products": products[:3]}
budget = await budget.optimize()

yield {"status": "Complete!", "outfit": final_outfit}
```

**Expected Improvement**: **Perceived latency reduced by 70%**

**Source**: Streaming tokens and intermediate results makes apps feel more responsive[3]

---

### 🎯 **Priority 4: Use Smaller/Faster Models** (COST + SPEED)

**Problem**: Using GPT-4o for all tasks  
**Solution**: Use smaller models for simple tasks

#### Implementation
```python
# Intent classification: GPT-4o-mini (fast, cheap)
intent = await classify_intent(model="gpt-4o-mini")

# Occasion analysis: GPT-4o-mini (simple task)
occasion = await analyze_occasion(model="gpt-4o-mini")

# Outfit synthesis: GPT-4o (complex reasoning)
outfit = await synthesize_outfit(model="gpt-4o")
```

**Expected Improvement**: **2-3x faster** for simple tasks, **50% cost reduction**

**Source**: Use smaller models for routing/simple tasks, reserve powerful models for complex reasoning[2]

---

### 🎯 **Priority 5: Async Everything** (FOUNDATION)

**Problem**: Blocking I/O operations  
**Solution**: Use async/await for all LLM calls, DB queries, API requests

#### Implementation
```python
# Already using async - GOOD!
async def execute_workflow(...):
    # All LLM calls should be async
    result = await completion(...)
    
    # All DB queries should be async
    products = await db.query(...)
    
    # All API calls should be async
    weather = await httpx.get(...)
```

**Expected Improvement**: **Foundation for parallel execution**

**Source**: Async is essential for non-blocking operations and parallel execution[4]

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 hours)
1. ✅ **Add streaming** - Show progress to user
2. ✅ **Switch to gpt-4o-mini** for intent/occasion
3. ✅ **Add basic caching** for LLM responses

**Expected Result**: 30s → 15s, better UX

### Phase 2: Parallel Execution (2-3 hours)
1. ✅ **Identify independent agents** (stylist, budget, fit can run parallel)
2. ✅ **Implement asyncio.gather()** for parallel execution
3. ✅ **Test and validate** results

**Expected Result**: 15s → 5-8s

### Phase 3: Advanced Optimization (3-4 hours)
1. ✅ **Implement comprehensive caching** (products, embeddings, prompts)
2. ✅ **Add prompt caching** (Anthropic/OpenRouter)
3. ✅ **Optimize product search** (pre-filter, batch queries)

**Expected Result**: 5-8s → 2-4s (cached), 5-8s (uncached)

---

## Code Changes Required

### File: `/Users/ssg/Desktop/COVE/cove-ai-core/app/agents/multi_agent_orchestrator.py`

#### Change 1: Add Parallel Execution
```python
# Line ~220 - Replace sequential execution
async def _execute_with_checkpoints(self, workflow, state):
    # OLD: Sequential
    for step in workflow["steps"]:
        await self._execute_agent(step, state)
    
    # NEW: Parallel where possible
    independent_steps = self._get_independent_steps(workflow)
    if independent_steps:
        results = await asyncio.gather(*[
            self._execute_agent(step, state) 
            for step in independent_steps
        ])
```

#### Change 2: Add Streaming
```python
# Line ~185 - Add streaming support
async def execute_workflow(self, workflow_name, query, context, stream=False):
    if stream:
        async for update in self._execute_streaming(workflow, state):
            yield update
    else:
        return await self._execute_standard(workflow, state)
```

#### Change 3: Add Caching
```python
# Line ~50 - Add cache decorator
from functools import lru_cache

@lru_cache(maxsize=1000)
def _cache_llm_response(prompt_hash: str, model: str):
    # Cache LLM responses
    pass
```

### File: `/Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py`

#### Change: Enable Streaming
```python
# Line ~1640 - Add streaming to outfit builder
if intent == "outfit_builder":
    # Stream results to user
    async for update in orchestrator.execute_workflow(
        workflow_name="outfit_builder",
        query=q,
        context={...},
        stream=True  # Enable streaming
    ):
        emit_event('thinking:step', update)
```

---

## Expected Final Performance

| Scenario | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|----------|---------|---------------|---------------|---------------|
| **First Request** | 30s+ | 15s | 5-8s | 5-8s |
| **Cached Request** | 30s+ | 15s | 5-8s | **2-4s** |
| **User Experience** | ❌ Timeout | ⚠️ Slow | ✅ Good | ✅ Excellent |

---

## Monitoring & Validation

### Add Performance Tracking
```python
import time

async def execute_workflow(...):
    start = time.time()
    
    # Track each agent
    timings = {}
    timings['occasion'] = await timed_execute(occasion_analyzer)
    timings['stylist'] = await timed_execute(stylist)
    timings['budget'] = await timed_execute(budget)
    
    total = time.time() - start
    log.info(f"Workflow completed in {total:.2f}s: {timings}")
```

### Success Metrics
- ✅ **Latency**: < 8s for uncached, < 4s for cached
- ✅ **Success Rate**: > 95%
- ✅ **User Satisfaction**: Streaming shows progress
- ✅ **Cost**: 50% reduction with smaller models

---

## References

[1] M1-Parallel Framework - 60% latency reduction with parallel multi-agent execution  
[2] LangChain Performance Optimization Guide - Caching, smaller models, streaming  
[3] LangGraph Best Practices - Async, parallel execution, streaming  
[4] Multi-Agent LLM Orchestration 2024 - Comprehensive optimization strategies  

---

## Next Steps

1. **Implement Phase 1** (streaming + smaller models) - **IMMEDIATE**
2. **Test performance** - Measure before/after
3. **Implement Phase 2** (parallel execution) - **HIGH PRIORITY**
4. **Monitor and iterate** - Track metrics, optimize further

**Goal**: Get outfit builder from 30s+ → **5-8s** within 1 day of work.
