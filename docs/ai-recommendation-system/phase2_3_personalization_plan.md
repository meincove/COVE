# Phase 2.3: Personalization Logic - Implementation Plan

**Date**: December 8, 2025  
**Research-Backed**: ✅ Based on 2024-2025 best practices

---

## Research Summary

### Key Findings (2024-2025 Best Practices)

**1. Implicit Feedback is King**
- **Why**: Abundant, easy to collect (clicks, views, purchases, time spent)
- **Challenge**: No explicit negative signals, must infer from lack of interaction
- **Solution**: One-class collaborative filtering + negative sampling

**2. Feature Engineering Advances**
- **Meta-features**: User interaction count, data sparsity, temporal patterns
- **Latent representations**: Deep learning matrix factorization (DeepMF)
- **Context-aware**: Time, location, device, session data

**3. Modern Techniques**  
- **Collaborative filtering**: Still foundational, enhanced with deep learning
- **Matrix factorization**: SVD, ALS, DeepFM (combines FM + deep learning)
- **Real-time personalization**: Immediate adaptation to user actions
- **Hybrid approach**: Collaborative + content-based + context-aware

**4. E-commerce Trends**
- **Hyper-personalization**: 20-30% better engagement
- **Predictive analytics**: Anticipate needs before explicit queries
- **Privacy-first**: Transparent data usage, GDPR/CCPA compliant
- **Multi-channel**: Consistent experience across touchpoints

---

## Personalization Strategy for COVE

### Three-Tier Approach (No Hardcoding!)

**Tier 1: Implicit Feedback Signals** (Easy to collect, high signal)
- Browse history (clicks, views)
- Cart actions (adds, removes)
- Purchase history
- Time spent on products
- Search queries

**Tier 2: Collaborative Patterns** (Learn from similar users)
- User-user similarity
- Item-item co-occurrence
- Temporal patterns

**Tier 3: Context-Aware** (Real-time adaptation)
- Session data
- Current time/day
- Device type
- Location (if available)

---

## Configuration-Driven Architecture

### Personalization Config Schema

```json
{
  "version": "1.0.0",
  "signals": {
    "browse_history": {
      "enabled": true,
      "weight": 0.3,
      "decay_factor": 0.9,
      "max_items": 20
    },
    "purchase_history": {
      "enabled": true,
      "weight": 0.4,
      "decay_factor": 0.7,
      "max_items": 10
    },
    "cart_actions": {
      "enabled": true,
      "weight": 0.2,
      "decay_factor": 0.95,
      "max_items": 15
    },
    "search_history": {
      "enabled": true,
      "weight": 0.1,
      "decay_factor": 0.8,
      "max_items": 10
    }
  },
  
  "collaborative_filtering": {
    "enabled": true,
    "method": "item_based",
    "similarity_metric": "cosine",
    "min_common_users": 3,
    "top_k_similar": 10
  },
  
  "temporal_decay": {
    "enabled": true,
    "half_life_days": 14,
    "min_weight": 0.1
  },
  
  "diversity": {
    "enabled": true,
    "category_spread": 0.3,
    "tier_mix": 0.2
  },
  
  "cold_start": {
    "new_user_threshold_days": 7,
    "fallback_to_popular": true,
    "explore_factor": 0.3
  },
  
  "real_time": {
    "session_weight": 0.2,
    "immediate_feedback": true,
    "update_frequency_seconds": 60
  },
  
  "privacy": {
    "anonymize_after_days": 90,
    "respect_do_not_track": true,
    "opt_out_supported": true
  }
}
```

---

## Implementation Components

### 1. User Profile Builder

**Purpose**: Aggregate and weight user signals

**Input**:
- User ID
- Browse history (implicit feedback)
- Purchase history
- Cart actions
- Search queries

**Output**:
- User preference vector (weighted embeddings)
- Preferred categories/types/tiers
- Recent engagement patterns

