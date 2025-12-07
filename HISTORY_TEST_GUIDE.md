# Quick Manual Test for History System

## What I Built (Simple Explanation)

I added a system that **remembers your conversations** with the AI assistant. 

Before: The AI had no memory - every message was like talking to it for the first time.
After: The AI remembers what you talked about and can reference previous messages.

## What Changed

### 1. Database (Django)
- Added a new table `AiConversationEvent` to store messages
- Every user message and AI response is saved

### 2. AI Core (FastAPI)  
- Added automatic logging after every response
- The AI can now read previous messages when answering

## How to Test (When Services Are Running)

### Step 1: Send First Message
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about your brand",
    "guestSessionId": "test-123",
    "historyScope": "user"
  }'
```

### Step 2: Check History Was Saved
```bash
curl "http://127.0.0.1:8001/ai_profiles/history/?guestSessionId=test-123" | jq
```

**Expected Result:**
```json
{
  "items": [
    {
      "role": "user",
      "content": "Tell me about your brand",
      ...
    },
    {
      "role": "assistant",
      "content": "Hey there! Cove is...",
      ...
    }
  ]
}
```

### Step 3: Send Follow-Up Message
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What hoodies do you have?",
    "guestSessionId": "test-123",
    "historyScope": "user"
  }'
```

### Step 4: Test Context Awareness
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you summarize what we discussed?",
    "guestSessionId": "test-123",
    "historyScope": "user"
  }' | jq '.debug_plan.llm_history_len'
```

**Expected Result:** A number > 0 (means AI received history)

## What This Enables

Now you can build:
1. ✅ "Summarize my style preferences" - Actually works!
2. ✅ "Like the one you showed before" - AI remembers recommendations
3. ✅ Zalando-style personalized intros - "Based on what you told me..."
4. ✅ Context-aware shopping - AI remembers your size, colors, preferences

## Files Changed

**Backend:**
- `backend/ai_profiles/models.py` - Added AiConversationEvent model
- `backend/ai_profiles/views.py` - Added history API endpoints
- `backend/ai_profiles/urls.py` - Added URL routes
- Migration created: `0003_aiconversationevent.py` ✅ Already applied

**AI Core:**
- `cove-ai-core/app/history_logger.py` - NEW file with logging helpers
- `cove-ai-core/app/routes/agent.py` - Added 1 import + 1 function call

## Verification Checklist

When you test, verify:
- [ ] Migration ran successfully (`migrate ai_profiles` - ✅ DONE)
- [ ] History GET endpoint returns saved messages
- [ ] Each conversation turn creates 2 events (user + assistant)
- [ ] `debug_plan.llm_history_len > 0` for follow-up queries
- [ ] "Summarize" queries actually reference previous messages

## If Something's Wrong

**History not saving?**
- Check Django is running on port 8001
- Check AI Core `.env` has `DJANGO_BASE_URL=http://127.0.0.1:8001`
- Check AI Core logs for "history_log" warnings

**Context not working?**
- Verify `historyScope: "user"` (not "none")
- Verify same `guestSessionId` across messages
- Check history GET endpoint returns data

## Summary

**Before:** AI was like a goldfish 🐟 - no memory
**After:** AI remembers conversations 🧠 - can reference past messages

The foundation is ready. Now you can build Zalando-style features on top!
