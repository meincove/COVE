# LLM-Based Intent Classification - Implementation Plan

## Problem Statement

**Current System**: Hardcoded keyword matching (`intent_config.json`)
- ❌ Only works for exact phrases ("first one", "second one")
- ❌ Doesn't scale to natural language variations
- ❌ Maintenance nightmare (add keywords for every variation)
- ❌ No semantic understanding

**User's Valid Concern**: 
> "Users can ask ANYTHING. The LLM should understand the underlying meaning, not look for hardcoded paths."

**Goal**: Replace keyword matching with **semantic intent understanding** using LLM + few-shot learning.

---

## Proposed Architecture

### High-Level Flow
```
User Query
    ↓
LLM Intent Classifier (few-shot)
    ↓
Intent + Confidence + Reasoning
    ↓
Route to appropriate handler
    ↓
Response
```

### Intent Categories

**Core Intents**:
1. `product_discovery` - User wants to see new products
2. `product_question` - Asking about products already shown
3. `product_comparison` - Comparing multiple products
4. `cart_operation` - Add/remove/checkout
5. `general_question` - Brand info, policies, etc.
6. `chitchat` - Casual conversation

**No hardcoded keywords** - LLM understands from context!

---

## Implementation Details

### 1. Intent Classifier with Few-Shot Learning

**File**: `app/services/intent_classifier.py` (NEW)

```python
from typing import Dict, Any, Optional
from pydantic import BaseModel
import json

class IntentResult(BaseModel):
    intent: str
    confidence: float
    reasoning: str
    extracted_entities: Dict[str, Any] = {}

class LLMIntentClassifier:
    """
    Semantic intent classification using LLM + few-shot learning.
    No hardcoded keywords - pure understanding.
    """
    
    def __init__(self, llm_client):
        self.llm = llm_client
        self.few_shot_examples = self._load_examples()
    
    def _load_examples(self) -> str:
        """
        Few-shot examples teaching the LLM how to classify.
        These are EXAMPLES, not rules!
        """
        return """
# Intent Classification Examples

## Product Discovery (user wants to see NEW products)
- "show me hoodies" → product_discovery
- "I'm looking for tees" → product_discovery  
- "what bombers do you have?" → product_discovery
- "show me more options" → product_discovery
- "any black hoodies?" → product_discovery

## Product Question (asking about ALREADY SHOWN products)
- "what's the material of the first one?" → product_question
- "tell me more about that premium tee" → product_question
- "what about the one with relaxed fit?" → product_question
- "how much was that black hoodie you showed?" → product_question
- "the second item, what's it made of?" → product_question

## Product Comparison (comparing multiple products)
- "compare the first two" → product_comparison
- "what's the difference between them?" → product_comparison
- "which one is warmer?" → product_comparison
- "how do these hoodies differ?" → product_comparison

## Cart Operation (cart/checkout actions)
- "add the first one to cart" → cart_operation
- "add to cart" → cart_operation
- "remove from cart" → cart_operation
- "checkout" → cart_operation

## General Question (brand/policy questions)
- "what's your return policy?" → general_question
- "do you ship internationally?" → general_question
- "tell me about Cove" → general_question

## Chitchat (casual conversation)
- "hey" → chitchat
- "thanks!" → chitchat
- "that's cool" → chitchat
"""
    
    async def classify(
        self, 
        user_message: str,
        conversation_context: Optional[Dict[str, Any]] = None
    ) -> IntentResult:
        """
        Classify user intent using LLM semantic understanding.
        
        Args:
            user_message: What the user said
            conversation_context: Recent products shown, history, etc.
            
        Returns:
            IntentResult with intent, confidence, and reasoning
        """
        
        # Build context summary
        context_summary = self._build_context_summary(conversation_context)
        
        # LLM prompt for intent classification
        prompt = f"""
You are an intent classifier for a conversational AI shopping assistant.

Your job: Understand what the user WANTS, not just match keywords.

{self.few_shot_examples}

## Current Conversation Context
{context_summary}

## User's Message
"{user_message}"

## Your Task
Analyze the user's message and determine their intent.

Consider:
1. What is the user trying to accomplish?
2. Are they asking about products already shown? (check context)
3. Do they want to see new products?
4. Are they comparing products?
5. Do they want to take an action (cart, checkout)?

Return JSON:
{{
    "intent": "product_discovery|product_question|product_comparison|cart_operation|general_question|chitchat",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of why you chose this intent",
    "extracted_entities": {{
        "product_reference": "first|second|that premium one|etc",
        "product_type": "hoodie|tee|etc",
        "action": "add|remove|compare|etc"
    }}
}}

Think step by step, then return ONLY the JSON.
"""
        
        # Call LLM
        response = await self.llm.complete(prompt, temperature=0.1)
        
        # Parse JSON response
        try:
            result_dict = json.loads(response)
            return IntentResult(**result_dict)
        except Exception as e:
            # Fallback if LLM returns invalid JSON
            return IntentResult(
                intent="general_question",
                confidence=0.5,
                reasoning=f"Failed to parse LLM response: {e}"
            )
    
    def _build_context_summary(self, context: Optional[Dict[str, Any]]) -> str:
        """Build a concise summary of conversation context"""
        if not context:
            return "No products shown yet."
        
        products_shown = context.get("products_shown", [])
        if not products_shown:
            return "No products shown yet."
        
        summary = f"Products shown in this conversation:\n"
        for i, product in enumerate(products_shown[:5], 1):
            summary += f"{i}. {product.get('name')} ({product.get('tier')} tier)\n"
        
        return summary
```

