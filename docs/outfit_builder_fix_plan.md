# Fix Outfit Builder - Implementation Plan

## Problem Identified

**Root Cause**: Conversation flow handler intercepts "build me an outfit" BEFORE outfit_builder intent is checked.

**Code Flow** (Current - BROKEN):
```
1. User: "build me an outfit"
2. Line 1575: conversation_handler.should_start_conversation(q) → Returns "outfit_builder" flow
3. Line 1581: Starts conversation → Asks "What's the occasion?"
4. Returns empty items array ❌
5. Line 1616: outfit_builder intent check NEVER REACHED
```

**Evidence**:
- Test response: `"answer": "Great! Let's build you the perfect outfit! 🎨\n\nWhat's the occasion?"`
- `"items": []`
- `"debug_plan": null`

---

## Solution

### Option 1: Reorder Intent Checks (RECOMMENDED)
Move outfit_builder intent check BEFORE conversation flow handler.

**New Flow**:
```
1. Check outfit_builder intent FIRST (line ~1616)
2. If outfit_builder with confidence > 0.6 → Execute orchestrator
3. ELSE check conversation flow
```

**Changes Required**:
- Move lines 1615-1700 (outfit_builder check) to BEFORE line 1574 (conversation flow check)
- This ensures direct outfit building takes precedence

### Option 2: Disable Conversation Flow for Outfit Builder
Modify conversation flow to NOT intercept outfit_builder requests.

**Changes Required**:
- Update `conversation_handler.should_start_conversation()` to exclude outfit_builder
- Less clean, keeps broken order

---

## Recommended Approach: Option 1

### File to Modify
`/Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py`

### Changes

**Current Order** (lines 1574-1700):
```python
# Line 1574: Conversation flow check
flow_name = conversation_handler.should_start_conversation(q)
if flow_name:
    # Starts conversation, asks questions
    ...

# Line 1615: Outfit builder check (NEVER REACHED)
if intent == "outfit_builder" and confidence > 0.6:
    # Build outfit directly
    ...
```

**New Order**:
```python
# FIRST: Check outfit_builder intent
if intent == "outfit_builder" and confidence > 0.6:
    # Build outfit directly with orchestrator
    ...
    
# THEN: Check conversation flow (as fallback)
flow_name = conversation_handler.should_start_conversation(q)
if flow_name:
    # Start conversation
    ...
```

---

## Implementation Steps

1. **Identify code blocks**:
   - Outfit builder: lines 1615-1700 (~85 lines)
   - Conversation flow: lines 1574-1590 (~16 lines)

2. **Move outfit builder block**:
   - Cut lines 1615-1700
   - Insert BEFORE line 1574

3. **Test**:
   - `curl -X POST http://localhost:8000/ai/agent/query -d '{"message": "build me an outfit", "guestSessionId": "test"}'`
   - Should return outfit items, not ask for occasion

---

## Expected Result

**Before** (Current):
```json
{
  "answer": "Great! Let's build you the perfect outfit! 🎨\n\nWhat's the occasion?",
  "items": []
}
```

**After** (Fixed):
```json
{
  "answer": "I've built a complete outfit for you! (€XXX total)",
  "items": [
    {"title": "Hoodie", ...},
    {"title": "Jeans", ...},
    {"title": "Sneakers", ...}
  ]
}
```

---

## Risk Assessment

**Risk**: LOW
- Simple code reordering
- No logic changes
- Both code blocks are independent

**Testing Required**:
- Outfit builder: "build me an outfit"
- Conversation flow: Other triggers still work
- Intent classification: Still routes correctly

---

## Alternative: Quick Fix

If reordering is risky, add explicit check in conversation flow:

```python
# Line 1575
flow_name = conversation_handler.should_start_conversation(q)
if flow_name and intent != "outfit_builder":  # ← Add this check
    # Start conversation
    ...
```

This prevents conversation flow from intercepting outfit_builder requests.
