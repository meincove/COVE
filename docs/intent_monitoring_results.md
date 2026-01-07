# Intent Classification - Production Monitoring Results

## Setup Complete ✅

**Date:** 2025-12-08  
**Status:** Monitoring logs added to production  
**Location:** `cove-ai-core/app/routes/agent.py` line 1042

## Log Format

```
[INTENT_MONITOR] query='...' | semantic='...' | mapped='...' | conf=X.XX%
```

## Test Queries Run

| Query | Expected Intent | Status |
|-------|----------------|--------|
| "show me some hoodies" | product_search → discover | ✅ Tested |
| "what size should I get?" | sizing_question → size_fit | ⏳ Pending logs |
| "add this to my cart" | cart_addition → cart_add | ⏳ Pending logs |
| "I want to check out" | checkout_request → checkout_start | ⏳ Pending logs |
| "show me cheap tees under 50 euros" | product_search → discover | ⏳ Pending logs |

## How to Monitor

### Real-time monitoring:
```bash
# In cove-ai-core terminal, watch for [INTENT_MONITOR] logs
# They appear in uvicorn console output
```

### Review logs later:
Check the uvicorn terminal output for lines containing `[INTENT_MONITOR]`

## Next Steps

1. **Collect 10-15 real user queries** from production
2. **Analyze classification accuracy**:
   - Are semantic intents correct?
   - Does mapping work properly?
   - Any edge cases failing?

3. **Decision point**:
   - If accuracy ≥ 90%: ✅ Move to Phase 2 (Product Recommender)
   - If accuracy < 90%: 🔧 Iterate on prompts/config

## Notes

- Monitoring is **passive** - just logging, no changes to behavior
- Confidence scores help identify uncertain classifications
- User is in class - will review results later 📚
