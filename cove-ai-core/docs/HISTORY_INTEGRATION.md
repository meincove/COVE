# History Logging Integration Guide

## Overview
This guide shows how to integrate conversation history logging into the agent.

## Quick Start

### 1. Import the history logger

```python
from app.history_logger import log_history_turn
```

### 2. Call it after generating a response

At the end of your `agent_query` function (or wherever you return `AgentOut`), add:

```python
# Before returning the response, log the conversation turn
await log_history_turn(
    user_message=body.message,
    assistant_message=result.answer,
    user_kind=debug_plan.get("intent_kind", "unknown"),
    assistant_kind=result.kind,
    guest_session_id=body.guestSessionId or "",
    clerk_user_id=body.clerkUserId or "",
    email=body.email or "",
    user_meta={
        "historyScope": body.historyScope,
        "intent_kind": debug_plan.get("intent_kind"),
        "filters": debug_plan.get("rec_filters"),
    },
    assistant_meta={
        "items": [item.dict() for item in result.items] if result.items else [],
        "cart_payload": result.cart_payload,
    },
)

return result
```

## Complete Example

Here's a minimal example of how to modify `agent_query`:

```python
from app.history_logger import log_history_turn

@router.post("/ai/agent/query")
async def agent_query(body: AgentIn) -> AgentOut:
    # ... existing agent logic ...
    
    # Build your response
    result = AgentOut(
        kind="answer",
        answer="Your response here",
        citations=[],
        items=[],
        cart_payload=None,
        debug_plan=debug_plan,
    )
    
    # Log the conversation turn (fire-and-forget, won't break on errors)
    try:
        await log_history_turn(
            user_message=body.message,
            assistant_message=result.answer,
            user_kind=debug_plan.get("intent_kind", "unknown"),
            assistant_kind=result.kind,
            guest_session_id=body.guestSessionId or "",
            clerk_user_id=body.clerkUserId or "",
            email=body.email or "",
            user_meta={
                "historyScope": body.historyScope,
                "intent_kind": debug_plan.get("intent_kind"),
            },
            assistant_meta={
                "items": [item.dict() for item in result.items] if result.items else [],
            },
        )
    except Exception as e:
        log.warning(f"Failed to log history: {e}")
    
    return result
```

## Configuration

Set these environment variables in your `.env`:

```bash
# Django backend URL
DJANGO_BASE_URL=http://127.0.0.1:8001

# Enable/disable history logging
HISTORY_LOG_ENABLED=true
```

## Testing

After integration, test with:

```bash
# 1. Send a message
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "guestSessionId": "test-123", "historyScope": "user"}'

# 2. Check history was saved
curl "http://127.0.0.1:8001/ai_profiles/history/?guestSessionId=test-123&limit=10" | jq
```

You should see both the user message and assistant response in the history.

## Error Handling

The history logger is designed to be **fire-and-forget**:
- Errors are logged but don't break the user flow
- If Django is down, the agent still works
- Timeout is set to 3 seconds to avoid blocking

## Next Steps

Once history logging is working:
1. The `_fetch_history_for_llm()` function will return actual history
2. Context-aware responses will work
3. "Summarize my preferences" queries will have data to work with
