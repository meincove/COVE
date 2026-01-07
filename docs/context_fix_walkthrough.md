# Context Awareness Fix - Walkthrough

## Goal
Fix the issue where the agent responds "I don't know" when asked about specific products shown in previous turns (e.g., "Tell me about the second one").

## Root Cause
The `items_shown` metadata is stored in the conversation history logs (specifically in the `assistant` message metadata), but the `_history_to_llm_messages` function ignored this data when constructing the prompt for the generic LLM chat. This meant the LLM literally didn't know what products had been shown.

## Changes
Modified `app/routes/agent.py`:
- Updated `_history_to_llm_messages` to check for `items` in the message metadata.
- Added logic to format these items into a numbered list (e.g., "1. [Title] (Color, Type)").
- Appended this list to the message content as a `[System Note]`.

```python
# app/routes/agent.py

# ... inside _history_to_llm_messages loop ...
        meta = row.get("meta") or {}
        items_shown = meta.get("items") or meta.get("items_shown")
        
        if items_shown and isinstance(items_shown, list):
            items_context = "\n\n[System Note: The following products were shown in this turn:]"
            for i, item in enumerate(items_shown):
                if isinstance(item, dict):
                    title = item.get("title", "Item")
                    color = item.get("color", "")
                    kind = item.get("type", "")
                    details = f"{color} {kind}".strip()
                    items_context += f"\n{i+1}. {title} ({details})"
            content += items_context
```

## Verification
Executed a multi-step test:

1. **Search**: `Show me hoodies` -> Agent returns a list of hoodies.
2. **Follow-up**: `Tell me about the second one`

**Result (Before)**:
> "I apologize, but I don't have details about the specific hoodies..."

**Result (After)**:
> "The second hoodie is the FlexFit Hoodie in black... The FlexFit material offers great flexibility..."

The agent now has full context of the products displayed to the user.
