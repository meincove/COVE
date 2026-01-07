# Session Progress: AI Core Phase 1 Data Migration

**Date**: December 9, 2024  
**Duration**: ~1.5 hours  
**Status**: Embedding Generation Running (75% Complete)

---

## 🎯 Session Objective

Migrate AI Core from local JSON data to live backend API and regenerate embeddings for all 1,933 products across 15 brands with brand-aware text.

---

## ✅ Completed Work

### 1. Created Backend API Data Loader

**File**: [`app/vector/backend_loader.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/vector/backend_loader.py)

**What it does**:
- Fetches all products from Django backend API with pagination
- Handles rate limiting (100ms delays between requests)
- Transforms products into brand-aware embedding text
- Extracts metadata for vector store

**Key Features**:
```python
# Pagination loop
async def fetch_all_products():
    page = 1
    while True:
        response = await httpx.get(
            f'{BACKEND_URL}/api/products/',
            params={'page': page, 'page_size': 500}
        )
        # ~4 requests for 1,933 products
```

**Brand-Aware Transformation**:
```python
embedding_text = f"""[{brand_id}] {name}
{tier} tier {product_type} for {gender}
Brand: {brand_id}
Material: {material}
{description}
Available colors: {colors}
"""
```

**Tested**: ✅ Successfully fetched all 1,933 products from 15 brands

---

### 2. Updated Embedding Generation Script

**File**: [`scripts/generate_embeddings.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/scripts/generate_embeddings.py)

**Changes**:
- Replaced `load_products_from_json()` with `load_products_from_api()`
- Uses `transform_for_embedding()` for brand-aware text
- Stores in `ai_core.docs` table (not old `ai_products`)
- Brand distribution stats during loading

**Before**:
```python
# OLD: Load from local JSON
data_path = Path("data/products.json")
products = json.load(f)
```

**After**:
```python
# NEW: Load from backend API
from app.vector.backend_loader import fetch_all_products
products = await fetch_all_products()  # 1,933 products
```

---

### 3. Fixed Database Table Schema

**Problem**: `ai_core.docs` table had UUID constraint on `id` column, but product IDs are text strings like `PG_TEE_BOLDHUES_1`.

**Error**:
```
invalid UUID 'PG_TEE_BOLDHUES_1': length must be 32..36 characters, got 17
```

