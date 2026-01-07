# Fix Outfit Builder - Fallback Classification Plan

## Problem Summary

**Outfit Builder Not Working Due To**:
1. ✅ Code reordering complete - outfit_builder check runs first
2. ✅ outfit_builder intent added to classifier  
3. ❌ **OpenRouter authentication failing** - "No cookie auth credentials found" (401)

**Impact**: Intent classifier returns "none" instead of "outfit_builder", so outfit builder never triggers.

---

## Root Cause

OpenRouter API call fails with 401 error:
```
AuthenticationError: OpenrouterException - {"error":{"message":"No cookie auth credentials found","code":401}}
```

This causes the classifier to fall back to:
```python
except Exception as e:
    log.error(f"Intent classification failed: {e}", exc_info=True)
    return self.NONE, 0.5, str(e)  # Returns "none" with 0.5 confidence
```

---

## Solution: Add Keyword Fallback

When LLM fails, use keyword matching as fallback.

### Implementation

**File**: `/Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/intent_classifier/classifier.py`

**Add method** `_keyword_fallback_classify`:
```python
def _keyword_fallback_classify(self, query: str) -> Tuple[str, float, str]:
    """
    Keyword-based fallback when LLM fails.
    Simple but reliable for common patterns.
    """
    q = query.lower()
    
    # Outfit builder keywords
    if any(keyword in q for keyword in ["build outfit", "create outfit", "style me", "put together", "complete outfit"]):
        return self.OUTFIT_BUILDER, 0.85, "keyword_match: outfit_builder"
    
    # Product discovery keywords
    if any(keyword in q for keyword in ["show me", "looking for", "find me", "what", "any"]):
        return self.PRODUCT_DISCOVERY, 0.75, "keyword_match: recommendations"
    
    # Cart keywords
    if any(keyword in q for keyword in ["add to cart", "add it", "i'll take", "cop"]):
        return self.CART_OPERATION, 0.80, "keyword_match: cart"
    
    # Checkout keywords
    if any(keyword in q for keyword in ["checkout", "pay", "complete order", "buy now"]):
        return self.CHECKOUT, 0.85, "keyword_match: checkout"
    
    # Default
    return self.NONE, 0.3, "keyword_match: no_match"
```

**Update** `_llm_classify_with_context`:
```python
except Exception as e:
    log.error(f"Intent classification failed: {e}", exc_info=True)
    # Use keyword fallback instead of returning NONE
    log.info("Falling back to keyword-based classification")
    return self._keyword_fallback_classify(query)
```

---

## Benefits

1. **Robust**: Works even when LLM fails
2. **Fast**: No API calls needed
3. **Reliable**: Keyword matching for common patterns
4. **Graceful**: Degrades to keyword matching instead of failing

---

## Testing

```bash
# Test outfit builder
python3 -c "
from app.mcp_agents.intent_classifier import get_classifier
classifier = get_classifier()
result = classifier.classify('build me an outfit', context={})
print(f'Intent: {result[\"intent\"]}')  # Should be: outfit_builder
print(f'Confidence: {result[\"confidence\"]}')  # Should be: 0.85
"

# Test product discovery
python3 -c "
from app.mcp_agents.intent_classifier import get_classifier
classifier = get_classifier()
result = classifier.classify('show me hoodies', context={})
print(f'Intent: {result[\"intent\"]}')  # Should be: recommendations
"
```

---

## Alternative: Fix OpenRouter Auth

If you want to fix the OpenRouter authentication instead:

1. Check API key validity
2. Verify API key format
3. Test with curl:
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": "test"}]}'
```

---

## Recommendation

**Implement keyword fallback** (Option 1) because:
- Quick to implement
- Makes system more robust
- Works regardless of API issues
- Can keep LLM as primary, fallback as backup
