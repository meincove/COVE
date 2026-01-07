# Multi-Brand Catalog Integration Testing Plan

**Status**: DB Load in Progress (43% complete, ~40 min remaining)  
**Scope**: Verify all systems work with 1,933 products across 15 brands  
**Critical Addition**: `brandId` field for filtering

---

## 🎯 Systems to Test

### **1. Backend Django (Neon DB)**
### **2. Frontend Next.js**
### **3. AI Core (Search, Recommendations, CF)**

---

## 📋 Integration Test Checklist

### **Phase 1: Backend API Verification** ✅

#### **A. Catalog Endpoints**
- [ ] `GET /api/products/` - List all products
  - Verify returns 1,933 products paginated
  - Test filters: `tier`, `type`, `gender`, `size`, `price_min`, `price_max`
  - **NEW TEST**: Filter by `brandId` (15 brands)
  
- [ ] `GET /api/products/<slug>/` - Product detail
  - Test with products from different brands
  - Verify complete nested data (variants, images, sizes)
  
- [ ] `GET /api/variants/<variant_id>/` - Variant detail
  - Test cross-brand variant IDs
  - Verify images, stock, pricing

#### **B. Cart Operations**
- [ ] `POST /api/cart/add/` - Add to cart
  - Test products from multiple brands in one cart
  - Verify brandId preserved in cart items
  
- [ ] `GET /api/cart/` - View cart
  - Verify multi-brand cart display
  - Check brand grouping logic (if implemented)

#### **C. Order & Payment**
- [ ] `POST /api/orders/` - Create order
  - Test order with products from 3+ different brands
  - Verify brandId in order items
  
- [ ] Order history
  - Test filtering orders by brand

**Backend API Test Commands**:
```bash
# Test product listing with brand filter
curl "http://localhost:8001/api/products/?brandId=COVE&page_size=10"

# Test product from new brand
curl "http://localhost:8001/api/products/urbanpulse-hoodie-001/"

# Verify all 15 brands exist
curl "http://localhost:8001/api/products/" | jq '.results[].brandId' | sort -u
```

---

### **Phase 2: Frontend Integration** 🎨

#### **A. Catalog Page**
- [ ] **Product Grid**
  - Displays all 1,933 products with pagination
  - Images load correctly (Pexels URLs)
  - Pricing displays properly (€8-€402 range)
  
- [ ] **Brand Filtering** (NEW FEATURE)
  - [ ] Add brand filter UI component
  - [ ] Filter products by selected brand
  - [ ] Display brand count badges
  - [ ] Multi-brand selection support
  
- [ ] **Existing Filters**
  - Gender (Female/Male/Unisex)
  - Type (10 categories)
  - Price range
  - Size availability

#### **B. Product Detail Page**
- [ ] Product info displays correctly
- [ ] **Brand name** visible and linked
- [ ] All 3 images display (front/back/detail)
- [ ] Size selector with stock levels
- [ ] Color variants (different brands may have different color names)
- [ ] Care instructions, fabric details visible

#### **C. Cart & Checkout**
- [ ] Add to cart works for all brands
- [ ] Cart displays **multi-brand** items
  - Consider: Group by brand in cart UI?
  - Show brand logo/name per item
- [ ] Checkout flow handles multi-brand orders
- [ ] Order confirmation shows brands

**Frontend Test Scenarios**:
```
Scenario 1: Single Brand Shopping
1. Filter catalog by "COVE"
2. Add 3 products to cart
3. Verify cart shows COVE brand
4. Complete checkout

Scenario 2: Multi-Brand Shopping
1. Add product from COVE
2. Add product from UrbanPulse
3. Add product from LuxeLine
4. Verify cart shows all 3 brands
5. Complete checkout
6. Verify order has all brands

Scenario 3: Brand Navigation
1. Browse catalog by brand
2. Click brand filter
3. Apply multiple brands
4. Clear filters
```

---

### **Phase 3: AI Core Integration** 🤖

#### **A. Data Ingestion**
- [ ] **Remove duplicate JSON**
  ```bash
  rm /Users/ssg/Desktop/COVE/cove-ai-core/data/productVariantsFlat_final.json
  ```

- [ ] **Update scripts to fetch from backend API**
  - [ ] `embed_all_products.py` - fetch from API
  - [ ] `generate_embeddings.py` - fetch from API
  - [ ] Any other scripts using local JSON

#### **B. Embedding Generation**
- [ ] Regenerate embeddings for all 1,933 products
- [ ] Verify vector database has correct count
- [ ] Test embedding quality with sample queries

**Commands**:
```bash
cd /Users/ssg/Desktop/COVE/cove-ai-core
python scripts/embed_all_products.py  # Should fetch from backend API now
```

#### **C. Search & Recommendations**
- [ ] **Semantic Search**
  - Test: "comfortable black hoodie"
  - Verify returns products from multiple brands
  - Check ranking quality
  
- [ ] **Hybrid Search**
  - Test with filters + semantic query
  - Example: "oversized hoodie" + brandId=COVE
  
- [ ] **Brand-Aware Recommendations**
  - Test: Recommend similar to COVE hoodie
  - Should include other brands if relevant
  - Option: Brand preference in recommendations?

- [ ] **Collaborative Filtering**
  - Verify CF works with multi-brand catalog
  - Test cross-brand recommendations
  - Example: Users who bought COVE also bought UrbanPulse

**AI Core Test Commands**:
```python
# Test search with brand filter
from app.search_service import hybrid_search
results = hybrid_search(
    query="black hoodie",
    filters={"brandId": ["COVE", "UrbanPulse"]},
    limit=10
)

# Test recommendations across brands
from app.recommendations import get_similar_products
similar = get_similar_products(
    product_id="COVE-H-0001",
    include_other_brands=True,
    limit=5
)
```

