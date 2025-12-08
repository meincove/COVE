# Suggested Queries Implementation Plan

Add context-aware suggested follow-up queries (similar to ChatGPT or Zalando) that guide users through the conversation flow.

## Features Overview

**Smart Quick Replies**: Display clickable query suggestions below AI messages based on:
- Current conversation context (showing products, cart proposal, etc.)
- User profile data (size preferences, order history)
- Intent type (recommendations, search, checkout)

**Examples:**
- After product recommendations → "Add first item", "Show more", "What size?", "Show similar"
- After cart proposal → "Yes, add it", "Different size", "Different color"
- After greeting → "Show me hoodies", "What's new?", "My orders"

---

## Proposed Changes

### Backend (cove-ai-core)

#### [NEW] `app/core/suggested_actions.py`
**Purpose**: Generate context-aware suggested queries

```python
from typing import List, Optional
from app.cove_ai_tools.types import SuggestedAction, AgentIntent

class SuggestedActionsEngine:
    """Generate contextual suggested queries based on conversation state"""
    
    @staticmethod
    def generate(
        intent: str,
        items: Optional[List] = None,
        user_has_size: bool = False,
        user_has_orders: bool = False,
        cart_payload: Optional[dict] = None
    ) -> List[SuggestedAction]:
        """Generate suggested actions based on context"""
        
        if intent == "recommendations":
            return _recommendations_suggestions(items, user_has_size)
        elif intent == "cart_proposal":
            return _cart_proposal_suggestions(cart_payload)
        elif intent == "greeting":
            return _greeting_suggestions(user_has_orders)
        elif intent == "checkout_ready":
            return _checkout_suggestions()
        else:
            return _default_suggestions()

def _recommendations_suggestions(items, user_has_size):
    suggestions = []
    
    if items and len(items) > 0:
        first_item = items[0]
        suggestions.append({
            "text": f"Add {first_item.get('title', 'this item')} to cart",
            "query": f"add {first_item.get('variantId')} to cart",
            "type": "action"
        })
    
    if not user_has_size:
        suggestions.append({
            "text": "What size should I get?",
            "query": "what size should i get for this",
            "type": "question"
        })
    
    suggestions.extend([
        {
            "text": "Show more options",
            "query": "show me more similar items",
            "type": "navigation"
        },
        {
            "text": "Tell me about the quality",
            "query": "tell me about the quality and materials",
            "type": "question"
        }
    ])
    
    return suggestions[:4]  # Max 4 suggestions

def _cart_proposal_suggestions(cart_payload):
    return [
        {
            "text": "✓ Yes, add it",
            "query": "yes add to cart",
            "type": "action"
        },
        {
            "text": "Show different size",
            "query": "show me this in a different size",
            "type": "navigation"
        },
        {
            "text": "Similar items?",
            "query": "show similar items",
            "type": "navigation"
        }
    ]

def _greeting_suggestions(user_has_orders):
    suggestions = [
        {
            "text": "🔥 What's trending?",
            "query": "show me what's trending",
            "type": "discovery"
        },
        {
            "text": "👕 Show me hoodies",
            "query": "show me some hoodies",
            "type": "search"
        }
    ]
    
    if user_has_orders:
        suggestions.append({
            "text": "📦 My orders",
            "query": "show my order history",
            "type": "account"
        })
    else:
        suggestions.append({
            "text": "✨ Surprise me",
            "query": "recommend something for me",
            "type": "discovery"
        })
    
    return suggestions

def _checkout_suggestions():
    return [
        {
            "text": "🛒 Review my cart first",
            "query": "show my cart",
            "type": "navigation"
        },
        {
            "text": "Keep shopping",
            "query": "show me more items",
            "type": "navigation"
        }
    ]

def _default_suggestions():
    return [
        {
            "text": "Start over",
            "query": "show me something else",
            "type": "navigation"
        },
        {
            "text": "Help",
            "query": "what can you help me with",
            "type": "question"
        }
    ]
```

#### [MODIFY] `app/cove_ai_tools/types.py`
Add `SuggestedAction` type:

```python
class SuggestedAction(TypedDict):
    text: str  # Display text for the button
    query: str  # Actual query to send when clicked
    type: str  # "action", "question", "navigation", "discovery", "account"
```

#### [MODIFY] `app/routes/agent.py` & `app/routes/agent_stream.py`
Add suggested actions to response:

```python
from app.core.suggested_actions import SuggestedActionsEngine

# In query handler, after generating response:
suggested_actions = SuggestedActionsEngine.generate(
    intent=result.get("kind"),
    items=result.get("items"),
    user_has_size=bool(user_preferences.get("size")),
    user_has_orders=bool(order_history),
    cart_payload=result.get("cart_payload")
)

return {
    ...existing_response,
    "suggested_actions": suggested_actions
}
```

