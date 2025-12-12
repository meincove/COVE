# Visible Agent Thinking - Implementation Plan

## Goal
Make the agent's reasoning process **visible** to create wow factor and demonstrate true agentic behavior.

---

## User Experience

### Before (Current)
```
User: "show me hoodies"
[2 second delay...]
Agent: "Here are some hoodies for you"
```
**Problem**: Feels like a slow chatbot

### After (Enhanced)
```
User: "show me hoodies"
Agent: 🔍 Searching catalog...
       ✓ Found 24 hoodies
       
       🧠 Analyzing your preferences...
       ✓ Filtered to Designer tier
       
       ✨ Ranking by relevance...
       ✓ Top 4 matches ready
       
       "Here are 4 Designer hoodies perfect for you"
```
**Impact**: Feels intelligent and transparent

---

## Technical Implementation

### 1. Backend - Status Events

#### Add Status Type
```python
# cove-ai-core/app/routes/agent.py

from typing import Literal

AgentStatusType = Literal[
    "searching",
    "analyzing", 
    "reasoning",
    "comparing",
    "recommending",
    "adding_to_cart",
    "creating_checkout"
]

class AgentStatus(BaseModel):
    status: AgentStatusType
    message: str
    details: Optional[str] = None
```

#### Emit Status Before Actions
```python
async def query_handler(body: AgentIn):
    # Before catalog search
    yield AgentStatus(
        status="searching",
        message="🔍 Searching catalog...",
    )
    
    # Call catalog
    results = await catalog_search(...)
    
    yield AgentStatus(
        status="searching",
        message=f"✓ Found {len(results)} items",
    )
    
    # Before LLM reasoning
    yield AgentStatus(
        status="analyzing",
        message="🧠 Analyzing preferences...",
    )
    
    # After ranking
    yield AgentStatus(
        status="recommending",
        message=f"✓ Top {top_k} matches ready",
    )
    
    # Final response
    yield AgentOut(...)
```

#### Streaming Response
```python
@router.post("/ai/agent/query")
async def agent_query_stream(body: AgentIn):
    async def generate():
        async for event in query_handler(body):
            if isinstance(event, AgentStatus):
                yield f"data: {event.json()}\\n\\n"
            else:
                yield f"data: {event.json()}\\n\\n"
                break
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

---

### 2. Frontend - Status Display

#### New Component
```typescript
// frontend/src/components/cove-ai/AgentThinkingBubble.tsx

interface Props {
  status: string;
  message: string;
  details?: string;
}

export function AgentThinkingBubble({ status, message, details }: Props) {
  return (
    <div className="flex items-start gap-3 mb-4 animate-fade-in">
      {/* Pulsing icon */}
      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
        {getStatusIcon(status)}
      </div>
      
      {/* Status text */}
      <div className="flex-1">
        <p className="text-sm text-gray-300 font-medium">
          {message}
        </p>
        {details && (
          <p className="text-xs text-gray-500 mt-1">
            {details}
          </p>
        )}
      </div>
      
      {/* Animated dots */}
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
      </div>
    </div>
  );
}

function getStatusIcon(status: string) {
  const icons = {
    searching: "🔍",
    analyzing: "🧠",
    reasoning: "✨",
    comparing: "📊",
    recommending: "💡",
    adding_to_cart: "🛒",
    creating_checkout: "💳",
  };
  return icons[status] || "⚡";
}
```

#### Update Chat Widget
```typescript
// CoveChatWidget.tsx

interface StatusMessage {
  id: string;
  type: 'status';
  status: AgentStatusType;
  message: string;
  details?: string;
}

type ChatMessage = BaseMessage | StatusMessage;

// In handleAgentQuery:
const eventSource = new EventSource(`/api/agent-dev/query-stream?${params}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.status) {
    // Status update
    setMessages(prev => [...prev, {
      id: makeId(),
      type: 'status',
      status: data.status,
      message: data.message,
      details: data.details,
    }]);
  } else {
    // Final response
    handleAgentResponse(data);
    eventSource.close();
  }
};
```

---

### 3. Enhanced Display

#### Show Tool Use
```typescript
// After final response, show summary
<div className="mt-2 p-3 bg-gray-800/50 rounded-lg text-xs">
  <p className="text-gray-400 mb-2">🔧 Tools used:</p>
  <ul className="space-y-1">
    <li className="flex items-center gap-2">
      <span className="text-green-400">✓</span>
      <span>catalog_search</span>
      <span className="text-gray-500">(24 results)</span>
    </li>
    <li className="flex items-center gap-2">
      <span className="text-green-400">✓</span>
      <span>fit_recommend</span>
      <span className="text-gray-500">(size M, 94% confidence)</span>
    </li>
  </ul>
</div>
```

---

## Files to Modify

### Backend
1. `cove-ai-core/app/routes/agent.py`
   - Add `AgentStatus` type
   - Yield status before each tool call
   - Convert to streaming endpoint

### Frontend  
1. `frontend/src/components/cove-ai/AgentThinkingBubble.tsx` (NEW)
   - Status bubble component

2. `frontend/src/components/cove-ai/CoveChatWidget.tsx`
   - Add `StatusMessage` type
   - Handle EventSource streaming
   - Render thinking bubbles

3. `frontend/src/app/api/agent-dev/query/route.ts`
   - Update to support streaming

---

## Success Criteria

✅ User sees "Searching..." immediately when asking for products  
✅ Each major step shows progress (search → analyze → recommend)  
✅ Tool use is visible with result counts  
✅ Smooth animations create premium feel  
✅ "Wow" reaction: "It's actually thinking!"

---

## Timeline

- **Hour 1**: Backend status events
- **Hour 2**: Frontend component + streaming
- **Hour 3**: Polish animations + testing

**Total**: ~3 hours for Phase 1
