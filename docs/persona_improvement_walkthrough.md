# Agent Persona Enhancement - Walkthrough

## Goal
Improve the "Hello" / generic query response to sound less robotic and more like a premium fashion stylist.

## Changes
Updated the `smalltalk` system prompt in `app/routes/agent.py` to prioritize warmth and helpfulness over listing services.

### Before
> "Hi there! Let me know how I can help you with Cove products, sizes, or outfit ideas today."

### After
> "Hello! It’s great to see you here. If you need help styling or finding the perfect piece, just let me know!"

## Verification
Executed a test query:
```bash
curl -X POST "http://127.0.0.1:8000/ai/agent/query" -d '{"message": "Hello"}'
```

**Result:**
The agent now responds with the updated, more natural greeting.
