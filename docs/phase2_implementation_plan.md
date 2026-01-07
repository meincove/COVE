# Phase 2: Expand Context Window - Implementation Plan

## Overview

Increase the conversation context window to allow the AI to remember more conversation history and provide better context-aware responses across longer conversations.

---

## Current State

**Phase 1 Complete**:
- ✅ Fact extraction and storage working
- ✅ Facts injected into LLM context
- ✅ AI uses facts in responses
- ✅ 75% success rate on comprehensive tests

**Current Limitations**:
- `MAX_HISTORY_MESSAGES = 8` (only last 8 turns remembered)
- `HISTORY_SUMMARY_THRESHOLD = 16` (summarizes after 16 messages)
- Limited context for long conversations
- AI may "forget" earlier discussion points

---

## Proposed Changes

### Configuration Updates

#### 1. Increase MAX_HISTORY_MESSAGES
**Current**: `8 messages`  
**New**: `15 messages`  
**Rationale**: 
- Allows AI to see ~7-8 conversation turns (user + assistant pairs)
- Better context for multi-turn product discussions
- Handles outfit building conversations better
- Still manageable token count (~3000-4000 tokens)

#### 2. Increase HISTORY_SUMMARY_THRESHOLD
**Current**: `16 messages`  
**New**: `30 messages`  
**Rationale**:
- Delays summarization for longer conversations
- Preserves more detail in recent history
- Summary kicks in after ~15 turns instead of 8
- Better for complex shopping sessions

---

## Files to Modify

### `cove-ai-core/app/routes/agent.py`

**Current**:
```python
MAX_HISTORY_MESSAGES = 8
HISTORY_SUMMARY_THRESHOLD = 16
```

**New**:
```python
MAX_HISTORY_MESSAGES = 15
HISTORY_SUMMARY_THRESHOLD = 30
```

**Location**: Near top of file (constants section)

---

## Expected Benefits

### 1. Better Context Retention
- AI remembers products discussed 10+ turns ago
- Can reference earlier preferences
- Handles "go back to X" requests better

### 2. Improved Conversation Flow
- More natural multi-turn conversations
- Better handling of complex queries
- Reduced need for user to repeat information

### 3. Enhanced Outfit Building
- Remembers all pieces discussed
- Can suggest complementary items from earlier
- Better budget tracking across turns

### 4. Stronger Personalization
- More data points for preferences
- Better understanding of user style
- Can reference specific products by name

---

## Testing Strategy

### Test 1: 10-Turn Conversation
**Scenario**: Product browsing with context switches
```
1. Show me hoodies
2. What colors are available?
3. Show me bombers instead
4. Go back to the hoodies
5. What was the price of the first one?
6. Show me tees
7. Can you build an outfit with the hoodie?
8. What was that bomber you showed earlier?
9. Compare the hoodie and bomber
10. Which would you recommend?
```

**Expected**: AI remembers all products and can reference them

### Test 2: 20-Turn Conversation
**Scenario**: Extended shopping session
- Mix of product queries, preferences, outfit building
- Test summary generation (should kick in after turn 15)
- Verify AI still has context from early turns

**Expected**: 
- Turns 1-15: Full history available
- Turns 16+: Summary + recent history
- AI maintains continuity throughout

### Test 3: Performance Check
**Metrics**:
- Response time (should be < 3s)
- Token usage (should be < 8000 tokens)
- Memory usage (monitor for leaks)

---

## Verification Plan

### Automated Tests
1. **Multi-turn test suite**
   - 10-turn conversation test
   - 20-turn conversation test
   - Context retention verification

2. **Performance tests**
   - Response time benchmarks
   - Token count monitoring
   - Memory usage tracking

### Manual Testing
1. **Real conversation flows**
   - Browse multiple product types
   - Build outfits
   - Make decisions
   - Reference earlier items

2. **Edge cases**
   - Very long conversations (30+ turns)
   - Rapid context switches
   - Complex multi-product queries

---

## Rollback Plan

If issues arise:
1. Revert to `MAX_HISTORY_MESSAGES = 8`
2. Revert to `HISTORY_SUMMARY_THRESHOLD = 16`
3. Investigate specific failure cases
4. Adjust incrementally (e.g., try 12 messages first)

---

## Success Criteria

- ✅ 10-turn conversations maintain full context
- ✅ 20-turn conversations work with summary
- ✅ Response time < 3 seconds
- ✅ AI references products from 10+ turns ago
- ✅ No performance degradation
- ✅ Token usage stays under limits

---

## Timeline

1. **Configuration Change**: 5 minutes
2. **Testing**: 30 minutes
3. **Verification**: 15 minutes
4. **Documentation**: 10 minutes

**Total**: ~1 hour

---

## Next Steps After Phase 2

**Phase 3: Semantic Retrieval**
- Embed conversation messages
- Search for relevant old context
- Include in LLM prompts
- Handle very long conversations (50+ turns)