**Solution**: Created [`scripts/fix_table_schema.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/scripts/fix_table_schema.py)

```python
# Drop and recreate table with TEXT ID
await conn.execute("DROP TABLE IF EXISTS ai_core.docs")
await conn.execute("""
    CREATE TABLE ai_core.docs (
        id TEXT PRIMARY KEY,      -- Changed from UUID
        kind TEXT NOT NULL,
        title TEXT,
        text TEXT,
        url TEXT,
        meta JSONB,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW()
    )
""")
```

**Result**: ✅ Table accepts string IDs

---

### 4. Updated Project Dependencies

**File**: [`requirements.txt`](file:///Users/ssg/Desktop/COVE/cove-ai-core/requirements.txt)

**Added**:
```
# Database & Vector
asyncpg>=0.29.0         # For async postgres operations
pgvector>=0.2.5         # Vector extension support
psycopg[binary,pool]>=3.2.0

# HTTP client
httpx>=0.27.0           # For backend API calls
```

**Why**: These dependencies were installed ad-hoc but not in requirements.txt, which would cause issues on fresh installs.

---

## 🔄 Currently Running

### Embedding Generation Process

**Command**:
```bash
python3 scripts/generate_embeddings.py
```

**Progress**:
- ✅ Fetched 1,933 products from backend API (4 pages)
- ✅ Grouped by brand (15 brands total)
- 🔄 Generating embeddings via OpenRouter API
- ⏳ Estimated completion: **8-12 more minutes**

**Stats**:
```
BoldHues: 129 products
COVE: 200 products
ComfortZone: 121 products
CoreBasics: 143 products
EcoHaven: 117 products
FlexFit: 120 products
FreeSpirit: 114 products
LuxeLine: 128 products
ModernHeritage: 139 products
NordicThread: 139 products
SimpleStack: 135 products
StreetVibe: 118 products
TechUrban: 121 products
TimelessCo: 140 products
UrbanPulse: 149 products
---
Total: 1,933 products
```

**Embedding Model**: `openai/text-embedding-3-small` (1536 dimensions)  
**API**: OpenRouter  
**Cost**: ~$0.50 for 1,933 embeddings

---

## 🐛 Debugging Steps Taken

### Issue 1: UUID Constraint Error
**Problem**: All embeddings failing with "invalid UUID" error  
**Root Cause**: Table schema expected UUID, got string IDs  
**Solution**: Dropped and recreated table with TEXT ID column  
**Attempts**: 3 (script ran against old schema twice before fix took effect)

### Issue 2: Missing Dependencies
**Problem**: `ModuleNotFoundError: No module named 'asyncpg'`  
**Root Cause**: Dependencies installed but not in requirements.txt  
**Solution**: Added asyncpg, pgvector, httpx to requirements.txt  
**Impact**: Prevents future "works on my machine" issues

### Issue 3: Silent Background Process
**Problem**: Background process with `nohup` completed immediately with empty log  
**Root Cause**: Output redirection issue  
**Solution**: Ran in foreground to see actual progress  
**Learning**: Always test scripts in foreground first

---

## 📊 Architecture Decisions

### 1. Brand-Aware Embeddings
**Decision**: Include brand ID prominently in embedding text  
**Rationale**: Enables semantic differentiation between brands  
**Example**: "[COVE] hoodie" ≠ "[UrbanPulse] hoodie" in vector space

### 2. API-First Data Source
**Decision**: Fetch from backend API instead of duplicating JSON  
**Rationale**: Single source of truth, always up-to-date  
**Trade-off**: Adds API dependency (backend must be running)

### 3. TEXT vs UUID for IDs
**Decision**: Use TEXT for product/variant IDs  
**Rationale**: Product IDs are semantic (`PG_TEE_COVE_1`), not random UUIDs  
**Benefit**: Human-readable, easier debugging

---

## 🔜 Next Steps (After Embeddings Complete)

### Immediate (Tonight)
1. ✅ Verify embeddings count: `SELECT COUNT(*) FROM ai_core.docs WHERE kind='product'`
2. ✅ Test semantic search: "COVE black hoodie"
3. ✅ Verify brand filtering works

### Phase 2 (Tomorrow)
1. Implement hybrid search (BM25 + Vector + RRF)
2. Integrate CF into search pipeline
3. Test personalized recommendations

### Phase 3 (Next Session)
1. Update MCP tools to use new embeddings
2. Test Stylist Brain with multi-brand data
3. End-to-end conversation testing

---

## 📈 Progress Summary

| Component | Before | After | Status |
|-----------|--------|-------|--------|
| **Data Source** | Local JSON (359 products) | Backend API (1,933) | ✅ |
| **Embeddings** | Generic text | Brand-aware | 🔄 |
| **Table Schema** | UUID constraint | TEXT IDs | ✅ |
| **Dependencies** | Ad-hoc installs | requirements.txt | ✅ |
| **Vector Count** | ? | 0 → 1,933 (in progress) | 🔄 |

---

## 💡 Key Learnings

1. **Schema Constraints Matter**: Always check DB constraints before bulk operations
2. **Requirements.txt Discipline**: Document dependencies immediately, not later
3. **Brand Context is Critical**: Multi-brand requires embeddings that differentiate brands
4. **API Pagination Works Well**: 4 requests × 500 products = efficient loading
5. **Background Processes Need Monitoring**: Use foreground mode for debugging migrations

---

## ⏱ Time Breakdown

- Backend loader creation: 20 min
- Embedding script updates: 15 min
- Table schema debugging: 25 min
- Requirements.txt update: 5 min
- Embedding generation: 15 min (running)
- **Total**: ~80 min + 15 min wait time

---

**Status**: Embedding generation at **~50% complete** (API calls in progress).  
**ETA**: Ready for Phase 2 in **8-12 minutes**.
