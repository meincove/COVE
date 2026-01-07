# Deep Dive Summary: Blue Hoodie Integration Issues

## Investigation Timeline

### Phase 1: Initial Diagnosis (✅ Complete)
Added comprehensive debug logging to trace the entire flow:
- `_parse_query_attrs`: Added prints for tokens, synonym expansion, final attrs
- `agent.py` filter building: Added prints for attrs, base_filters, rec_filters
- Recommendations branch: Added prints for item counts before/after filters
- ProductAvailabilityChecker: Added prints for LLM analysis results

### Phase 2: Root Cause Identification (✅ Complete)

#### ROOT CAUSE #1: Wrong Table in Vocab Query ⛔ CRITICAL
**File**: `app/vector/store.py` - `catalog_vocab()` function

**Problem**:
```python
# OLD CODE (WRONG):
SELECT DISTINCT lower(meta->>'colorName')
FROM ai_core.docs          # ← Wrong table!
WHERE kind = 'product'
```

**Evidence from database inspection**:
```
ai_core.docs table:
  - Products: 2567
  - Colors:   [] (EMPTY!)
  - Explanation: This table has products but NO color metadata

ai_products table:
  - Products: 24
  - Colors:   ['black', 'charcoal', 'ink navy', 'mid blue', 'stone grey', ...]
  - Explanation: This is the CORRECT table with actual color data
```

**Impact**:
1. Vocab cache had empty colors list
2. Color synonym expansion failed:
   ```
   🔍 [PARSE] Found synonym key 'blue', expanding to: ['mid blue', 'ink navy']
   🔍 [PARSE]   ✗ Skipped 'mid blue' (not in catalog)  ← WRONG!
   🔍 [PARSE] ✗ Skipped 'ink navy' (not in catalog)     ← WRONG!
   ```
3. Query attrs contained only "blue" instead of ["mid blue", "ink navy"]
4. Search couldn't find products with "mid blue" or "ink navy" colors

**FIX APPLIED** (Lines 365-390 in `store.py`):
```python
# NEW CODE (CORRECT):
SELECT DISTINCT lower(metadata->>'color')
FROM ai_products           # ← Correct table!
WHERE metadata->>'color' IS NOT NULL
  AND metadata->>'color' != ''
```

**Expected Result After Fix**:
```
🔍 [PARSE] Found synonym key 'blue', expanding to: ['mid blue', 'ink navy']
🔍 [PARSE]   ✓ Added 'mid blue' (in catalog)
🔍 [PARSE]   ✓ Added 'ink navy' (in catalog)
🔍 [PARSE] Final parsed attrs: {'colors': ['blue', 'mid blue', 'ink navy'], ...}
```

---

#### ROOT CAUSE #2: Vocab Cache Staleness ⏰
**File**: `app/vector/store.py` - Cache TTL

**Problem**:
- Vocab cache has 60-second TTL
- Even after fixing SQL, cache still returns old (empty) vocab
- Server auto-reload doesn't clear in-memory cache

**FIX APPLIED**:
1. Changed default TTL from 60 to 0 (force refresh on every query)
2. Added debug logging to show when cache is used vs refreshed:
   ```python
   print(f"📚 [VOCAB] Cache expired or empty, refreshing from ai_products...")
   print(f"📚 [VOCAB] Loaded {len(colors)} colors: {sorted(colors)}")
   ```

**Note**: TTL=0 is temporary for verification. Should restore to 60 after confirming fix works.

---

#### ROOT CAUSE #3: Items Missing from Response 🔄
**File**: `app/routes/agent_stream.py` (suspected)

**Problem**:
Server logs show:
```
✅ [AVAILABILITY] Approved results - proceeding with 6 items
[STREAMING DEBUG] Final done_data keys: ['kind', 'answer', 'thinking_events', 'tools_used']
```

**Notice**: `items` key is MISSING from `done_data`!

**Evidence**:
- ProductAvailabilityChecker returns: `should_show_results=True`, `recommended_items=6`
- Agent approves and proceeds with 6 items
- But streaming response doesn't include `items` in final JSON

**Hypothesis**:
Items are being filtered/stripped during the streaming serialization process in `agent_stream.py`.

**STATUS**: 🔍 **NOT YET FIXED** - Need to investigate streaming code

---

## Files Modified

### 1. `/app/routes/rag.py` - Color Synonym Expansion (✅ Working)
**Lines**: 838-893
**Changes**:
- Added `COLOR_SYNONYMS` dictionary mapping simple colors to catalog variants
- Added synonym expansion logic in `_parse_query_attrs`
- Added comprehensive debug logging

**Code**:
```python
COLOR_SYNONYMS = {
    "blue": ["mid blue", "ink navy"],
    "navy": ["ink navy", "mid blue"],
    "white": ["optical white", "off-white"],
    "black": ["jet black", "black"],
    "grey": ["stone grey", "charcoal"],
    "gray": ["stone grey", "charcoal"],
}

# Expand via synonyms
for tok in toks:
    if tok in COLOR_SYNONYMS:
        for catalog_color in COLOR_SYNONYMS[tok]:
            if catalog_color in v["colors"]:
                expanded_colors.append(catalog_color)
```

