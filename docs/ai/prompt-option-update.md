# Prompt Option Update - Interactive Question Options

## Goal
Replace plain text question examples with interactive clickable pills:
- **Budget**: 2 predefined ranges + "Other" → slider for custom min/max
- **Style**: 2 style options + "Other" → focuses text input for custom typing
- Options come from backend based on conversation flow config (no hardcoding)

---

## Backend Changes

### 1. Update `conversation_flows.json`
Add `input_type` to each step to specify the UI component:

```json
{
  "step": "budget",
  "question": "Perfect! What's your budget?",
  "input_type": "budget_range",
  "options": [
    {"label": "€0-100", "value": "100"},
    {"label": "€100-250", "value": "250"}
  ],
  "allow_custom": true,
  "required": true
}
```

### 2. Modify `_format_question()` in `conversation_flow.py`
Return structured data instead of just text:

```python
def _format_question(self, step: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "text": step.get("question", ""),
        "input_type": step.get("input_type", "text"),
        "options": step.get("options", []),
        "allow_custom": step.get("allow_custom", True)
    }
```

### 3. Update `agent_stream.py` 
When emitting conversation flow responses, include the structured options:

```python
# In the answer event, include question_options if present
yield f"event: answer\ndata: {json.dumps({
    'text': result.answer,
    'question_options': result.question_options  # New field
})}\n\n"
```

---

## Frontend Changes

### 1. Create `InteractiveQuestionOptions.tsx`
New component that renders based on `input_type`:

- **`budget_range`**: Pill buttons + "Other" that opens a slider modal
- **`style`**: Pill buttons + "Other" that focuses text input  
- **`occasion`**: Pill buttons + "Other" for custom input

### 2. Update `CoveChatWidget.tsx`
Detect `question_options` in message and render `InteractiveQuestionOptions` below the message text.

### 3. Slider Component for Budget
Create a simple dual-handle slider or use min/max inputs for "Other" budget selection.

---

## Files to Modify

| File | Change |
|------|--------|
| `conversation_flows.json` | Add `input_type`, `options`, `allow_custom` to steps |
| `conversation_flow.py` | Update `_format_question()` to return structured data |
| `agent_stream.py` | Pass question options through to frontend |
| `useAgentStream.ts` | Handle new `question_options` field in answer event |
| `CoveChatWidget.tsx` | Render `InteractiveQuestionOptions` when options present |
| `InteractiveQuestionOptions.tsx` | **NEW** - Interactive pills/slider component |

---

## Verification
1. Ask "Build me an outfit" → Should show occasion pills
2. Provide occasion → "Budget?" with clickable ranges + "Other"
3. Click "Other" → Slider appears, select range, auto-fills input
4. Provide budget → "Style?" with pills + "Other" 
5. Click "Other" → Text input focuses for custom typing