**Algorithm**:
```python
def build_user_profile(user_id, config):
    signals = []
    
    # Browse history (implicit feedback)
    browses = get_browse_history(user_id, config['signals']['browse_history']['max_items'])
    signals.extend(apply_decay(browses, config['signals']['browse_history']))
    
    # Purchase history (strong signal)
    purchases = get_purchase_history(user_id, config['signals']['purchase_history']['max_items'])
    signals.extend(apply_decay(purchases, config['signals']['purchase_history']))
    
    # Cart actions
    cart = get_cart_actions(user_id, config['signals']['cart_actions']['max_items'])
    signals.extend(apply_decay(cart, config['signals']['cart_actions']))
    
    # Aggregate with weights
    profile_vector = weighted_average(signals, config['signals'])
    
    return profile_vector
```

### 2. Temporal Decay Function

**Purpose**: Recent actions matter more

**Formula**: 
```
weight = base_weight * exp(-λ * days_ago)
where λ = ln(2) / half_life
```

**Implementation**:
```python
def apply_temporal_decay(items, config):
    half_life = config['temporal_decay']['half_life_days']
    lambda_val = math.log(2) / half_life
    
    for item in items:
        days_ago = (now - item.timestamp).days
        item.weight *= math.exp(-lambda_val * days_ago)
        item.weight = max(item.weight, config['temporal_decay']['min_weight'])
    
    return items
```

### 3. Collaborative Filtering

**Purpose**: "Users like you also liked..."

**Method**: Item-based CF (more stable than user-based)

**Implementation**:
```python
def collaborative_recommendations(user_profile, config):
    # Get items user interacted with
    user_items = user_profile.interacted_items
    
    # Find similar items using precomputed similarity matrix
    similar_items = []
    for item in user_items:
        similar = get_similar_items(
            item.id,
            top_k=config['collaborative_filtering']['top_k_similar'],
            min_common_users=config['collaborative_filtering']['min_common_users']
        )
        similar_items.extend(similar)
    
    # Remove already interacted items
    recommendations = filter_out(similar_items, user_items)
    
    return recommendations
```

### 4. Personalization Layer

**Purpose**: Adjust search results based on user profile

**Integration Point**: Modify ranking scores in recommender

**Implementation**:
```python
async def personalize_recommendations(
    base_results: List[Product],
    user_profile: UserProfile,
    config: Dict
) -> List[Product]:
    \"\"\"
    Adjust base recommendation scores with personalization
    \"\"\"
    for product in base_results:
        # Calculate personalization boost
        personalization_score = calculate_personalization_score(
            product,
            user_profile,
            config
        )
        
        # Combine with base score
        product.final_score = (
            product.rrf_score * (1 - config['real_time']['session_weight']) +
            personalization_score * config['real_time']['session_weight']
        )
    
    # Re-sort by final score
    base_results.sort(key=lambda p: p.final_score, reverse=True)
    
    # Apply diversity constraints
    if config['diversity']['enabled']:
        base_results = apply_diversity(base_results, config['diversity'])
    
    return base_results
```

### 5. Cold Start Handling

**Purpose**: Handle new users with no history

**Strategies**:
1. **Explore**: Show diverse popular items
2. **Implicit profiling**: Use current session (device, time, first searches)
3. **Gradual learning**: Quickly adapt to first interactions

**Implementation**:
```python
def handle_cold_start(user_id, config):
    user_age_days = (now - user.created_at).days
    
    if user_age_days < config['cold_start']['new_user_threshold_days']:
        # New user - use cold start strategy
        if config['cold_start']['fallback_to_popular']:
            base_items = get_popular_items()
        
        # Add exploration
        explore_items = get_diverse_items(
            factor=config['cold_start']['explore_factor']
        )
        
        return combine(base_items, explore_items)
    
    # Regular personalization
    return build_user_profile(user_id, config)
```

---

## Data Model

### User Interaction Events (Implicit Feedback)

```sql
CREATE TABLE user_interactions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,  -- 'view', 'cart_add', 'purchase', 'search'
    session_id TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    INDEX (user_id, timestamp DESC),
    INDEX (product_id, interaction_type),
    INDEX (session_id)
);
```

### User Profile Cache

```sql
CREATE TABLE user_profiles (
    user_id TEXT PRIMARY KEY,
    profile_vector JSONB,  -- Aggregated preferences
    preferred_types TEXT[],
    preferred_tiers TEXT[],
    last_updated TIMESTAMP DEFAULT NOW(),
    
    INDEX (last_updated)
);
```