### 2. `/app/vector/store.py` - Vocab Query Fix (✅ Fixed, Pending Verification)
**Lines**: 354-398
**Changes**:
- Changed SQL to query `ai_products` instead of `ai_core.docs`
- Changed column from `meta->>'colorName'` to `metadata->>'color'`
- Changed TTL from 60 to 0 (temporary)
- Added debug logging for cache hits and vocab loading

### 3. `/app/routes/agent.py` - Debug Logging (✅ Complete)
**Lines**: 1604-1616, 2419-2459
**Changes**:
- Added debug prints for parsed attrs, filters
- Added debug prints for item counts before/after filtering
- Added debug prints for ProductAvailabilityChecker results

### 4. `/app/agents/product_availability_checker.py` - Debug Logging & Lenient Validation (✅ Complete)
**Lines**: 109-120, 182-184
**Changes**:
- Added examples of color families to LLM prompt (blue ≈ mid blue ≈ ink navy)
- Added debug logging for LLM analysis results

---

## Verification Status

### ✅ Verified Working:
1. Color synonym expansion logic (code is correct)
2. ProductAvailabilityChecker LLM validation (approves blue hoodies)
3. Debug logging (traces entire flow)

### ⏳ Pending Verification:
1. **Vocab query fix**: SQL updated but cache may still be stale
   - **Action Needed**: Wait for server reload OR manually restart server
   - **Expected**: Vocab should now load 12+ colors from `ai_products`

### ❌ Still Broken:
1. **Items missing from response**: ProductAvailabilityChecker approves 6 items but client receives 0
   - **Root Cause**: Items being filtered during streaming/serialization
   - **File to Investigate**: `app/routes/agent_stream.py`
   - **Action Needed**: Find where `items` are supposed to be added to `done_data`

---

## Next Steps

### Immediate (Critical Path):
1. **Verify vocab fix**:  
   - Restart server manually to clear cache
   - Run test and check for: `📚 [VOCAB] Loaded 12 colors from ai_products: ['black', 'charcoal', 'ink navy', 'mid blue', ...]`
   - Verify: `🔍 [PARSE]   ✓ Added 'mid blue' (in catalog)`

2. **Fix streaming response**:
   - Search `agent_stream.py` for where `items` should be added to response
   - Ensure `AgentOut.items` are included in the streamed `done` event
   - Verify client receives `Items Found: 6`

### Follow-up (Post-Fix):
1. Restore vocab cache TTL from 0 back to 60
2. Remove debug print statements (or convert to proper logging)
3. Test with multiple color queries: "white hoodie", "black tee", "grey jacket"
4. Update walkthrough with successful test results

---

## Debug Logs Reference

### Expected Flow (After All Fixes):
```
📚 [VOCAB] Loaded 12 colors from ai_products: ['black', 'charcoal', 'ink navy', ...]
🔍 [PARSE] Starting _parse_query_attrs for query: 'show me a blue hoodie'
🔍 [PARSE] Extracted tokens: {'blue', 'hoodie', ...}
🔍 [PARSE] Direct color matches from vocab: ['blue']
🔍 [PARSE] Found synonym key 'blue', expanding to: ['mid blue', 'ink navy']
🔍 [PARSE]   ✓ Added 'mid blue' (in catalog)
🔍 [PARSE]   ✓ Added 'ink navy' (in catalog)
🔍 [PARSE] Colors after synonym expansion: ['blue', 'ink navy', 'mid blue']
🔍 [PARSE] Final parsed attrs: {'colors': ['blue', 'ink navy', 'mid blue'], 'types': ['hoodie']}
🎯 [AGENT] Base filters: {'type': 'hoodie', 'color': 'blue'}  ← Should be list!
...
📦 [RECS] Items before filtering: 6 items
✅ [AVAILABILITY] Approved results - proceeding with 6 items
[STREAMING] Final done_data keys: ['kind', 'answer', 'items', ...]  ← 'items' should be here!
```

### Current Actual Flow (Broken):
```
📚 [VOCAB] Using cached vocab (age: 45.2s)  ← Stale cache
🔍 [PARSE] Found synonym key 'blue', expanding to: ['mid blue', 'ink navy']
🔍 [PARSE]   ✗ Skipped 'mid blue' (not in catalog)  ← Wrong!
🔍 [PARSE]   ✗ Skipped 'ink navy' (not in catalog)  ← Wrong!
...
✅ [AVAILABILITY] Approved results - proceeding with 6 items
[STREAMING] Final done_data keys: ['kind', 'answer', 'thinking_events', ...]  ← No 'items'!
```

---

## Test Commands

```bash
# Verify vocab loading
.venv/bin/python3 tests/check_product_tables.py

# Verify color synonym expansion
.venv/bin/python3 tests/test_blue_hoodie.py

# Check running server
ps aux | grep uvicorn
```
