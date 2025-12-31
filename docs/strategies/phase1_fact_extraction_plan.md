# Implementation Plan: Phase 1 - Fact Extraction Layer

## Goal
Prevent context degradation in long conversations by extracting and persisting structured facts that survive message truncation.

---

## Problem Statement
Currently, when conversations exceed 15-20 turns:
- Only 8 messages sent to LLM
- Older messages get summarized (lossy compression)
- Important details like "user prefers size M" or "budget is €100" get lost

**Solution**: Extract facts after each turn and always include them in context, regardless of message count.

---

## Proposed Changes

### 1. Create Fact Extractor Service
**File**: `cove-ai-core/app/services/fact_extractor.py` (NEW)

**Purpose**: Extract structured facts from conversation turns

**Key Functions**:
```python
async def extract_facts(
    user_message: str,
    assistant_response: str,
    existing_facts: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Extract and merge facts from a conversation turn.
    Returns updated facts dictionary.
    """
```

**Fact Schema**:
```python
{
  # NEW: Product Focus Layer (most important for shopping)
  "product_focus": {
    "current_products": [
      {
        "product_id": "prod_123",
        "variant_id": "var_456",
        "name": "Nike Tech Fleece Hoodie",
        "full_details": {
          "price": 89.99,
          "material": "80% cotton, 20% polyester",
          "sizes_available": ["S", "M", "L", "XL"],
          "color": "Black",
          "brand": "Nike",
          "in_stock": true,
          # ... complete product data
        },
        "user_interest_level": "high",
        "questions_asked": ["What's the material?", "Does it run small?"],
        "turn_introduced": 5,
        "last_mentioned": 8
      }
    ],
    "product_history": [
      {"product_id": "prod_789", "name": "Adidas Bomber", "turns": [1, 2, 3]}
    ],
    "last_search_results": ["prod_123", "prod_456", "prod_789"]
  },
  
  # User preferences
  "user_preferences": {
    "size_top": "M",
    "size_bottom": "32",
    "style": ["minimalist", "streetwear"],
    "colors_liked": ["black", "navy"],
    "colors_disliked": ["bright pink"]
  },
  "active_context": {
    "current_feature": "product_search",
    "search_filters": {
      "type": "hoodie",
      "brand": "nike",
      "price_max": 100
    },
    "last_query": "Show me Nike hoodies under €100"
  },
  "entities_discussed": [
    {"type": "product", "name": "Nike hoodie", "turn": 5},
    {"type": "product", "name": "bomber jacket", "turn": 12}
  ],
  "decisions_made": [
    {"decision": "User wants minimalist style", "turn": 3, "confidence": "high"}
  ]
}
```

---

### 2. Integrate into Agent Pipeline
**File**: `cove-ai-core/app/routes/agent.py` (MODIFY)

**Changes**:
1. After generating response, call fact extractor
2. Update `ChatSession.metadata['conversation_facts']`
3. Include facts in context sent to LLM

**Specific Modifications**:
- In `agent_chat` endpoint (around line 2500-2600):
  ```python
  # After response generation
  facts = await extract_facts(
      user_message=body.message,
      assistant_response=response_text,
      existing_facts=session.metadata.get('conversation_facts', {})
  )
  
  # Update session
  session.metadata['conversation_facts'] = facts
  session.save()
  ```

- In `_history_to_llm_messages` (around line 726):
  ```python
  # Add facts to system message
  if facts := session.metadata.get('conversation_facts'):
      system_msg += f"\n\nKnown facts about this conversation:\n{json.dumps(facts, indent=2)}"
  ```

---

### 3. Update Database Schema
**File**: `backend/ai_profiles/models.py` (VERIFY)

**Check**: Ensure `ChatSession.metadata` is JSONField (already exists)

**No changes needed** - existing `metadata` field can store facts.

---

### 4. Configuration
**File**: `cove-ai-core/data/fact_extraction_config.json` (NEW)

**Purpose**: Control what facts to extract and how

```json
{
  "enabled": true,
  "extract_preferences": true,
  "extract_filters": true,
  "extract_entities": true,
  "max_entities": 20,
  "fact_ttl_turns": 50,
  "llm_model": "openrouter/openai/gpt-4o-mini",
  "temperature": 0.1
}
```

---

## Verification Plan

### Automated Tests

#### Test 1: Fact Extraction Unit Test
**File**: `cove-ai-core/tests/test_fact_extractor.py` (NEW)

**Command**: `pytest tests/test_fact_extractor.py -v`

**What it tests**:
- Extract size preferences from user message
- Merge new facts with existing facts
- Handle conflicting facts (update vs keep)
- Extract search filters correctly

#### Test 2: Integration Test
**File**: `cove-ai-core/tests/test_agent_with_facts.py` (NEW)

**Command**: `pytest tests/test_agent_with_facts.py -v`

**What it tests**:
- Multi-turn conversation (30 turns)
- Facts persist across turns
- Facts included in LLM context
- Old messages truncated but facts remain

**Existing Test to Verify**:
- Run `pytest tests/test_agent.py -v` to ensure no regressions

---

### Manual Testing

#### Scenario 1: Long Conversation Memory
**Steps**:
1. Start fresh chat session
2. **Turn 1**: "I prefer size M and minimalist style"
3. **Turn 2-20**: Ask various product questions (hoodies, jackets, etc.)
4. **Turn 25**: "Show me something in my size and style"

**Expected**: AI should remember size M and minimalist from turn 1

**How to verify**:
- Check `ChatSession.metadata['conversation_facts']` in database
- AI response should mention "size M" and "minimalist"

#### Scenario 2: Filter Persistence
**Steps**:
1. **Turn 1**: "Show me Nike hoodies under €100"
2. **Turn 2-15**: Refine search, ask questions
3. **Turn 20**: "show me more"

**Expected**: AI should remember Nike + hoodie + €100 filter

**How to verify**:
- Facts should contain `{"brand": "nike", "type": "hoodie", "price_max": 100}`
- "show me more" should return Nike hoodies under €100

---

## Rollout Strategy

### Phase 1A: Build & Test (Week 1, Days 1-3)
1. Implement `fact_extractor.py`
2. Write unit tests
3. Test locally with mock conversations

### Phase 1B: Integration (Week 1, Days 4-5)
1. Integrate into `agent.py`
2. Run integration tests
3. Manual testing with real conversations

### Phase 1C: Monitor (Week 1, Days 6-7)
1. Deploy to staging
2. Monitor fact extraction quality
3. Tune extraction prompts if needed

---

## Success Metrics
- **Fact Extraction Rate**: > 90% of turns extract at least 1 fact
- **Fact Accuracy**: Manual review of 50 conversations → > 85% accurate facts
- **Context Retention**: 30-turn conversations retain turn 1 context
- **No Regressions**: All existing tests pass

---

## Risks & Mitigations

**Risk 1**: LLM extraction is slow (adds latency)
- **Mitigation**: Run extraction async, don't block response
- **Mitigation**: Cache facts, only re-extract if conversation changed significantly

**Risk 2**: Extracted facts are wrong
- **Mitigation**: Low temperature (0.1) for deterministic extraction
- **Mitigation**: User can clear facts via "forget everything" command

**Risk 3**: Facts grow too large (token bloat)
- **Mitigation**: Limit to 50 most recent facts
- **Mitigation**: Prune old/irrelevant facts after N turns