---

### Frontend

#### [NEW] `frontend/src/components/cove-ai/SuggestedQueries.tsx`
**Purpose**: Display clickable suggested query chips

```tsx
"use client";

import { Send } from "lucide-react";

interface SuggestedAction {
  text: string;
  query: string;
  type: "action" | "question" | "navigation" | "discovery" | "account";
}

interface SuggestedQueriesProps {
  suggestions: SuggestedAction[];
  onSelect: (query: string) => void;
  disabled?: boolean;
}

export default function SuggestedQueries({ 
  suggestions, 
  onSelect, 
  disabled = false 
}: SuggestedQueriesProps) {
  const getButtonStyle = (type: string) => {
    const baseStyle = `
      px-4 py-2 rounded-full text-sm font-medium
      transition-all duration-200
      flex items-center gap-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;
    
    switch(type) {
      case "action":
        return `${baseStyle} bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-105`;
      case "question":
        return `${baseStyle} bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700`;
      case "navigation":
        return `${baseStyle} bg-neutral-800/50 text-neutral-200 hover:bg-neutral-700 border border-neutral-700/50`;
      default:
        return `${baseStyle} bg-neutral-800 text-neutral-100 hover:bg-neutral-700`;
    }
  };

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-fade-in-up">
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(suggestion.query)}
          disabled={disabled}
          className={getButtonStyle(suggestion.type)}
          style={{
            animationDelay: `${idx * 50}ms`
          }}
        >
          <span>{suggestion.text}</span>
          <Send className="h-3 w-3 opacity-60" />
        </button>
      ))}
      
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
```

#### [MODIFY] `frontend/src/components/cove-ai/CoveChatWidget.tsx`
1. Update `AgentResponse` type to include `suggested_actions`
2. Store suggestions in message metadata
3. Render `SuggestedQueries` component below AI messages
4. Handle suggestion click → auto-send query

```tsx
import SuggestedQueries from "./SuggestedQueries";

// Update types
type AssistantMeta = 
  | CartProposalMeta
  | RecommendationsMeta
  | CheckoutReadyMeta
  | { kind: "with_suggestions"; suggested_actions: SuggestedAction[] };

// In handleAgentResponse:
if (data.suggested_actions) {
  msg.meta = {
    ...msg.meta,
    suggested_actions: data.suggested_actions
  };
}

// In render loop:
const suggestions = m.meta?.suggested_actions;

{!isUser && suggestions && (
  <SuggestedQueries
    suggestions={suggestions}
    onSelect={(query) => {
      setInput(query);
      // Auto-submit or let user review?
      // Option 1: Auto-submit
      handleSubmit(new Event('submit') as any);
      // Option 2: Just populate input
    }}
    disabled={loading}
  />
)}
```

#### [MODIFY] `frontend/types/agent.ts`
Add `suggested_actions` to `AgentResponse` type:

```typescript
export interface AgentResponse {
  kind: string;
  answer: string;
  items?: AgentItem[];
  cart_payload?: AgentCartPayload;
  checkout?: CheckoutData;
  suggested_actions?: SuggestedAction[];
}

export interface SuggestedAction {
  text: string;
  query: string;
  type: "action" | "question" | "navigation" | "discovery" | "account";
}
```

---

## Implementation Strategy

### Phase 1: Backend Foundation
1. Create `SuggestedActionsEngine` in `suggested_actions.py`
2. Add `SuggestedAction` type to `types.py`
3. Update agent routes to generate and include suggestions

### Phase 2: Frontend UI
1. Create `SuggestedQueries` component with animations
2. Update types in `agent.ts`
3. Integrate into `CoveChatWidget`

### Phase 3: Polish & Testing
1. Test all conversation flows
2. Fine-tune suggestion logic based on user behavior
3. Add analytics to track which suggestions are used most

---

## User Experience Flow

```
User: "Show me hoodies"
  ↓
AI: "Here are some sleek hoodies..."
  [Product Carousel]
  
  Suggested Actions:
  [Add Cove Designer Hoodie] [What size?] [Show more] [Material info]
  ↓
User clicks: [What size?]
  ↓
AI: "I recommend Medium for you based on..."
  
  Suggested Actions:
  [Add size M to cart] [Show size chart] [Try different size]
```

---

## Future Enhancements

1. **ML-Powered Suggestions**: Learn which suggestions users click most
2. **Personalization**: Tailor suggestions based on user history
3. **A/B Testing**: Test different suggestion phrasings
4. **Voice Commands**: Make suggestions voice-activatable
5. **Conditional Logic**: "If user viewed 3+ items → suggest 'Compare items'"
