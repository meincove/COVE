# Context Mismatch Bug - Analysis & Fix

## Issue Report

**User Experience**:
1. User asks: "show me tees"
2. AI shows: 2 LuxeLine Tees (basic tier, premium tier)
3. User asks: "tell me more about the second one"
4. AI responds: "The second **hoodie** is the CoreBasics Hoodie..." ❌

**Expected**: AI should say "The second tee is the LuxeLine Tee (premium tier)..."

---

## Root Causes Found

### 1. **Hardcoded Examples in Prompt** (FIXED ✅)

**Location**: `data/prompts/agent_chat.txt` line 17

**Problem**:
```text
Examples:
- User: "what about the second hoodie you showed?" 
  → Answer: "The second hoodie is the CoreBasics Hoodie, it's a basic tier piece..."
```

The AI was **literally following this example** instead of using real conversation context!

**Fix Applied**:
```text
Examples:
- User: "what about the second hoodie you showed?" 
  → Answer using the ACTUAL second product from context (DO NOT use example names)
```

**Impact**: Removed hardcoded product names that confused the LLM

---

### 2. **Fact Extraction Not Running** (INVESTIGATING ⚠️)

**Evidence**:
```bash
curl "http://localhost:8001/ai_profiles/session/facts/get/?guest_session_id=guest_37b3a0df..."
# Returns: {"facts": null}
```

**Problem**: No facts are being extracted, so the AI has **no context** about what products were shown!

**Possible Causes**:
1. Background task not executing (network issues from train WiFi?)
2. Fact extraction failing silently
3. Facts not being stored in database
4. Session ID mismatch

---

## How This Should Work

### Correct Flow:
```
1. User: "show me tees"
2. AI shows 2 LuxeLine Tees
3. Fact Extractor runs in background:
   - Extracts: product_focus.current_products = [
       {name: "LuxeLine Tee", tier: "basic", turn_introduced: 1},
       {name: "LuxeLine Tee", tier: "premium", turn_introduced: 1}
     ]
   - Stores in database
4. User: "tell me more about the second one"
5. AI retrieves facts from database
6. AI sees: current_products[1] = "LuxeLine Tee (premium)"
7. AI responds correctly about the second tee
```

### What's Actually Happening:
```
1. User: "show me tees"
2. AI shows 2 LuxeLine Tees
3. Fact Extractor: ❌ NOT RUNNING or FAILING
4. User: "tell me more about the second one"
5. AI retrieves facts: ❌ NULL (no facts stored)
6. AI falls back to hardcoded example in prompt
7. AI responds: "CoreBasics Hoodie" ❌ WRONG
```

---

## Testing Plan

### Test 1: Verify Prompt Fix
```bash
# Clear old session
# Ask: "show me tees"
# Ask: "tell me more about the second one"
# Expected: Should NOT mention "CoreBasics Hoodie"
```

### Test 2: Check Fact Extraction
```bash
# Monitor logs for "FACT EXTRACTION" messages
tail -f /tmp/ai_core.log | grep "FACT EXTRACTION"

# After showing products, check if facts were stored:
curl "http://localhost:8001/ai_profiles/session/facts/get/?guest_session_id=<SESSION_ID>"
```

### Test 3: End-to-End
```bash
# Full conversation test:
1. "show me hoodies"
2. Wait 5 seconds
3. Check facts API
4. "what's the material of the first one?"
5. Verify AI uses correct product from context
```

---

## Additional Issues to Investigate

### Issue 1: Intent Classification
The `product_question` intent (priority 75) should trigger for "tell me more about the second one", but it might be getting overridden by other intents.

**Check**:
```bash
# Look for intent classification in logs
grep "intent=" /tmp/ai_core.log | tail -20
```

### Issue 2: Product Indexing
When AI says "second one", how does it know which is second?
- Is it based on display order?
- Is it based on turn_introduced in facts?
- Is there an index field?

---

## Files Modified

1. [`data/prompts/agent_chat.txt`](file:///Users/ssg/Desktop/COVE/cove-ai-core/data/prompts/agent_chat.txt#L16-L19)
   - Removed hardcoded "CoreBasics Hoodie" example
   - Changed to generic "use ACTUAL product from context"

---

## Next Steps

1. ✅ **Fixed prompt** - Removed hardcoded examples
2. ⏳ **Verify server reloaded** - Check if uvicorn picked up changes
3. ⏳ **Debug fact extraction** - Why are no facts being stored?
4. ⏳ **Test with new session** - Verify fix works end-to-end
5. ⏳ **Add logging** - More visibility into which product AI is referencing

---

## Long-term Improvements

### 1. Explicit Product Indexing
Instead of relying on "second one", use explicit references:
```json
{
  "products_shown": [
    {"index": 1, "name": "LuxeLine Tee", "tier": "basic"},
    {"index": 2, "name": "LuxeLine Tee", "tier": "premium"}
  ]
}
```

### 2. Better Prompt Examples
Use placeholders instead of real product names:
```text
- User: "what about the second one?"
  → Answer: "The second [PRODUCT_TYPE] is the [PRODUCT_NAME]..."
```

### 3. Fact Extraction Monitoring
Add alerts when fact extraction fails:
```python
if not facts_stored:
    log.error("CRITICAL: Fact extraction failed for session {session_id}")
    # Send alert to monitoring system
```

---

## Status

- **Prompt Fix**: ✅ COMPLETE
- **Fact Extraction Debug**: ⏳ IN PROGRESS
- **End-to-End Testing**: ⏳ PENDING
- **Production Ready**: ❌ NOT YET

**Estimated Time to Full Fix**: 1-2 hours (depending on fact extraction issue)
