# Vector Search Implementation Plan - Research-Backed Approach

## Research Summary

Based on extensive research of 2024 best practices, here's the optimal approach for COVE's product recommendation system:

### Key Findings

**1. Database Choice: pgvector (PostgreSQL) ✅**
   - **Why**: We already use Postgres (Neon), minimizing infrastructure complexity
   - **Performance**: 11.4x higher throughput than Qdrant at 99% recall for 50M vectors
   - **Cost**: Most economical - no additional database licensing
   - **Integration**: Seamless hybrid search with relational filters
   - **Benchmark**: Faster than Pinecone's fastest pods with better accuracy

**2. Hybrid Search Approach ✅**
   - **Best Practice**: Combine vector (semantic) + keyword (lexical) search
   - **Improvement**: 20-30% better relevance vs either method alone
   - **Fusion**: Reciprocal Rank Fusion (RRF) - most robust method
   - **Use Cases**:
     - Vector: "comfortable hoodies for winter" (semantic understanding)
     - Keyword: "Cove Designer Hoodie CDH001" (exact product codes)

**3. Embedding Optimization**
   - **Model**: text-embedding-3-small (already chosen ✅)
   - **Dimensions**: Start with 1536, can reduce to 512-768 for 2-3x speedup
   - **Technique**: Matryoshka Representation Learning (MRL) - truncate without retraining
   - **Cost**: 5x cheaper than ada-002 with better performance

---

## Implementation Architecture

### Phase 1: Vector Storage Setup

**1.1 Enable pgvector**
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Create products table with embeddings
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  tier TEXT,
  price DECIMAL(10,2),
  embedding vector(1536),  -- text-embedding-3-small
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create HNSW index for fast ANN search
CREATE INDEX ON products 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for metadata filtering
CREATE INDEX ON products USING GIN (metadata);
```

**1.2 Generate Embeddings**
```python
from litellm import embedding

def generate_product_embedding(product: Dict) -> List[float]:
    """Generate embedding for product"""
    # Combine relevant fields
    text = f"{product['title']} {product['description']} {product['type']} {product['tier']}"
    
    response = embedding(
        model="text-embedding-3-small",
        input=[text]
    )
    
    return response.data[0]["embedding"]
```

### Phase 2: Hybrid Search Implementation

**2.1 Vector Search**
```python
async def vector_search(
    query_embedding: List[float],
    filters: Dict[str, Any],
    limit: int = 50
) -> List[Dict]:
    """Pure vector similarity search"""
    
    query = """
    SELECT 
        id, title, type, tier, price, metadata,
        1 - (embedding <=> $1::vector) AS similarity_score
    FROM products
    WHERE 
        ($2::text IS NULL OR type = $2)
        AND ($3::text IS NULL OR tier = $3)
        AND ($4::decimal IS NULL OR price >= $4)
        AND ($5::decimal IS NULL OR price <= $5)
    ORDER BY embedding <=> $1::vector
    LIMIT $6
    """
    
    # Execute with filters
    results = await db.fetch(
        query,
        query_embedding,
        filters.get("type"),
        filters.get("tier"),
        filters.get("price_min"),
        filters.get("price_max"),
        limit
    )
    
    return results
```

**2.2 Keyword Search (BM25)**
```python
async def keyword_search(
    query: str,
    filters: Dict[str, Any],
    limit: int = 50
) -> List[Dict]:
    """Traditional keyword search with BM25 ranking"""
    
    query_sql = """
    SELECT 
        id, title, type, tier, price, metadata,
        ts_rank_cd(
            setweight(to_tsvector('english', title), 'A') ||
            setweight(to_tsvector('english', COALESCE(description, '')), 'B'),
            plainto_tsquery('english', $1)
        ) AS keyword_score
    FROM products
    WHERE 
        to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ 
        plainto_tsquery('english', $1)
        AND ($2::text IS NULL OR type = $2)
        AND ($3::text IS NULL OR tier = $3)
        AND ($4::decimal IS NULL OR price >= $4)
        AND ($5::decimal IS NULL OR price <= $5)
    ORDER BY keyword_score DESC
    LIMIT $6
    """
    
    results = await db.fetch(
        query_sql,
        query,
        filters.get("type"),
        filters.get("tier"),
        filters.get("price_min"),
        filters.get("price_max"),
        limit
    )
    
    return results
