# Context-Aware Cart Add Implementation Plan

## Goal
When user says "add this to cart" after discussing a specific product (e.g., "how much for the second product?"), the system should automatically identify that product and add it to cart.

## Current Behavior
- User: "i need some shoes" → Shows boots
- User: "how much for the second product?" → Agent correctly identifies Chelsea Boots in Chocolate Suede at €199.95
- User: "add this to cart" → ❌ "I'm not sure which item you want me to add"

## Root Cause
The cart resolution logic (`_select_from_last_recs_via_llm`) uses `last_recs` (session-stored recommendations) but doesn't check **conversation history** for the most recently discussed product.

When "add this to cart" is processed:
1. `_looks_like_cart_add` returns True
2. System checks `last_recs` from session storage
3. `_select_from_last_recs_via_llm` tries to match "add this to cart" to one of the last shown products
4. "this" is ambiguous, so it fails to select a single product

## Proposed Solution

### Strategy: Use Conversation History to Resolve "this"

When the cart intent is detected and the message contains vague references like "this", "it", "that one":
1. Fetch recent conversation history
2. Look for the most recently discussed product (via facts or explicit mentions)
3. Use that product for the cart proposal

### Changes

#### [MODIFY] [agent.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py)

**Add new helper function: `_get_recently_discussed_product`**
```python
async def _get_recently_discussed_product(
    history: List[Dict[str, Any]],
    last_recs: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Check conversation history for the most recently discussed product.
    Returns the product if the user was asking about a specific one.
    """
    # Look at recent messages for product-specific questions
    for msg in reversed(history[-5:]):  # Check last 5 messages
        content = msg.get("content", "").lower()
        
        # Check if message was about a specific product (e.g., "second one", "that one")
        ordinal_match = re.search(r'\b(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\b', content)
        if ordinal_match and last_recs:
            ordinal_map = {
                'first': 0, '1st': 0, 
                'second': 1, '2nd': 1,
                'third': 2, '3rd': 2,
                'fourth': 3, '4th': 3,
                'fifth': 4, '5th': 4,
            }
            idx = ordinal_map.get(ordinal_match.group(1).lower(), 0)
            if 0 <= idx < len(last_recs):
                return last_recs[idx]
    
    return None
```

**Modify cart branch at line ~2172**
```python
if wants_cart:
    # NEW: Check if we can resolve "this" from conversation context
    if re.search(r'\b(this|it|that)\b', q.lower()):
        history = await _fetch_history_for_llm(body.clerkUserId, body.guestSessionId, limit=10)
        context_product = await _get_recently_discussed_product(history, last_recs)
        if context_product:
            # Use this product for cart proposal
            top = AgentItem(**context_product)
            # ... proceed with cart proposal flow
```

## Verification Plan

1. **Curl Test Sequence**:
   ```bash
   # 1. Search
   curl ... '{"message": "i need some shoes"}'
   
   # 2. Ask about specific product
   curl ... '{"message": "how much for the second one"}'
   
   # 3. Add to cart
   curl ... '{"message": "add this to cart"}'
   ```
   
2. **Expected Result**: Agent should propose adding Chelsea Boots in Chocolate Suede

## Risk Assessment
- **Low risk**: Only affects cart resolution when vague references are detected
- **Fallback**: If no context product found, falls through to existing logic
