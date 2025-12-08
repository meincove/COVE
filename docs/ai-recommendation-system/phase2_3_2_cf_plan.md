# Phase 2.3.2 Implementation Plan: Collaborative Filtering

**Date**: December 8, 2025  
**Version**: 1.0  
**Status**: Ready for Review

---

## Executive Summary

Based on comprehensive research of 2024-2025 best practices, this plan implements a **pragmatic hybrid collaborative filtering system** for COVE's fashion e-commerce platform. The approach prioritizes **production readiness, scalability, and proven techniques** over cutting-edge but resource-intensive methods.

**Key Decision**: Use **item-based collaborative filtering with matrix factorization**, enhanced by our existing vector embeddings, rather than complex neural approaches. Research shows well-tuned traditional methods often outperform neural CF while being more efficient.

---

## Research Findings Summary

### 1. **Hybrid Approaches Lead the Field**
- **Finding**: Hybrid systems (CF + content-based + implicit feedback) outperform single-approach systems
- **Rationale**: Combines behavioral patterns (CF) with product attributes (content) and implicit signals
- **Application**: We already have implicit feedback (Phase 2.3.1) and vector embeddings (Phase 2.2) - perfect foundation

### 2. **Matrix Factorization vs Neural CF**
- **Finding**: Well-optimized matrix factorization achieves comparable or superior performance to neural CF (Rendle et al., 2024)
- **Key Insight**: MLPs struggle to learn simple dot products; MF with proper tuning is highly competitive
- **Trade-off**: MF is computationally efficient, easier to maintain, and more interpretable
- **Decision**: **Start with Matrix Factorization**, can upgrade to neural if needed

### 3. **Item-Based CF for Fashion E-Commerce**
- **Finding**: Item-based CF is particularly suited for e-commerce where item relationships are stable
- **Advantages**:
  - Handles large catalogs effectively
  - More scalable than user-based CF
  - Better handling of sparse data
  - Stable recommendations (items don't change as fast as user preferences)
- **Application**: Perfect for fashion where "customers who bought X also bought Y" is powerful

### 4. **Scalability Best Practices**
- **Distributed Computing**: Apache Spark / Hadoop for large-scale processing
- **Caching**: Precompute item similarities; cache user recommendations
- **Approximate Methods**: Use ANN (FAISS, HNSW) for efficient similarity search
- **Incremental Updates**: Update models with new data, not full retraining

### 5. **Cold Start Handling**
- **Research Consensus**: Hybrid methods are essential for cold start
- **Strategy**: Use content-based (our vector embeddings) for new users/items, transition to CF as data accumulates
- **Our Advantage**: Already have PersonalizationEngine with cold start handling

---

## Proposed Architecture

### Three-Tier Collaborative Filtering System

```
┌─────────────────────────────────────────────────────────────┐
│                   COVE RECOMMENDER ENGINE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TIER 1: Item-Item Collaborative Filtering         │    │
│  │  - Precomputed item similarity matrix              │    │
│  │  - "Customers who bought X also bought Y"          │    │
│  │  - Fast lookup, cached                             │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TIER 2: Matrix Factorization (User-Item)         │    │
│  │  - Factorize user and item into latent spaces     │    │
│  │  - Capture implicit feedback signals               │    │
│  │  - Predict user preferences                        │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TIER 3: Hybrid Fusion                            │    │
│  │  - Combine CF with vector similarity (content)     │    │
│  │  - Weight with personalization score               │    │
│  │  - Apply diversity constraints                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **Resource Requirements**
> - Will require computing item-item similarity matrix (one-time, then incremental)
> - Matrix factorization training (weekly or on-demand)
> - Additional storage for precomputed similarities (~1-2GB for 1M items)
> 
> **Question**: Do we want to start with lightweight implementation (item-item only) or full system?

> [!WARNING]
> **Data Quality Dependency**
> - Current 24 products is enough to test the system
> - Full effectiveness requires more user interaction data
> - Cold start handling will be critical initially
> 
> **Mitigation**: Hybrid approach uses vector embeddings when CF data is sparse

---

## Proposed Changes

### Component 1: Item-Based Collaborative Filtering

#### [NEW] [`item_based_cf.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/product_recommender/item_based_cf.py)

**Purpose**: Compute and store item-item similarities for "similar items" recommendations.

**Key Functions:**
- `compute_item_similarity_matrix()` - Calculate cosine/Jaccard similarity between items
- `get_similar_items(item_id, top_k)` - Retrieve similar items for a given product
- `recommend_based_on_history(user_items, top_k)` - Recommend based on user's past interactions

**Similarity Metrics:**
- Cosine similarity (for rating-based)
- Jaccard similarity (for binary interactions: viewed/not viewed)
- Adjusted cosine (accounts for user rating bias)

