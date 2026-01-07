# Implementation Plan: Fix "Show More" Duplicates

## Problem

When user asks "show me hoodies" then "show me more", they get THE SAME 4 hoodies again instead of new ones.

**Root Cause:** No tracking of what products were already shown to the user.

---

## Proposed Solution (NO HARDCODING)

### Dynamic Session Tracking

**NOT Hardcoded:**
- ❌ NOT a fixed list of products
- ❌ NOT predefined exclusions
- ✅ Dynamic per-user session tracking
- ✅ Automatically clears between sessions
- ✅ Scales with any number of products

### Implementation

#### 1. Session State (In-Memory)
```python
# Dynamic session tracking - one set per user session
_SESSION_SHOWN_SLUGS: Dict[str, set] = {
    "user:123": {"pg-hoodie-1", "pg-hoodie-2"},  # What user:123 saw
    "cart:abc": {"pg-tee-5", "pg-tee-8"},        # What cart:abc saw
}
```

#### 2. Track When Items Are Shown
```python
def _mark_slugs_as_shown(body: AgentIn, slugs: List[str]):
    """Dynamically remember what THIS user saw"""
    session_key = get_user_session_key(body)  # cart:123 or user:456
    if session_key not in _SESSION_SHOWN_SLUGS:
        _SESSION_SHOWN_SLUGS[session_key] = set()
    _SESSION_SHOWN_SLUGS[session_key].update(slugs)  # Add to THIS user's set
```

#### 3. Filter Out Already-Shown Items
```python
def _filter_out_shown_items(items: List[AgentItem], body: AgentIn):
    """Dynamically exclude what THIS user already saw"""
    shown_slugs = _get_shown_slugs(body)  # Get THIS user's shown items
    return [item for item in items if item.slug not in shown_slugs]
```

#### 4. Use in Search Flow
```python
# When user searches:
results = search_hybrid(query="hoodies", top_k=20)  # Get MORE than needed

# Filter out what THIS user already saw
shown_slugs = _get_shown_slugs(body)
new_results = [r for r in results if r.slug not in shown_slugs]

# Take top_k from NEW results
final_items = new_results[:body.top_k]

# Remember we showed these to THIS user
_mark_slugs_as_shown(body, [item.slug for item in final_items])
```

---

## Why This Is NOT Hardcoding

| Hardcoding | Our Solution |
|------------|--------------|
| Fixed list: `["item1", "item2"]` | Dynamic set per user |
| Same for all users | Different for each session |
| Never changes | Automatically updates |
| Defined in code | Built from actual search results |
| Requires code changes to update | Self-managing |

**Example:**
- User A sees hoodies 1-4 → Stored in `_SESSION_SHOWN_SLUGS["user:A"]`
- User B sees hoodies 5-8 → Stored in `_SESSION_SHOWN_SLUGS["user:B"]`
- User A asks "show more" → Gets hoodies 9-12 (NOT 1-4, NOT 5-8)
- Completely dynamic, no hardcoded values!

---

## Files to Modify

### [app/routes/agent.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py)

#### Add Session Tracking (Line ~415)
```python
_SESSION_SHOWN_SLUGS: Dict[str, set] = {}  # Dynamic tracking
```

#### Add Helper Functions (Line ~465)
```python
def _get_shown_slugs(body: AgentIn) -> set:
    """Get slugs THIS user has seen"""
    
def _mark_slugs_as_shown(body: AgentIn, slugs: List[str]):
    """Remember THIS user saw these"""
    
def _filter_out_shown_items(items: List[AgentItem], shown_slugs: set):
    """Exclude what user already saw"""
```

#### Modify Search Flow (Line ~1700)
```python
# Before returning items to user:
shown_slugs = _get_shown_slugs(body)
items = _filter_out_shown_items(items, shown_slugs)
_mark_slugs_as_shown(body, [i.slug for i in items])
```

---

## Testing

### Test Case 1: Show More Works
```bash
# Request 1
curl -X POST /ai/agent/query -d '{"message": "hoodies", "top_k": 4}'
# Returns: hoodie-1, hoodie-2, hoodie-3, hoodie-4

# Request 2 (same session)
curl -X POST /ai/agent/query -d '{"message": "show me more hoodies", "top_k": 4}'
# Returns: hoodie-5, hoodie-6, hoodie-7, hoodie-8  ✅ NEW ITEMS
```

### Test Case 2: Different Users See Different Items
```bash
# User A
curl -X POST /ai/agent/query -d '{"clerkUserId": "A", "message": "hoodies"}'
# Returns: hoodie-1, hoodie-2

# User B
curl -X POST /ai/agent/query -d '{"clerkUserId": "B", "message": "hoodies"}'
# Returns: hoodie-1, hoodie-2  ✅ SAME (different session)

# User A asks "show more"
curl -X POST /ai/agent/query -d '{"clerkUserId": "A", "message": "more"}'
# Returns: hoodie-3, hoodie-4  ✅ NEW FOR USER A
```

---

## Summary

**What We're Adding:**
- ✅ Dynamic session tracking (per user)
- ✅ Automatic filtering of shown items
- ✅ Scales to any number of products
- ❌ NO hardcoded product lists
- ❌ NO fixed exclusions
- ❌ NO manual configuration needed

**Result:**
"Show more" will ACTUALLY show MORE products, not the same ones.
