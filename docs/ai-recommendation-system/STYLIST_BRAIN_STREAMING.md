# Real-Time Stylist Brain - Implementation Plan

**Goal**: Show the AI's thinking process in real-time as it works,not fake loading states!

---

## ✅ Backend - DONE!

### New Endpoint: `/ai/agent/query-stream`

**File**: `cove-ai-core/app/routes/agent_stream.py`

This endpoint **actually does the work** and emits SSE events at each step:

1. **`thinking:step`** - "Understanding your request" (during intent classification)
2. **`thinking:step`** - "Searching catalog" (calling `/ai/recs/suggest`)
3. **`thinking:step`** - "Found X items" (results received)
4. **`thinking:step`** - "Ranking matches" (personalizing)
5. **`thinking:step`** - "Crafting intro" (Stylist Brain LLM call)
6. **`thinking:step`** - "Top X recommendations ready" (done ranking)
7. **`intro`** - Stylist Brain text (the magic intro!)
8. **`items:batch`** - Products in batches of 2 (progressive loading)
9. **`done`** - Final completion

**Key**: NO `asyncio.sleep()` fake delays! Events fire when work completes.

---

## 🎯 Frontend - TODO

### Step 1: Create SSE Hook

**File**: `frontend/src/hooks/useAgentStreaming.ts`

```typescript
import { useEffect, useRef, useState } from 'react';

type ThinkingStep = {
  icon: string;
  status: string;
  detail: string;
  done?: boolean;
};

type AgentStreamState = {
  thinkingSteps: ThinkingStep[];
  introText: string | null;
  items: any[];
  isStreaming: boolean;
  error: string | null;
};

export function useAgentStream() {
  const [state, setState] = useState<AgentStreamState>({
    thinkingSteps: [],
    introText: null,
    items: [],
    isStreaming: false,
    error: null,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const sendQuery = (message: string, userId?: string, sessionId?: string) => {
    // Reset state
    setState({
      thinkingSteps: [],
      introText: null,
      items: [],
      isStreaming: true,
      error: null,
    });

    // Create SSE connection
    const url = new URL('http://localhost:8000/ai/agent/query-stream');
    
    // Note: EventSource doesn't support POST, so we'll use fetch with ReadableStream
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        clerkUserId: userId,
        guestSessionId: sessionId,
        top_k: 4,
      }),
    })
      .then(async (response) => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response body');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (!line.trim()) continue;

            const [eventLine, dataLine] = line.split('\n');
            if (!eventLine.startsWith('event:') || !dataLine?.startsWith('data:')) continue;

            const eventType = eventLine.replace('event:', '').trim();
            const data = JSON.parse(dataLine.replace('data:', '').trim());

            handleEvent(eventType, data);
          }
        }
      })
      .catch((error) => {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: error.message,
        }));
      });
  };

  const handleEvent = (eventType: string, data: any) => {
    switch (eventType) {
      case 'thinking:step':
        setState((prev) => ({
          ...prev,
          thinkingSteps: [...prev.thinkingSteps, data],
        }));
        break;

      case 'intro':
        setState((prev) => ({
          ...prev,
          introText: data.text,
        }));
        break;

      case 'items:batch':
        setState((prev) => ({
          ...prev,
          items: [...prev.items, ...data.items],
        }));
        break;

      case 'done':
        setState((prev) => ({
          ...prev,
          isStreaming: false,
        }));
        break;

      case 'error':
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: data.message || 'Something went wrong',
        }));
        break;
    }
  };

  const cleanup = () => {
    eventSourceRef.current?.close();
  };

  useEffect(() => cleanup, []);

  return { ...state, sendQuery };
}
```

---

### Step 2: Update Chat Widget

**File**: `frontend/src/components/cove-ai/CoveChatWidget.tsx`

Replace the current submit handler with:

```typescript
import { useAgentStream } from '@/src/hooks/useAgentStreaming';

export default function CoveChatWidget() {
  const { user } = useUser();
  const { thinkingSteps, introText, items, isStreaming, sendQuery } = useAgentStream();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to chat
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    }]);

    // Start streaming
    sendQuery(
      userMessage,
      user?.id,
      guestSessionId
    );
  };

  // Listen to streaming state and update messages
  useEffect(() => {
    if (!isStreaming && introText) {
      // Add AI response with intro + items
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: introText,
        meta: {
          kind: 'recommendations',
          items: items,
        },
      }]);
    }
  }, [isStreaming, introText, items]);

  // Render thinking steps
  return (
    <div>
      {/* Messages */}
      {messages.map((m) => (
        // ... existing message rendering
      ))}

      {/* Show thinking steps while streaming */}
      {isStreaming && thinkingSteps.length > 0 && (
        <div className="bg-neutral-900 rounded-lg p-4 space-y-2">
          {thinkingSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl">{step.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{step.status}</p>
                <p className="text-xs text-neutral-400">{step.detail}</p>
              </div>
              {step.done && <Check className="h-4 w-4 text-green-500" />}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit}>
        {/* ... */}
      </form>
    </div>
  );
}
```

---

## 🎨 UI Design

### Thinking Steps Display

```
┌─────────────────────────────────────────┐
│ 🧠  Understanding your request          │
│     Analyzing intent                    │
├─────────────────────────────────────────┤
│ 🔍  Searching catalog                   │
│     Finding matches                     │
├─────────────────────────────────────────┤
│ ✓   Searching catalog                   │
│     Found 4 items                   ✓   │
├─────────────────────────────────────────┤
│ ✨  Ranking matches                     │
│     Personalizing top 4                 │
├─────────────────────────────────────────┤
│ 🎨  Crafting intro                      │
│     Stylist Brain analyzing...          │
├─────────────────────────────────────────┤
│ ✓   Ranking matches                     │
│     Top 4 recommendations ready     ✓   │
└─────────────────────────────────────────┘
```

**Then**: Intro text appears  
**Then**: Products fade in 2 at a time

---

## 🎯 Event Flow

```
User: "show me some hoodies"
  ↓
Frontend sends to /ai/agent/query-stream
  ↓
Backend ACTUALLY works:
  1. Classifies intent → emits "Understanding..."
  2. Calls /ai/recs/suggest → emits "Searching..."
  3. Gets results → emits "Found 4 items" ✓
  4. Personalizes → emits "Ranking..."
  5. Calls LLM for intro → emits "Crafting intro..."
  6. LLM returns → emits "Ready" ✓
  7. Sends intro → emits intro event
  8. Sends products → emits items in batches
  9. Done!
```

---

## ✅ Benefits

1. **NO FAKE DELAYS** - Events fire when work completes
2. **Real transparency** - User sees what AI is actually doing
3. **Progressive loading** - Products appear 2 at a time
4. **Professional** - Founders-grade implementation
5. **Accurate timing** - Fast queries finish fast, slow ones show progress

---

## 🚀 Testing

1. **Start backend**: `uvicorn app.main:app --reload --port 8000`
2. **Test endpoint**: 
   ```bash
   curl -N -H "Content-Type: application/json" \
     -d '{"message":"show me some hoodies","top_k":4}' \
     http://localhost:8000/ai/agent/query-stream
   ```
3. **You should see events** streaming in real-time!

---

## 📋 Next Steps

1. ✅ Backend endpoint created (`agent_stream.py`)
2. ⬜ Create `useAgentStream` hook
3. ⬜ Update `CoveChatWidget` to use streaming
4. ⬜ Style thinking steps display
5. ⬜ Add progressive product loading animation
6. ⬜ Test end-to-end

---

**Status**: Backend ready! Frontend needs implementation.

The key insight: **Don't fake it - stream it as it happens!** 🎯