**Storage:**
- Precomputed similarity matrix in Redis (fast lookup)
- Fallback to database for cold items

---

### Component 2: Matrix Factorization

#### [NEW] [`matrix_factorization.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/product_recommender/matrix_factorization.py)

**Purpose**: Decompose user-item interaction matrix into latent factors.

**Approach**: 
- **Algorithm**: Alternating Least Squares (ALS) - proven, scalable, handles implicit feedback
- **Alternative**: SVD (Singular Value Decomposition) for explicit ratings

**Why ALS?**
- Optimized for implicit feedback (views, clicks, purchases)
- Parallelizable (good for distributed computing)
- Handles sparse matrices well
- Production-tested at scale (Spotify, Netflix)

**Implementation:**
```python
class MatrixFactorization:
    def __init__(self, n_factors=50, regularization=0.01):
        - n_factors: dimensionality of latent space (50-100 for e-commerce)
        - regularization: prevent overfitting
    
    def fit(self, user_item_matrix): 
        - Train using ALS
        - Implicit feedback from user interactions
    
    def predict(self, user_id, item_id):
        - Dot product of user and item latent vectors
    
    def recommend_for_user(self, user_id, top_k):
        - Return top K items for user
```

**Training Data:**
- User interactions: views, cart adds, purchases
- Weighted by implicit feedback signals (from personalization config)
- Applied temporal decay (recent matters more)

---

### Component 3: Collaborative Filtering Manager

#### [MODIFY] [`recommender.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/product_recommender/recommender.py)

**Changes:**
- Add `CollaborativeFilteringManager` class
- Integrate item-based CF and matrix factorization
- Implement hybrid fusion strategy

**Fusion Strategy** (Weighted Hybrid):
```python
final_score = (
    0.3 × item_cf_score +      # Item-item similarity
    0.3 × mf_score +            # Matrix factorization
    0.2 × vector_similarity +   # Content-based (existing)
    0.2 × personalization_score # User preferences (existing)
)
```

**Cold Start Handling:**
- **New User**: Use vector similarity (content) + popular items
- **New Item**: Use vector similarity to find similar items
- **Established User**: Full CF + hybrid fusion

---

### Component 4: Collaborative Filtering Config

#### [NEW] [`cf_config.json`](file:///Users/ssg/Desktop/COVE/cove-ai-core/data/cf_config.json)

**Config Structure:**
```json
{
  "version": "1.0",
  "item_based_cf": {
    "enabled": true,
    "similarity_metric": "cosine",  // cosine, jaccard, adjusted_cosine
    "min_common_users": 3,           // Minimum overlap for similarity
    "top_k_similar": 20,             // Store top 20 similar items per item
    "cache_ttl_hours": 24,
    "recompute_frequency_days": 7
  },
  "matrix_factorization": {
    "enabled": true,
    "algorithm": "als",              // als or svd
    "n_factors": 50,
    "regularization": 0.01,
    "iterations": 10,
    "implicit_confidence_weight": 40,
    "training_frequency_days": 7
  },
  "hybrid_fusion": {
    "weights": {
      "item_cf": 0.3,
      "matrix_factorization": 0.3,
      "vector_similarity": 0.2,
      "personalization": 0.2
    },
    "cold_start_threshold_interactions": 5
  },
  "performance": {
    "cache_recommendations": true,
    "cache_ttl_minutes": 30,
    "max_batch_size": 1000,
    "use_approximate_nn": true
  }
}
```

---

## Technical Specifications

### Data Requirements

**Input Data:**
1. **User-Item Interactions** (from Django database or analytics)
   - user_id, item_id, interaction_type, timestamp, weight
   - Example: `{user: "u123", item: "CCH001", type: "purchase", time: "2024-12-08", weight: 1.0}`

2. **Item Metadata** (from ai_products table)
   - id, embeddings, type, tier, price
   - Used for content-based fallback

**Output:**
- Item similarity matrix: `{item_id → [(similar_item_id, similarity_score), ...]}`
- User factor matrix: `{user_id → latent_vector[50]}`
- Item factor matrix: `{item_id → latent_vector[50]}`

### Storage Strategy

**Redis** (Fast cache):
- Item similarity matrix
- Precomputed user recommendations
- User/item latent factors

**PostgreSQL** (Persistent):
- User-item interaction history
- Model metadata (version, training date, metrics)
- Fallback for cache misses

---

## Implementation Approach

### Phase 1: Item-Based CF (Week 1)
1. Create `item_based_cf.py`
2. Load user-item interactions from database
3. Compute item-item similarity matrix
4. Store in Redis with fallback to PostgreSQL
5. Test with existing 24 products
6. Validate "similar items" recommendations

