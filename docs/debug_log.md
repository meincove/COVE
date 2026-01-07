# Debug Log: Blue Hoodie Integration Issues

## Test Query: "show me a blue hoodie"

### Expected Flow
1. Parse query → Extract colors: ["mid blue", "ink navy"] (via synonyms)
2. Search with color filter → Find 6 hoodies
3. ProductAvailabilityChecker validates → recommend=True
4. Return 6 hoodies to user

### Actual Flow (from logs)

#### Step 1: Parse Query ❌
```json
{"attrs": {}, "intent": "discover"}
```
**Problem**: `attrs` is empty! Color synonym expansion didn't happen.

#### Step 2: Search ✅
```json
{
  "event": "recs_done",
  "count": 6,
  "filters": {"type": "hoodie", "color": "blue"}
}
```
**Status**: Search found 6 hoodies with "blue" filter

#### Step 3: Availability Check ✅ (LLM logic)
```
🕵️ Availability Check: query='show me a blue hoodie', results=6
🤖 Availability LLM: exact=False, close=True, recommend=True
   Explanation: Found correct product type (hoodies) but color information is missing in results.
```
**Status**: LLM correctly says "recommend=True"

#### Step 4: Return to Client ❌
```
Items Found: 0
Parsed Attrs: {}
Rec Filters: {}
```
**Problem**: Despite LLM saying "recommend=True", client receives 0 items!

---

## Root Causes Identified

### Issue 1: Color Synonym Expansion Not Applied
**File**: `app/routes/rag.py` (`_parse_query_attrs`)
**What I Added**:
```python
COLOR_SYNONYMS = {
    "blue": ["mid blue", "ink navy"],
    ...
}
# Expansion logic
for tok in toks:
    if tok in COLOR_SYNONYMS:
        for catalog_color in COLOR_SYNONYMS[tok]:
            if catalog_color in v["colors"]:
                colors.append(catalog_color)
```

**Why It's Not Working**: 
- Code was added to `_parse_query_attrs`
- But logs show `attrs: {}` → function either not called or results discarded
- **Hypothesis**: `agent.py` might be calling `_parse_query_attrs` but not using the result for search

**Evidence**: Search uses `"color": "blue"` directly, not the expanded synonym list

---

### Issue 2: Response Formatting/Filtering
**File**: `app/routes/agent.py` (lines 2414-2442)
**Integration Point**: ProductAvailabilityChecker → AgentOut

**Current Code**:
```python
availability = await checker.check_and_recommend(
    user_query=q,
    search_results=[it.dict() for it in items]
)

if not availability.get("should_show_results", True):
    return AgentOut(
        kind="answer",
        answer=availability.get("honesty_message"),
        items=[],  # ← Returns empty items
    )

# If we get here, should show items
intro_line = intro_info.get("text", availability.get("honesty_message") or "Here are some options.")

return AgentOut(
    kind="recommendations",
    answer=intro_line,
    items=items,  # ← Should return items here
)
```

**Problem**: Even though `should_show_results=True` (from recommend=True), something is still filtering out the items before the final response.

**Hypothesis**: The `items` variable might be empty by the time we reach the return statement, or there's another filter happening.

---

### Issue 3: Missing Color Data in Results
**LLM said**: "color information is missing in results"

**Implication**: The search results returned by `/ai/recs/suggest` don't include color metadata, so the LLM can't verify color matches.

**File to Check**: `app/routes/recs.py` - Are we returning `color` field in RecItem?

---

## Debugging Steps Needed

1. **Trace `_parse_query_attrs` execution**:
   - Add print at start of function to confirm it's called
   - Print the `toks` set to see if "blue" is detected
   - Print the final `colors` list after expansion

2. **Trace `agent.py` recommendations branch**:
   - Print `items` length before ProductAvailabilityChecker
   - Print `availability` full response
   - Print `items` length after checker but before return
   - Check if there are any other filters applied after the checker

3. **Check RecItem schema**:
   - Verify `color` field is included in search results
   - If missing, update `app/routes/recs.py` to include it

---

## Quick Wins to Try

### Option A: Bypass ProductAvailabilityChecker Temporarily
Comment out the availability check to isolate the color synonym issue:
```python
# availability = await checker.check_and_recommend(...)
# Just return items directly
return AgentOut(
    kind="recommendations",
    answer="Here are some hoodies",
    items=items,
)
```

### Option B: Force Color Synonym in Search
Instead of relying on `_parse_query_attrs`, directly expand colors in `agent.py` before calling search:
```python
# In agent.py, before calling _call_recs_suggest
if "blue" in q.lower() and not rec_filters.get("color"):
    rec_filters["color"] = "mid blue"  # Force one variant
```

### Option C: Add More Debug Prints
```python
# In agent.py after _parse_query_attrs
print(f"🔍 Parsed attrs: {attrs}")
print(f"🎯 Rec filters: {rec_filters}")

# Before ProductAvailabilityChecker
print(f"📦 Items before check: {len(items)}")

# After ProductAvailabilityChecker
print(f"✅ Should show: {availability.get('should_show_results')}")
print(f"📦 Items after check: {len(items)}")
```
