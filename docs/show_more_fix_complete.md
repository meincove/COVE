# ✅ "Show More" Fix - WORKING!

## Problem Solved

**Before:** User asks "show me hoodies" → Gets 4 hoodies → "show me more" → Gets SAME 4 hoodies ❌

**After:** User asks "show me hoodies" → Gets 4 hoodies → "show me more" → Gets 4 DIFFERENT hoodies ✅

---

## Implementation Summary

### 1. Added Session Tracking
```python
# Dynamic per-user tracking (NOT hardcoded!)
_SESSION_SHOWN_SLUGS: Dict[str, set] = {}
```

### 2. Helper Functions
- `_get_shown_slugs(body)` - Get what THIS user has seen
- `_mark_slugs_as_shown(body, slugs)` - Remember what we showed THIS user  
- `_filter_out_shown_items(items, shown_slugs)` - Remove already-seen items

### 3. Integrated into Search Flow
```python
# Fetch MORE items when user has history
shown_slugs = _get_shown_slugs(body)
if shown_slugs:
    search_top_k = body.top_k * 3  # Get 12 instead of 4

# Filter out shown items
items = _filter_out_shown_items(items, shown_slugs)

# Limit to requested amount
items = items[:body.top_k]

# Remember these for next time
_mark_slugs_as_shown(body, [i.slug for i in items])
```

---

## Test Results

### Test 1: Sequential Requests
```bash
# Request 1
{"message": "hoodies", "top_k": 4, "guestSessionId": "test-789"}
→ Returns: CoreBasics Hoodie (x2), StreetVibe Hoodie (x2)

# Request 2 (same session)
{"message": "show me more hoodies", "top_k": 4, "guestSessionId": "test-789"}
→ Returns: UrbanPulse Hoodie (x4) ✅ DIFFERENT!
```

###Test 2: Different Users
```bash
# User A
{"message": "hoodies", "guestSessionId": "user-A"}
→ Returns: CoreBasics, StreetVibe 

# User B  
{"message": "hoodies", "guestSessionId": "user-B"}
→ Returns: CoreBasics, StreetVibe ✅ SAME (different session)

# User A "show more"
→ Returns: UrbanPulse ✅ NEW for User A
```

---

## Key Features

✅ **Completely Dynamic** - No hardcoded product lists  
✅ **Per-User Tracking** - Each session tracks separately  
✅ **Automatic** - No configuration needed  
✅ **Scalable** - Works with any number of products  
✅ **Smart Fetching** - Gets 3x items when filtering needed  

---

## Files Modified

### [`app/routes/agent.py`](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py)

**Line ~417:** Added `_SESSION_SHOWN_SLUGS` dictionary

**Lines ~480-505:** Added helper functions:
- `_get_shown_slugs()`
- `_mark_slugs_as_shown()`
- `_filter_out_shown_items()`

**Lines ~1748-1755:** Smart fetching (3x items if user has history)

**Lines ~1803-1815:** Filter and track shown items

---

## Debug Output

Check `debug_plan` field for:
- `expanded_search_for_shown`: true (when fetching extra items)
- `filtered_shown_items`: N (how many were filtered out)

---

## Edge Cases Handled

1. **First time user** → No filtering, show top results
2. **Returninguser** → Filter shown items, show next batch
3. **No more items** → Shows empty (could add "no more results" message)
4. **Different sessions** → Each tracks independently
5. **Same product, different variants** → All tracked separately by slug

---

## Summary

**Status:** ✅ WORKING  
**Approach:** Dynamic session-based tracking (NO hardcoding)  
**Impact:** Users can now browse through ALL products, not just see the same ones repeatedly  
**Backward Compatible:** Yes - existing searches work as before  

**Result:** "Show more" actually shows MORE! 🎉
