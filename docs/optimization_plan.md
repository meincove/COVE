# Context Management Optimization Plan

## Issues Identified

### Issue 1: Outfit Builder Mode Interference
**Problem**: Turns 7-10 triggered outfit builder mode, which changed the conversation flow and prevented proper context retention testing.

**Evidence**:
- Turn 7: "Can you build an outfit..." → Outfit builder activated
- Turn 8: "What about that bomber..." → Still in outfit builder
- Turn 10: "Which black hoodie..." → Still in outfit builder

**Impact**: AI responded with outfit builder prompts instead of referencing earlier products.

### Issue 2: Fact Extraction Quality
**Problem**: From Phase 1 comprehensive test, we saw 0 products in `current_products` despite showing items.

**Evidence**:
- Items shown: 6 hoodies
- Facts stored: 0 current products
- Preferences tracked: ✅ Working
- Active context: ✅ Working

**Impact**: Even with expanded context window, if facts aren't capturing products, AI can't reference them.

### Issue 3: Context Injection Timing
**Problem**: Facts are extracted in background AFTER response is sent, so they're not available for the NEXT turn.

**Flow**:
```
Turn 1: Show hoodies
  → AI responds
  → Facts extracted (background)
  → Facts stored

Turn 2: What color?
  → Facts retrieved (from turn 1)
  → AI responds with context ✅
```

**This is actually correct!** But we need to verify facts are being used.

---

## Root Cause Analysis

### Why 10-Turn Test Failed

1. **Outfit Builder Triggered**: Queries like "build an outfit" activate a different mode
2. **Mode Doesn't Use Full Context**: Outfit builder has its own flow
3. **Test Design Issue**: Need queries that stay in product browsing mode

### Why 20-Turn Test Passed

1. **Simple Product Queries**: "Show me X" stayed in product mode
2. **No Mode Switches**: Consistent conversation flow
3. **Facts + History Working**: AI could reference turn 1

---

## Optimization Strategy

### 1. Improve Fact Extraction (HIGH PRIORITY)
**Goal**: Ensure products are actually captured in facts

**Actions**:
- ✅ Verify fact extractor is receiving product data
- ✅ Check LLM extraction prompt quality
- ✅ Test with explicit product metadata
- ✅ Add logging to track extraction success

**Expected Impact**: Products will be in facts, AI can reference them

### 2. Better Test Design (MEDIUM PRIORITY)
**Goal**: Test realistic conversation flows without mode switches

**Actions**:
- Create test with only product browsing queries
- Avoid outfit builder triggers
- Test "go back to X" and "compare X and Y" patterns
- Use real shopping scenarios

**Expected Impact**: More accurate context retention metrics

### 3. Enhance Context Formatting (MEDIUM PRIORITY)
**Goal**: Make facts more useful for LLM

**Actions**:
- Format product lists clearly
- Highlight key details (price, color, tier)
- Add turn numbers for reference
- Make it easy for LLM to find info

**Expected Impact**: AI uses facts more effectively

### 4. Add Fact Verification (LOW PRIORITY)
**Goal**: Confirm facts are being injected and used

**Actions**:
- Log when facts are injected
- Track LLM responses that use facts
- Measure fact utilization rate
- Add metrics to tests

**Expected Impact**: Better visibility into system performance

---

## Immediate Actions

### Action 1: Verify Fact Extraction is Working
**Test**: Send a simple query and check facts in database

```bash
curl -X POST http://localhost:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "show me hoodies", "guestSessionId": "fact_check"}'

# Wait 3 seconds for background extraction
sleep 3

# Check facts
curl http://localhost:8001/ai_profiles/session/facts/get/?guest_session_id=fact_check
```

**Expected**: Should see 6 products in `current_products`

### Action 2: Test Context Retention with Better Queries
**Create new test** with queries that:
- Stay in product browsing mode
- Don't trigger outfit builder
- Test "go back" and "compare" patterns
- Use realistic shopping flow

### Action 3: Improve Fact Extractor Prompt
**Review and enhance** the LLM prompt for fact extraction:
- Make it clearer what to extract
- Emphasize product details
- Add examples
- Test with different product types

---

## Success Criteria (Revised)

### Must Have
- ✅ Products captured in facts (> 90% of shown items)
- ✅ 10-turn test: > 70% context retention
- ✅ 20-turn test: > 80% context retention
- ✅ No performance degradation

### Nice to Have
- Facts used in > 60% of responses
- AI references specific products by name
- "Go back to X" works 100% of time
- Compare queries work correctly

---

## Implementation Priority

1. **CRITICAL**: Verify fact extraction captures products
2. **HIGH**: Create better 10-turn test (no outfit builder)
3. **MEDIUM**: Enhance fact extractor prompt if needed
4. **MEDIUM**: Improve context formatting
5. **LOW**: Add fact utilization metrics

---

## Next Steps

1. Run fact verification test
2. Analyze results
3. Fix fact extraction if needed
4. Create optimized 10-turn test
5. Re-test and measure improvement
