# AI Core Multi-Brand Integration Plan

## Objective
Integrate AI Core with the new 1,933-product, 15-brand catalog and verify all agentic features work correctly with brand-aware capabilities.

---

## User Review Required

> [!IMPORTANT]
> **Breaking Changes**
> - AI Core will stop using local JSON files and fetch exclusively from backend API
> - All existing embeddings will be regenerated (359 → 1,933 products)
> - Collaborative filtering will be retrained on new dataset
> - This will take ~15-30 minutes for initial setup

> [!WARNING]
> **Data Migration**
> - Old 359-product embeddings will be replaced
> - User interaction history remains intact
> - Recommendations may change due to larger product catalog

---

## Proposed Changes

### Phase 1: Data Source Migration

#### AI Core Scripts
**Files to Update**:
- [`cove-ai-core/data/productVariantsFlat_final.json`](file:///Users/ssg/Desktop/COVE/cove-ai-core/data/productVariantsFlat_final.json) - DELETE (duplicate data)
- [`cove-ai-core/app/vector/store.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/vector/store.py) - Update to fetch from API
- [`cove-ai-core/scripts/generate_embeddings.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/scripts/generate_embeddings.py) - Update data source

**Changes**:
```python
# OLD: Load from local JSON
with open('data/productVariantsFlat_final.json') as f:
    products = json.load(f)

# NEW: Fetch from backend API
response = requests.get('http://localhost:8001/api/products/?page_size=500')
products = []
while response:
    data = response.json()
    products.extend(data['results'])
    # Handle pagination...
```

---

### Phase 2: Embedding Generation

#### Generate New Embeddings
**Script**: `cove-ai-core/scripts/generate_embeddings.py`

**Process**:
1. Fetch all 1,933 products from backend API
2. Generate product descriptions for embedding:
   ```
   {brand} {name} - {material} {type}
   {tier} collection, {gender} fit
   Colors: {color1}, {color2}...
   {description}
   ```
3. Generate embeddings using `text-embedding-3-small`
4. Store in Neon DB `product_embeddings` table
5. Create brand-aware index

**Estimated Time**: 10-15 minutes
**Cost**: ~$0.50 (1,933 products × avg 100 tokens)

---

### Phase 3: Search Testing

#### Semantic Search
**Test Queries**:
- "black hoodie streetwear" → Should find hoodies across brands
- "summer dress feminine" → Should find dresses
- "minimalist tee basics" → Should prioritize SimpleStack, CoreBasics
- "luxury jacket premium" → Should prioritize LuxeLine, designer tier

**Brand Filtering**:
- "black hoodie" + `brand_id=COVE` → Only COVE hoodies
- "dress" + `brand_id=UrbanPulse` → Only UrbanPulse dresses

#### Hybrid Search (Semantic + Collaborative Filtering)
**Test**:
- User who bought COVE hoodies searches "jacket"
- Should recommend jackets, prioritize compatible brands
- Brand affinity should influence results

---

### Phase 4: Collaborative Filtering

#### Retrain CF Model
**Script**: Update CF training script

**Changes**:
1. Load user-product interactions (view, add-to-cart, purchase)
2. Train ALS model on 1,933 products
3. Include brand affinity features
4. Test cross-brand recommendations

**Test Cases**:
- User who bought multiple COVE items → Recommend similar + cross-brand
- User who bought from different brands → Show diverse recommendations
- Brand loyalty detection → Prioritize preferred brands

---

### Phase 5: Stylist Brain Testing

#### Feature Components
From yesterday's implementation:

**[NEW]** `cove-ai-core/app/routes/stylist.py`
- Personal style analysis
- Outfit building with multi-brand items
- Style trend awareness

**Test Scenarios**:
1. **New User** (no history)
   - Should discover style through questions
   - Recommend items from multiple brands
   
2. **Returning User** (has purchases)
   - Analyze past COVE purchases
   - Suggest complementary items from other brands
   - Build outfits mixing brands intelligently

3. **Brand Preferences**
   - User mostly buys COVE → Still show other brands
   - User buys luxury brands → Prioritize premium options

---

### Phase 6: Agent Integration

#### MCP Commerce Server
**File**: `cove-ai-core/app/cove_mcp/commerce_server.py`

**Test MCP Tools**:
1. `search_products` - Semantic search with brand filter
2. `get_recommendations` - CF with brand awareness
3. `get_product_details` - Fetch from backend API
4. `build_outfit` - Multi-brand outfit creation

**Conversation Tests**:
```
User: "Show me black hoodies"
→ Search across all brands
→ Show diversity (COVE, UrbanPulse, BoldHues)

User: "I want something like my COVE hoodie but from a different brand"
→ Semantic similarity + brand exclusion
→ Recommend UrbanPulse, StreetVibe alternatives

User: "Build me an outfit for a date night"
→ Stylist Brain activates
→ Mix items from EcoHaven, LuxeLine, ModernHeritage
→ Explain style reasoning
```

---

## Verification Plan

### Automated Tests

**Backend API Integration**
```bash
cd cove-ai-core
pytest tests/test_backend_integration.py
```

**Embedding Quality**
```bash
python scripts/test_embeddings.py
# Verify:
# - All 1,933 products have embeddings
# - Semantic similarity works
# - Brand filtering works
```

**CF Model Performance**
```bash
python scripts/test_cf_recommendations.py
# Metrics:
# - Precision@10
# - Brand diversity score
# - Cross-brand recommendation rate
```

### Manual Verification

**1. Semantic Search Quality**
- [ ] Relevant results for 10 test queries
- [ ] Brand filter works correctly
- [ ] Results ranked properly

**2. Recommendations**
- [ ] CF generates diverse recommendations
- [ ] Brand affinity influences results
- [ ] Cross-brand suggestions make sense

**3. Stylist Brain**
- [ ] Personal style analysis works
- [ ] Outfit building mixes brands well
- [ ] Explanations are coherent

**4. End-to-End Chat**
- [ ] Natural conversation flow
- [ ] Accurate product retrieval
- [ ] Smart multi-brand suggestions
- [ ] Cart integration works

---

## Implementation Steps

### Step 1: Data Source Update (30 min)
1. Update `vector/store.py` to fetch from API
2. Update embedding generation script
3. Delete duplicate JSON file

### Step 2: Regenerate Embeddings (15 min)
1. Run embedding generation for 1,933 products
2. Verify all products indexed
3. Test semantic search

### Step 3: CF Retraining (20 min)
1. Update CF script for new data
2. Retrain model
3. Test recommendations

### Step 4: Integration Testing (30 min)
1. Test MCP tools
2. Test Stylist Brain
3. Full conversation testing

### Step 5: Performance Validation (15 min)
1. Check latency (< 200ms for search)
2. Verify recommendation quality
3. Test edge cases

---

## Success Criteria

✅ **All 1,933 products** have embeddings  
✅ **Semantic search** returns relevant results  
✅ **Brand filtering** works correctly  
✅ **CF recommendations** show brand diversity  
✅ **Stylist Brain** creates multi-brand outfits  
✅ **MCP tools** integrate seamlessly  
✅ **E2E conversations** feel natural  
✅ **Performance** < 200ms for search, < 500ms for recommendations

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Data Source Migration | 30 min | Code updates |
| Embedding Generation | 15 min | API calls |
| CF Retraining | 20 min | Model training |
| Integration Testing | 30 min | Manual + automated |
| Performance Validation | 15 min | Benchmarks |
| **Total** | **~2 hours** | With testing |

---

## Next Actions

1. **Review this plan** - Confirm approach
2. **Backup current embeddings** (optional)
3. **Execute Step 1** - Update data sources
4. **Test incrementally** - Verify each step

Ready to proceed?