---

## Integration with Existing System

### Modified Recommender Flow

```
User Query
    ↓
Intent Classification (existing)
    ↓
Base Hybrid Search (vector + keyword + RRF)
    ↓
[NEW] User Profile Retrieval
    ↓
[NEW] Personalization Layer
    ↓
[NEW] Diversity Constraints
    ↓
Final Ranked Results
```

### Config Integration

Extend `recommender_config.json`:
```json
{
  "personalization": {
    "enabled": true,
    "config_path": "data/personalization_config.json"
  }
}
```

---

## Performance Considerations

### Caching Strategy
- **User profiles**: Cache for 5 minutes (Redis)
- **Collaborative similarities**: Pre-compute daily
- **Session data**: Keep in memory (ephemeral)

### Latency Budget
- **Profile retrieval**: <10ms (cached)
- **Personalization scoring**: <20ms
- **Total overhead**: <30ms (within 50ms target)

### Scalability
- **User profiles**: Millions supported (indexed lookup)
- **Interaction events**: Partitioned by date
- **Batch jobs**: Compute similarities nightly

---

## Privacy & Compliance

### GDPR/CCPA Ready
- **Data minimization**: Only store necessary signals
- **Right to erasure**: Delete user data on request
- **Transparency**: Config shows what data is used
- **Opt-out**: Disable personalization per user

### Implementation
```python
class PersonalizationService:
    def check_opt_out(self, user_id):
        if user_preferences.do_not_track:
            return None  # No personalization
        
        if config['privacy']['respect_do_not_track']:
            # Respect DNT header
            return None
        
        return build_user_profile(user_id)
```

---

## Testing Strategy

### Unit Tests
- Profile building with various signal combinations
- Temporal decay calculations
- Collaborative filtering logic
- Diversity constraints

### Integration Tests
- End-to-end personalization flow
- Cold start scenarios
- High-traffic simulation

### A/B Testing
- **Control**: Base hybrid search (no personalization)
- **Treatment**: Personalized results
- **Metrics**: Click-through rate, conversion, engagement time

---

## Implementation Phases

### Phase 2.3.1: Core Personalization (4 hours)
- [ ] Create personalization_config.json
- [ ] Build UserProfile class
- [ ] Implement temporal decay
- [ ] Integrate with recommender

### Phase 2.3.2: Collaborative Filtering (3 hours)
- [ ] Item similarity computations
- [ ] Collaborative recommendations
- [ ] Cold start handling

### Phase 2.3.3: Real-time & Privacy (2 hours)
- [ ] Session tracking
- [ ] Privacy controls
- [ ] Opt-out mechanisms

### Phase 2.3.4: Testing & Validation (2 hours)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance benchmarks

**Total Estimated Effort**: 11 hours

---

## Success Metrics

### Technical Metrics
- ✅ Personalization latency <30ms
- ✅ Profile cache hit rate >80%
- ✅ Test coverage >90%
- ✅ Zero hardcoded values

### Business Metrics (A/B test)
- Target: +15-25% CTR improvement
- Target: +10-20% conversion improvement
- Target: +20-30% engagement time

---

## Next Steps

1. **Create personalization config** (no hardcoding!)
2. **Implement user profile builder**
3. **Add personalization layer to recommender**
4. **Test with real user data**
5. **A/B test validation**

---

## References

**Research Sources**:
- E-commerce personalization best practices 2024-2025
- Implicit feedback recommendation systems
- DeepFM and matrix factorization techniques
- Real-time personalization architectures
- Privacy-first personalization (GDPR/CCPA)

**Technologies**:
- PostgreSQL for interaction events
- Redis for profile caching
- Vector embeddings for user preferences
- Config-driven architecture (JSON)

---

## Conclusion

Phase 2.3 will add intelligent personalization using research-backed techniques while maintaining:
- ✅ **No hardcoding** (all config-driven)
- ✅ **Best practices** (implicit feedback, collaborative filtering, temporal decay)
- ✅ **Privacy-first** (GDPR/CCPA compliant)
- ✅ **Performance** (<30ms overhead)
- ✅ **Testable** (comprehensive test suite)

**Ready to implement!**