---

### 2. Integration into Agent Flow

**File**: `app/routes/agent.py` (MODIFY)

```python
from app.services.intent_classifier import LLMIntentClassifier, IntentResult

# Replace keyword-based classification
async def _classify_intent(
    user_message: str,
    conversation_context: Dict[str, Any]
) -> IntentResult:
    """
    Classify user intent using LLM semantic understanding.
    NO MORE KEYWORDS!
    """
    classifier = LLMIntentClassifier(llm_client=get_llm_client())
    
    intent_result = await classifier.classify(
        user_message=user_message,
        conversation_context=conversation_context
    )
    
    log.info(
        f"Intent classified: {intent_result.intent} "
        f"(confidence: {intent_result.confidence:.2f}) "
        f"Reasoning: {intent_result.reasoning}"
    )
    
    return intent_result

# Use in agent_query
@router.post("/ai/agent/query")
async def agent_query(body: AgentIn) -> AgentOut:
    # Get conversation context (products shown, etc.)
    context = await get_conversation_context(body.guestSessionId)
    
    # Classify intent using LLM
    intent_result = await _classify_intent(body.message, context)
    
    # Route based on intent
    if intent_result.intent == "product_discovery":
        return await handle_product_discovery(body, intent_result)
    
    elif intent_result.intent == "product_question":
        return await handle_product_question(body, intent_result, context)
    
    elif intent_result.intent == "product_comparison":
        return await handle_comparison(body, intent_result, context)
    
    elif intent_result.intent == "cart_operation":
        return await handle_cart_operation(body, intent_result)
    
    else:
        return await handle_general_query(body, intent_result)
```

---

### 3. Remove Hardcoded Intent Config

**Files to DELETE**:
- ❌ `/Users/ssg/Desktop/COVE/data/intent_config.json`

**Files to MODIFY**:
- `app/routes/agent.py` - Remove all references to `intent_config.json`
- `app/core/config_loader.py` - Remove intent config loading
- Any other files that import intent config

---

### 4. Enhanced Context Retrieval

**File**: `app/services/context_manager.py` (NEW)

```python
async def get_conversation_context(session_id: str) -> Dict[str, Any]:
    """
    Get rich conversation context for intent classification.
    
    Returns:
        {
            "products_shown": [
                {"name": "COVE Hoodie", "tier": "casual", "turn": 1},
                {"name": "LuxeLine Tee", "tier": "premium", "turn": 2}
            ],
            "last_query": "show me tees",
            "cart_items": [...],
            "user_preferences": {...}
        }
    """
    # Get facts from database
    facts = await get_session_facts(session_id)
    
    # Extract products shown
    products_shown = []
    if facts and "product_focus" in facts:
        products = facts["product_focus"].get("current_products", [])
        products_shown = [
            {
                "name": p.get("name"),
                "tier": p.get("tier"),
                "turn": p.get("turn_introduced"),
                "details": p.get("full_details", {})
            }
            for p in products
        ]
    
    return {
        "products_shown": products_shown,
        "last_query": facts.get("active_context", {}).get("last_query"),
        "cart_items": [],  # TODO: Get from cart service
        "user_preferences": facts.get("user_preferences", {})
    }
```

---

## Testing Strategy

### Unit Tests

**File**: `tests/test_intent_classifier.py` (NEW)

