# Phase 2: Product Recommender MCP Agent - Implementation Plan

## Overview

Build an intelligent, config-driven product recommendation MCP agent that provides personalized suggestions using vector embeddings, user history, and contextual understanding.

## User Review Required

> [!IMPORTANT]
> **No Shortcuts Approach**
> - Full config-driven design (zero hardcoding)
> - Comprehensive testing suite
> - Production monitoring from day 1
> - Performance benchmarks
> - Documentation throughout

## Proposed Changes

### Product Recommender Architecture

#### [NEW] [recommender_config.json](file:///Users/ssg/Desktop/COVE/cove-ai-core/data/recommender_config.json)

Complete configuration for recommendation engine:
- **Embedding models**: Text & image embeddings
- **Ranking strategies**: Popularity, similarity, personalization
- **Filter parameters**: Price, type, tier, availability
- **Performance tuning**: Cache settings, batch sizes
- **Fallback rules**: When to use generic vs personalized

---

### MCP Agent Implementation

#### [NEW] [product_recommender/recommender.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/product_recommender/recommender.py)

Core recommendation engine with:
- **Vector similarity search** using embeddings
- **Personalization** based on user history & AI profile
- **Multi-factor ranking**: Combine similarity, popularity, freshness
- **Filter application**: Price, type, tier constraints
- **A/B testing hooks** for experimentation

**Key Methods**:
```python
def recommend(
    query: str,
    filters: Dict[str, Any],
    user_context: Dict[str, Any],
    limit: int = 10
) -> List[Product]
```

#### [NEW] [product_recommender/server.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/product_recommender/server.py)

MCP server wrapper exposing:
- `recommend_products` tool
- `get_similar_products` tool  
- `get_personalized_feed` tool
- `get_recommender_config` tool

---

### Vector Embeddings Integration

#### [MODIFY] [vector/store.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/vector/store.py)

Enhance vector store with:
- **Hybrid search**: Text + image embeddings
- **Filtered search**: Apply constraints before similarity
- **Batch operations**: Efficient bulk retrieval
- **Caching layer**: Redis for hot vectors

---

### Catalog API Integration

#### [NEW] [product_recommender/catalog_client.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/product_recommender/catalog_client.py)

Dedicated catalog client:
- **Product enrichment**: Add images, inventory, pricing
- **Batch fetching**: Minimize API calls
- **Error handling**: Graceful degradation
- **Caching**: Reduce backend load

---

### Orchestrator Integration

#### [MODIFY] [routes/agent.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py)

Update orchestrator to use MCP recommender:
- Replace direct `/ai/recs/suggest` calls
- Add MCP client for product recommender
- Implement fallback to legacy system
- Add performance logging

---

### Testing Suite

#### [NEW] [product_recommender/test_recommender.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/product_recommender/test_recommender.py)

Comprehensive tests:
- **Unit tests**: Each recommendation strategy
- **Integration tests**: End-to-end with catalog
- **Performance tests**: Latency benchmarks (target <200ms)
- **Edge cases**: Empty results, invalid filters, etc.

#### [NEW] [product_recommender/test_performance.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/product_recommender/test_performance.py)

Performance benchmarks:
- Query latency (p50, p95, p99)
- Throughput (queries/sec)
- Cache hit rates
- Memory usage

---

### Monitoring & Observability

#### [MODIFY] [routes/agent.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py)

Add production monitoring:
```python
print(f"🛍️ [RECOMMENDER_MONITOR] query='{query}' | "
      f"strategy='{strategy}' | count={len(results)} | "
      f"latency={latency_ms}ms | cache_hit={cache_hit}")
```

Track:
- Recommendation quality (click-through rates)
- Latency distribution
- Cache effectiveness
- Fallback frequency

---

## Verification Plan

### Automated Tests

```bash
# Unit tests
pytest app/mcp_agents/product_recommender/test_recommender.py -v

# Performance benchmarks
pytest app/mcp_agents/product_recommender/test_performance.py

# Integration tests
pytest app/mcp_agents/product_recommender/test_integration.py
```

**Success criteria:**
- All tests pass
- p95 latency < 200ms
- Cache hit rate > 60%
- Zero fallbacks on happy path

### Manual Verification

**Test queries:**
1. "show me designer hoodies under 100"
2. "I want something like this bomber jacket" (with context)
3. "suggest tees for me" (personalized)
4. "montre-moi des vestes" (French, multilingual)

**Expected:**
- Relevant results matching filters
- Personalized when user history available
- Fast response times (<200ms)
- Graceful degradation on errors

### Production Monitoring

After deployment:
- Monitor `[RECOMMENDER_MONITOR]` logs
- Track click-through rates
- Compare with legacy recommender performance
- A/B test new vs old system

---

## Implementation Phases

### Phase 2.1: Architecture & Config (Estimated: 2-3 hours)
1. Create `recommender_config.json`
2. Design MCP server interface
3. Plan vector integration strategy
4. Document API contracts

### Phase 2.2: Core Implementation (Estimated: 4-5 hours)
1. Build recommendation engine
2. Implement vector similarity
3. Add personalization logic
4. Create MCP server wrapper

### Phase 2.3: Testing & Validation (Estimated: 2-3 hours)
1. Write unit tests
2. Create performance benchmarks
3. Integration testing
4. Production monitoring setup

### Phase 2.4: Integration (Estimated: 1-2 hours)
1. Update orchestrator
2. Add fallback logic
3. End-to-end testing
4. Deploy & monitor

**Total Estimated Time: 9-13 hours**

---

## Success Metrics

- ✅ Config-driven (zero hardcoding)
- ✅ All tests passing
- ✅ p95 latency < 200ms
- ✅ Production monitoring active
- ✅ 90%+ accuracy on test queries
- ✅ Seamless orchestrator integration

## Next Steps

1. **Review this plan** - Any changes needed?
2. **Start Phase 2.1** - Create config & architecture
3. **Iterate** - Build, test, deploy systematically