### Phase 2: Matrix Factorization (Week 2)
1. Create `matrix_factorization.py`
2. Implement ALS algorithm (using library like Implicit or Surprise)
3. Train on user-item interaction matrix
4. Generate user and item latent factors
5. Test predictions for known users
6. Benchmark RMSE/MAE

### Phase 3: Hybrid Integration (Week 3)
1. Update `recommender.py` with CF manager
2. Implement weighted fusion strategy
3. Add cold start handling
4. Integrate with existing personalization
5. Test end-to-end recommendations

### Phase 4: Optimization & Caching (Week 4)
1. Implement Redis caching
2. Optimize similarity calculations (use scipy sparse matrices)
3. Add incremental update capabilities
4. Performance benchmarking
5. A/B testing framework

---

## Verification Plan

### Unit Tests
- `test_item_cf.py`: Test similarity calculations, edge cases
- `test_matrix_factorization.py`: Test ALS training, predictions
- `test_cf_integration.py`: Test hybrid fusion, cold start

### Integration Tests
- End-to-end recommendation flow
- Cache performance (hit rate >80%)
- Latency (<100ms for recommendations)

### Metrics to Track
- **Accuracy**: RMSE, MAE for predictions
- **Ranking**: Precision@K, Recall@K, NDCG
- **Diversity**: Intra-list diversity, coverage
- **Novelty**: Recommend items user hasn't seen
- **Performance**: Latency, cache hit rate

### A/B Testing
- **Control**: Current recommendations (vector + personalization)
- **Treatment**: CF-enhanced recommendations
- **Metrics**: CTR, conversion rate, engagement time

---

## Libraries & Tools

### Python Libraries
-  **Implicit**: Fast ALS for implicit feedback (recommended)
- **Surprise**: Scikit for recommendation (good for explicit ratings)
- **Scipy**: Sparse matrix operations
- **NumPy**: Matrix computations
- **Redis-py**: Caching layer

### Why Not Deep Learning?
- Research shows well-tuned MF ≈ Neural CF performance
- MF is 10-100x faster to train and serve
- Easier to debug, maintain, explain
- Lower infrastructure costs
- Can upgrade to neural later if needed

---

## Risk Mitigation

### Risk 1: Insufficient User Data
**Impact**: CF requires user interaction history  
**Mitigation**: 
- Hybrid approach (use vector embeddings as fallback)
- Start with "product affinity" (don't need user history)
- Generate synthetic interactions from purchase logs

### Risk 2: Cold Start Problem
**Impact**: New users/items have no CF data  
**Mitigation**:
- Use content-based recommendations (vector embeddings)
- Popular items for new users
- Gradual transition to CF as data accumulates

### Risk 3: Scalability
**Impact**: Matrix grows with users and items  
**Mitigation**:
- Sparse matrix representations
- Incremental updates (don't retrain from scratch)
- Caching precomputed similarities
- Use sampling for very large datasets

### Risk 4: Privacy Concerns
**Impact**: User interaction data is sensitive  
**Mitigation**:
- Compliance with existing GDPR/CCPA controls (already in personalization config)
- Anonymize user IDs in CF models
- Implement data retention policies

---

## Success Criteria

**Phase 2.3.2 will be considered complete when:**

✅ **Item-based CF functional**
- Can compute item similarities for all products
- "Similar items" recommendations work
- Cached for fast retrieval

✅ **Matrix factorization trained**
- ALS model trained on user-item interactions
- Can predict user preferences
- RMSE < 1.0 (for rating scale 1-5) or appropriate for implicit

✅ **Hybrid system integrated**
- CF combined with content and personalization
- Cold start handled gracefully
- End-to-end recommendations working

✅ **Performance targets met**
- Recommendation latency <100ms
- Cache hit rate >80%
- Can handle 1000s of users

✅ **Tests passing**
- Unit tests for all CF components
- Integration tests for hybrid system
- Performance benchmarks met

---

## Next Steps After Review

1. **User approval** of this plan
2. **Generate synthetic interaction data** (if needed for testing)
3. **Implement item-based CF** (Phase 1)
4. **Test with 24 products** (validate approach)
5. **Add matrix factorization** (Phase 2)
6. **Integrate & optimize** (Phases 3-4)

---

## References

**Research Sources:**
- Rendle et al. (2024) - "Are We Really Making Progress in Deep Learning-Based Recommender Systems?"
- IEEE/ACM Research (2024) - Fashion recommendation systems using collaborative filtering
- Industry Best Practices - Spotify, Netflix ALS implementations
- Hybrid Recommender Systems (2024) - State of the art review

**Key Takeaway**: **Proven, scalable techniques > bleeding-edge complexity**

We're building for production, not a research paper. Start simple, measure, iterate.