```python
import pytest
from app.services.intent_classifier import LLMIntentClassifier

@pytest.mark.asyncio
async def test_product_discovery():
    """Test: 'show me hoodies' → product_discovery"""
    classifier = LLMIntentClassifier(mock_llm)
    result = await classifier.classify("show me hoodies")
    
    assert result.intent == "product_discovery"
    assert result.confidence > 0.8

@pytest.mark.asyncio
async def test_product_question_with_context():
    """Test: 'what's the material of the first one?' → product_question"""
    context = {
        "products_shown": [
            {"name": "COVE Hoodie", "tier": "casual"}
        ]
    }
    
    result = await classifier.classify(
        "what's the material of the first one?",
        conversation_context=context
    )
    
    assert result.intent == "product_question"
    assert result.extracted_entities.get("product_reference") == "first"

@pytest.mark.asyncio
async def test_natural_language_variation():
    """Test: Natural language variations work"""
    queries = [
        "tell me about that premium tee with relaxed fit",
        "what about the one you showed earlier?",
        "the second item, what's it made of?",
        "that black hoodie from before"
    ]
    
    for query in queries:
        result = await classifier.classify(query, context)
        assert result.intent == "product_question"
```

### Integration Tests

**File**: `tests/test_intent_integration.py` (NEW)

```python
@pytest.mark.asyncio
async def test_full_conversation_flow():
    """Test: Complete conversation with intent classification"""
    
    # Turn 1: Show products
    r1 = await agent_query(AgentIn(
        message="show me tees",
        guestSessionId="test_session"
    ))
    assert r1.items  # Products shown
    
    # Turn 2: Ask about second product
    r2 = await agent_query(AgentIn(
        message="what's the material of the second one?",
        guestSessionId="test_session"
    ))
    
    # Should answer about second tee, NOT show new products
    assert not r2.items or len(r2.items) == 0
    assert "material" in r2.answer.lower()
    # Should NOT mention wrong product
    assert "hoodie" not in r2.answer.lower()
```

---

## Migration Plan

### Phase 1: Build LLM Classifier (Day 1)
- [x] Create `intent_classifier.py`
- [ ] Write few-shot examples
- [ ] Implement `classify()` method
- [ ] Add unit tests

### Phase 2: Integrate into Agent (Day 1-2)
- [ ] Modify `agent.py` to use LLM classifier
- [ ] Create `context_manager.py`
- [ ] Update routing logic
- [ ] Add integration tests

### Phase 3: Remove Old System (Day 2)
- [ ] Delete `intent_config.json`
- [ ] Remove keyword matching code
- [ ] Clean up unused imports
- [ ] Update documentation

### Phase 4: Testing & Validation (Day 2-3)
- [ ] Test with real user queries
- [ ] Monitor intent classification accuracy
- [ ] Tune few-shot examples
- [ ] Performance testing

---

## Performance Considerations

### Latency
- **LLM call**: ~200-500ms (acceptable for intent classification)
- **Caching**: Cache common queries to reduce LLM calls
- **Parallel**: Run intent classification in parallel with other tasks

### Cost
- **GPT-4o-mini**: ~$0.0001 per classification (negligible)
- **Optimization**: Use smaller model for intent only

### Fallback
- If LLM fails: Default to `general_question` intent
- Log failures for monitoring

---

## Success Criteria

✅ **No more hardcoded keywords**
✅ **Handles natural language variations**
✅ **Understands context** (products shown, conversation history)
✅ **Accurate intent classification** (>90% accuracy)
✅ **Fast response** (<500ms for classification)
✅ **No "CoreBasics Hoodie" bullshit** when user asks about tees

---

## Example Scenarios

### Scenario 1: Natural Language Product Question
```
User: "show me tees"
AI: [Shows 2 LuxeLine Tees]

User: "what about that premium one with the relaxed fit?"
Intent: product_question ✅
Confidence: 0.92
Reasoning: "User is asking about a specific product already shown (premium tee)"
Entities: {product_reference: "premium one", attribute: "relaxed fit"}

AI: "The premium LuxeLine Tee has a relaxed fit and is made from..."
```

### Scenario 2: Comparison
```
User: "show me hoodies"
AI: [Shows 3 hoodies]

User: "which one is warmer?"
Intent: product_comparison ✅
Confidence: 0.95
Reasoning: "User wants to compare warmth of shown products"

AI: "Comparing the warmth: The CoreBasics Hoodie (359 GSM)..."
```

### Scenario 3: Edge Case
```
User: "that black thing from earlier, how much?"
Intent: product_question ✅
Confidence: 0.88
Reasoning: "User referencing a previously shown product by color"
Entities: {product_reference: "that black thing", attribute: "price"}

AI: "The black COVE Hoodie is €45..."
```

---

## Next Steps

1. **Review this plan** - Does this approach make sense?
2. **Implement LLM classifier** - Start with `intent_classifier.py`
3. **Test thoroughly** - Ensure it works better than keywords
4. **Deploy** - Replace old system
5. **Monitor** - Track accuracy and tune examples

**Estimated Time**: 2-3 days for complete implementation and testing

**Risk**: Low - Can run in parallel with old system, switch when ready
