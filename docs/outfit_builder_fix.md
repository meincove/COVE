# Outfit Builder Stress Test Fix

## Problem Analysis

**All 6 stress tests failed with 0 items returned.**

### Root Cause

The API uses a **multi-turn conversation handler** that:
1. Detects "build outfit" trigger
2. Asks: "What's the occasion?"
3. Waits for user reply
4. Asks: "What's your budget?"
5. Waits for user reply
6. **ONLY THEN** triggers the orchestrator

**But our tests send everything in ONE message:**
```
"Build me an outfit for casual hangout, budget 100, style streetwear"
```

The conversation handler starts asking questions instead of directly building the outfit!

---

## The Fix

**Location:** `/Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py`  
**Line:** ~1306-1317

**Replace the START conversation block with smart detection:**

### Current Code (Lines 1306-1317):
```python
    # Check if should START a conversation
    flow_name = conversation_handler.should_start_conversation(q)
    if flow_name:
        log.info(f"🎯 Starting conversation flow: {flow_name}")
        
        first_question = conversation_handler.start_conversation(session_key, flow_name)
        
        return AgentOut(
            kind="answer",
            answer=first_question,
            items=[]
        )
```

### New Code (SMART DETECTION):
```python
    # Check if should START a conversation
    flow_name = conversation_handler.should_start_conversation(q)
    if flow_name:
        log.info(f"🎯 Detected trigger for flow: {flow_name}")
        
        # ✨ SMART DETECTION: Check if message contains ALL required info
        # Extract occasion, budget, style from message
        import re
        q_lower = q.lower()
        
        # Extract occasion
        occasion = None
        occasion_keywords = [
            "meeting", "date", "wedding", "party", "casual", "formal", 
            "interview", "dinner", "lunch", "hangout", "gym", "workout", 
            "weekend", "work", "office", "night", "business"
        ]
        for keyword in occasion_keywords:
            if keyword in q_lower:
                occasion = keyword
                break
        
        # Extract budget
        budget = None
        budget_match = re.search(r'budget\s*[:\s]*[$€£]?\s*(\d+)', q_lower)
        if budget_match:
            budget = float(budget_match.group(1))
        else:
            # Try standalone numbers
            currency_match = re.search(r'[$€£]\s*(\d+)', q)
            if currency_match:
                budget = float(currency_match.group(1))
        
        # Extract style
        style = None
        style_keywords = [
            "streetwear", "professional", "casual", "formal", "smart", 
            "minimalist", "luxe", "basic", "athletic", "edgy"
        ]
        for keyword in style_keywords:
            if keyword in q_lower:
                style = keyword
                break
        
        # If we have occasion AND budget, skip conversation and trigger orchestrator!
        if occasion and budget:
            log.info(f"✅ Complete info detected - skipping conversation!")
            log.info(f"   Occasion: {occasion}, Budget: €{budget}, Style: {style or 'any'}")
            
            # Import orchestrator
            from app.agents import orchestrator
            
            # Build context
            orchestrator_context = {
                "budget_max": budget,
                "occasion": occasion,
                "style": style or "casual",
                "user_id": body.clerkUserId or body.guestSessionId,
                "user_size_history": {}
            }
            
            # Build query
            query_parts = [f"build an outfit for {occasion}"]
            if style:
                query_parts.append(f"style {style}")
            orchestrator_query = ", ".join(query_parts)
            
            # Show thinking
            emit_event('thinking:step', {
                'icon': '🎨',
                'status': 'Building your complete outfit'
            })
            thinking_tracker.add_thinking("orchestrator", "Executing multi-agent workflow...")
            
            try:
                orchestrator_result = await orchestrator.execute_workflow(
                    workflow_name="outfit_builder",
                    query=orchestrator_query,
                    context=orchestrator_context
                )
                
                # Format as AgentOut
                outfit_items = orchestrator_result.get("outfit_items", [])
                
                if not outfit_items:
                    return Ag entOut(
                        kind="answer",
                        answer=orchestrator_result.get("reasoning", "I couldn't find items for this outfit."),
                        items=[],
                        reasoning=orchestrator_result.get("reasoning", "")
                    )
                
                # Convert to AgentItem format
                agent_items = []
                for item in outfit_items:
                    product = item.get("product", {})
                    agent_items.append(AgentItem(
                        slug=product.get("slug", ""),
                        title=product.get("title", "Unknown"),
                        url=product.get("url", f"/product/{product.get('slug', '')}"),
                        price=product.get("price"),
                        score=0.9,
                        reason="Selected for your outfit",
                        type=product.get("type")
                    ))
                
                return AgentOut(
                    kind="recommendations",
                    answer=orchestrator_result.get("reasoning", "Here's your complete outfit!"),
                    items=agent_items,
                    reasoning=orchestrator_result.get("reasoning", "")
                )
                
            except Exception as e:
                log.error(f"Orchestrator failed: {e}")
                return AgentOut(
                    kind="answer",
                    answer="Sorry, I couldn't build your outfit right now. Please try again!",
                    items=[]
                )
        
        # Missing info - start conversation
        log.info(f"⏭️ Missing info - starting conversation (occasion={occasion}, budget={budget})")
        first_question = conversation_handler.start_conversation(session_key, flow_name)
        
        return AgentOut(
            kind="answer",
            answer=first_question,
            items=[]
        )
```

---

## How It Works

1. **Detect trigger:** "build outfit" → matches workflow
2. **Smart extraction:**
   - Parse message for occasion keywords ("meeting", "casual", etc.)
   - Parse for budget (regex finds numbers after "budget" or currency symbols)
   - Parse for style keywords ("streetwear", "professional", etc.)
3. **Decision:**
   - **If occasion + budget found:** Skip conversation, directly call orchestrator ✅
   - **If missing info:** Start multi-turn conversation as before

---

## Test After Fix

Run the stress tests again:
```bash
cd /Users/ssg/Desktop/COVE/cove-ai-core
python3 tests/test_outfit_builder_stress.py
```

**Expected results:**
- ✅ Tests should now pass (at least some)
- ✅ Items will be returned
- ✅ Budget filtering will work

---

## Manual Test

```bash
curl -s -X POST http://localhost:8000/ai/agent/query-stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Build me an outfit for casual hangout, budget 100, style streetwear"}' \
  | grep -A5 "event: items"
```

**Expected:** You should see items being streamed!

---

## Benefits

1. **Better UX:** Users who provide all info get instant results
2. **Backward compatible:** Multi-turn conversation still works for incomplete requests
3. **Test-friendly:** Automated tests can send complete requests
4. **Flexible:** Supports natural language variations

---

## Alternative: Quick Hack for Tests Only

If you don't want to modify the agent code, you can create a **direct orchestrator endpoint** just for testing:

**File:** `/Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py`

Add this endpoint:
```python
@router.post("/outfit-builder-direct")
async def outfit_builder_direct(
    occasion: str,
    budget: float,
    style: str = "casual",
    clerkUserId: Optional[str] = None
):
    """Direct outfit builder endpoint (bypasses conversation) - FOR TESTING"""
    from app.agents import orchestrator
    
    result = await orchestrator.execute_workflow(
        workflow_name="outfit_builder",
        query=f"build outfit for {occasion}, style {style}",
        context={
            "budget_max": budget,
            "occasion": occasion,
            "style": style,
            "user_id": clerkUserId or "test_user"
        }
    )
    
    return result
```

Then tests call `/ai/agent/outfit-builder-direct` instead.

---

**Recommended:** Use the smart detection fix - it's better for production!