---

## 🔑 brandId Integration Points

### **Schema Verification**
The new `brandId` field must be present in:

1. **Database Models**
   - `ProductMasterGroup.brandId` ✅ (check if exists)
   - Indexed for fast filtering

2. **API Serializers**
   - `ProductSerializer` includes `brandId`
   - `ColorGroupSerializer` includes `brandId` via product relation

3. **Frontend Types**
   ```typescript
   interface Product {
     // ... existing fields
     brandId: string;  // NEW
     brandName?: string;  // Derived from brandId
   }
   ```

4. **AI Core Data Models**
   ```python
   # Embedding metadata
   {
     "product_id": "...",
     "brandId": "COVE",  # NEW - for filtering
     "type": "hoodie",
     # ... other fields
   }
   ```

---

## 🧪 Test Data Scenarios

### **15 Brands to Test**
1. COVE (minimalist essentials)
2. UrbanPulse (streetwear)
3. NordicThread (Scandinavian premium)
4. EcoHaven (sustainable)
5. FlexFit (athleisure)
6. LuxeLine (luxury)
7. TimelessCo (heritage)
8. TechUrban (technical)
9. FreeSpirit (bohemian)
10. CoreBasics (budget basics)
11. StreetVibe (youth culture)
12. ComfortZone (comfort-focused)
13. BoldHues (colorful)
14. SimpleStack (value)
15. ModernHeritage (contemporary classic)

### **Gender Distribution to Verify**
- Female: ~47% of products
- Unisex: ~34% of products
- Male: ~19% of products

### **Price Tiers**
- Budget: €8-€30 (SimpleStack, CoreBasics)
- Mid-range: €30-€100 (COVE, UrbanPulse)
- Premium: €100-€200 (NordicThread, ModernHeritage)
- Luxury: €200-€400 (LuxeLine)

---

## 📊 Verification Metrics

### **Database**
```sql
-- Total products
SELECT COUNT(*) FROM catalog_productmastergroup;  -- Should be 1933

-- Products per brand
SELECT brand_id, COUNT(*) FROM catalog_productmastergroup 
GROUP BY brand_id ORDER BY COUNT(*) DESC;

-- Gender distribution
SELECT gender, COUNT(*) FROM catalog_productmastergroup 
GROUP BY gender;
```

### **API Health Check**
```bash
# Total count
curl -s "http://localhost:8001/api/products/" | jq '.count'

# Brand distribution
curl -s "http://localhost:8001/api/products/?page_size=2000" | \
  jq -r '.results[].brandId' | sort | uniq -c | sort -rn

# Price range
curl -s "http://localhost:8001/api/products/?page_size=2000" | \
  jq '[.results[].base_price] | min, max'
```

### **Frontend Metrics**
- Page load time < 2s
- All images load successfully
- Filters respond < 500ms
- Cart operations < 1s

### **AI Core Metrics**
- Embedding generation < 5 min total
- Search query response < 500ms
- Recommendation generation < 1s
- Cross-brand recommendations include 2+ brands

---

## 🚀 Execution Plan

### **Step 1: DB Load Completion** (Current - 43%)
- Wait for all 1,933 products to load
- Verify no errors in load log
- Check final count matches

### **Step 2: Backend Verification** (15 minutes)
- Test all API endpoints
- Verify brandId filtering works
- Test multi-brand cart/orders

### **Step 3: Frontend Updates** (30 minutes)
- Add brand filter UI
- Test product display
- Verify cart handles multi-brand

### **Step 4: AI Core Updates** (45 minutes)
- Remove duplicate JSON
- Update scripts to use API
- Regenerate embeddings
- Test search/recommendations

### **Step 5: End-to-End Test** (20 minutes)
- Complete user journey
- Multi-brand shopping cart
- Order placement
- AI recommendations work

### **Step 6: Documentation** (10 minutes)
- Update API docs with brandId
- Document brand filtering patterns
- Update deployment guide

**Total Estimated Time**: ~2 hours after DB load completes

---

## ⚠️ Potential Issues & Fixes

### **Issue 1: brandId Missing from Frontend**
**Symptom**: Brand filter doesn't work  
**Fix**: Update API serializers to include `brandId`

### **Issue 2: Cart Groups by Brand Unexpectedly**
**Symptom**: Checkout fails with multi-brand carts  
**Fix**: Update order creation logic to handle multiple brands

### **Issue 3: AI Recommendations Single-Brand Only**
**Symptom**: Only shows same brand in "similar products"  
**Fix**: Update recommendation logic to include `include_other_brands` flag

### **Issue 4: Images Don't Load**
**Symptom**: Broken image links from Pexels  
**Fix**: Verify Pexels URLs are absolute, consider CDN migration

### **Issue 5: Performance Degradation**
**Symptom**: API slow with 1,933 products  
**Fix**: Add database indexes on `brandId`, `type`, `gender`

---

## ✅ Success Criteria

- [ ] All 1,933 products visible in frontend catalog
- [ ] 15 brands filterable and distinct
- [ ] Multi-brand cart and checkout work flawlessly
- [ ] AI search returns relevant cross-brand results
- [ ] Recommendations include variety of brands
- [ ] Page load times acceptable (<2s)
- [ ] No console errors in frontend
- [ ] Backend API responses under 500ms
- [ ] Embeddings regenerated successfully

---

**Next Action**: Wait for DB load completion, then execute Phase 1-6 systematically.
