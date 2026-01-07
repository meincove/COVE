# Bug Fixes: Persona & Search

## 1. Greeting Fix
**Issue**: "Hello" resulted in a robotic "How can I assist you" response instead of the warmer Stylist persona.
**Cause**: The `greeting` intent was explicitly passing `smalltalk=False` to the LLM handler, forcing a generic prompt.
**Fix**: Changed the flag to `smalltalk=True` in `app/routes/agent.py`.

```python
# app/routes/agent.py
if intent_kind == "greeting":
    ans_msg = await _call_llm_with_history(
        ...,
        smalltalk=True,  # CHANGED from False
        ...
    )
```

**Verification**:
Response is now: *"Hello! Hope you're having a great day. If you need any help with styling or finding the perfect piece, just let me know!"*

## 2. Skirts Search Fix
**Issue**: "i need some skirts" returned 0 results, then fell back to showing shirts.
**Cause**: The fuzzy matching logic (`app/core/fuzzy.py`) aggressively corrected "skirt" to "shirt" (Levenshtein distance 1) because "skirt" wasn't in the *common corrections* list, and it ignored the fact that "skirt" is valid in the catalog.
**Fix**: Added a safety check in `apply_common_corrections` to return the word immediately if it exists in `catalog_types`.

```python
# app/core/fuzzy.py
def apply_common_corrections(word, config, catalog_types=None):
    word_lower = word.lower()
    
    # 0. SAFETY CHECK: If word is already a valid catalog term, DON'T touch it!
    if catalog_types and word_lower in catalog_types:
        return word
    
    # ... existing typo correction logic ...
```

**Verification**:
- Query "skirt" is preserved.
- Returns 6 valid skirt products (e.g., "TimelessCo Skirt", "UrbanPulse Skirt").

## 3. Shoes Search Fix (Broad Category Mapping)
**Issue**: "i need some shoes" returned 0 results because "shoes" isn't a catalog type.
**Cause**: Catalog has `boots`, `heels`, `loafers`, `sneakers` — but no generic "shoes" type. The parser couldn't map it.
**Fix**: Added `broad_category_map` to `data/type_normalization_config.json` and updated `_normalize_type_token` in `app/routes/rag.py` to use it.

```json
// data/type_normalization_config.json
"broad_category_map": {
    "shoes": ["boots", "heels", "loafers", "sneakers"],
    "footwear": ["boots", "heels", "loafers", "sneakers"],
    "outerwear": ["jacket", "blazer", "sweater", "hoodie"],
    "tops": ["tee", "shirt", "sweater", "hoodie", "sweatshirt"]
}
```

**Verification**:
- "shoes" → "boots" mapping triggered.
- Returns 3 Chelsea Boots products.

## 4. Context-Aware Cart Add
**Issue**: "add this to cart" after discussing a product failed with "I'm not sure which item".
**Cause**: Cart resolution checked session `last_recs` but didn't look at conversation history to understand "this" references the product just discussed.
**Fix**: 
1. Added `_get_recently_discussed_product_index` helper (line 412-453) that scans history for ordinal references like "second one"
2. Modified cart branch to fetch history and resolve vague references before LLM selection

**Verification**:
```
User: "show me some boots" → 3 items shown
User: "how much for the second one" → "Chelsea Boots in Chocolate Suede are priced at $150"
User: "add this to cart" → ✅ "Great choice! What size would you like?"
```

Debug output confirmed: `cart_source: "context_history"`, `cart_context_idx: 1`