```

**2.3 Reciprocal Rank Fusion (RRF)**
```python
def reciprocal_rank_fusion(
    vector_results: List[Dict],
    keyword_results: List[Dict],
    k: int = 60  # RRF constant
) -> List[Dict]:
    """
    Combine vector and keyword results using RRF.
    
    RRF Score = sum(1 / (k + rank)) for each result set
    """
    scores = {}
    
    # Score vector results
    for rank, result in enumerate(vector_results, 1):
        product_id = result["id"]
        scores[product_id] = scores.get(product_id, 0) + (1 / (k + rank))
    
    # Score keyword results
    for rank, result in enumerate(keyword_results, 1):
        product_id = result["id"]
        scores[product_id] = scores.get(product_id, 0) + (1 / (k + rank))
    
    # Merge with original data
    all_products = {r["id"]: r for r in vector_results + keyword_results}
    
    # Sort by RRF score
    ranked = sorted(
        [
            {**all_products[pid], "rrf_score": score}
            for pid, score in scores.items()
        ],
        key=lambda x: x["rrf_score"],
        reverse=True
    )
    
    return ranked
```

### Phase 3: Performance Optimization

**3.1 Parallel Execution**
```python
async def hybrid_search(
    query: str,
    filters: Dict[str, Any],
    limit: int = 10
) -> List[Dict]:
    """Execute vector + keyword search in parallel"""
    
    # Generate embedding (async)
    query_embedding = await generate_embedding(query)
    
    # Run both searches concurrently
    vector_results, keyword_results = await asyncio.gather(
        vector_search(query_embedding, filters, limit * 3),
        keyword_search(query, filters, limit * 3)
    )
    
    # Fusion
    fused_results = reciprocal_rank_fusion(vector_results, keyword_results)
    
    return fused_results[:limit]
```

**3.2 Caching Strategy**
```python
from functools import lru_cache
import hashlib

# Cache embeddings for popular queries
@lru_cache(maxsize=1000)
async def get_cached_embedding(query: str) -> List[float]:
    """Cache query embeddings"""
    return await generate_embedding(query)

# Redis cache for results (5 min TTL)
async def get_cached_results(query_hash: str):
    """Cache search results"""
    return await redis.get(f"search:{query_hash}")
```

**3.3 Dimension Reduction (MRL)**
```python
# For ultra-fast search, truncate to 768 dimensions
def truncate_embedding(embedding: List[float], dims: int = 768) -> List[float]:
    """
    Matryoshka Representation Learning - truncate without retraining.
    768 dims: 2x faster, ~95% accuracy retained
    512 dims: 3x faster, ~90% accuracy retained
    """
    return embedding[:dims]
```

---

## Implementation Steps

### 1. Database Setup (30 mins)
- [x] Enable pgvector extension
- [ ] Create products table with vector column
- [ ] Create HNSW index
- [ ] Create GIN index for metadata

### 2. Embedding Generation (1 hour)
- [ ] Batch embed existing products
- [ ] Add embedding generation to product creation
- [ ] Set up incremental updates

### 3. Hybrid Search Integration (2 hours)
- [ ] Implement vector search function
- [ ] Implement keyword search function
- [ ] Implement RRF fusion
- [ ] Add to recommender.py

### 4. Performance Optimization (1 hour)
- [ ] Add parallel execution
- [ ] Implement caching (Redis)
- [ ] Add monitoring/logging

### 5. Testing (1 hour)
- [ ] Unit tests for each component
- [ ] Integration tests for hybrid search
- [ ] Performance benchmarks (<50ms target)

---

## Performance Targets

| Metric | Target | Justification |
|--------|--------|---------------|
| p95 latency | <50ms | Best practice for real-time search |
| Throughput | >100 QPS | Typical e-commerce load |
| Accuracy | >90% | Hybrid search improves by 20-30% |
| Cache hit rate | >60% | Popular queries cached |

---

## Cost Optimization

**Embedding Generation:**
- text-embedding-3-small: ~$0.02 per 1M tokens
- 1000 products × 100 tokens = 100K tokens ≈ $0.002
- **One-time cost** for initial embedding

**Storage:**
- 1536 dims × 4 bytes = 6KB per product
- 10,000 products = 60MB
- **Negligible Postgres storage cost**

**Query Cost:**
- Embeddings cached for popular queries
- <100 unique queries/day × $0.02/1M = negligible

---

## Migration Path

1. **Week 1**: Database setup + embedding generation
2. **Week 2**: Hybrid search implementation
3. **Week 3**: Performance optimization + testing
4. **Week 4**: A/B test vs current system

---

## Sources & References

- pgvector benchmarks: 11.4x faster than Qdrant [[1]](tigerdata.com)
- Hybrid search best practices [[2]](hakia.com)
- text-embedding-3-small optimization [[3]](promptlayer.com)
- RRF fusion algorithm [[4]](opensearch.org)
