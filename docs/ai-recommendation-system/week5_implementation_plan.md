# Week 5 Implementation Plan - Streaming & Performance

**Goal**: Dramatically improve perceived speed through streaming responses and optimized prompts

**Target**: First token in <1-2 seconds, streaming UX that feels instant

---

## Overview

### Key Objectives
1. ✅ Enable LLM streaming from OpenAI to backend
2. ✅ Implement SSE (Server-Sent Events) streaming to frontend  
3. ✅ Create intent-specific prompt templates
4. ✅ Build MCP client with feature flag
5. ✅ Add comprehensive telemetry

### Success Metrics
- `time_to_first_token` < 2 seconds (target: 1s)
- User sees typing animation within 500ms
- Total perceived latency cut in half
- No regression in answer quality

---

## Phase 1: Backend Streaming Infrastructure

### 1.1 LLM Streaming Wrapper

**File**: `cove-ai-core/app/core/llm_streaming.py` (NEW)

**Purpose**: Wrap OpenAI streaming API to accumulate tokens while yielding chunks

```python
from typing import AsyncGenerator, Dict, Any
import openai
import time
import logging

logger = logging.getLogger(__name__)

async def stream_openai_completion(
    messages: list,
    model: str = "gpt-4",
    temperature: float = 0.7
) -> AsyncGenerator[str, None]:
    """
    Stream tokens from OpenAI and track metrics.
    
    Yields:
        str: Each token chunk as it arrives
        
    Also accumulates full response for logging.
    """
    start_time = time.time()
    first_token_time = None
    accumulated_text = ""
    
    try:
        stream = await openai.ChatCompletion.acreate(
            model=model,
            messages=messages,
            temperature=temperature,
            stream=True
        )
        
        async for chunk in stream:
            delta = chunk.choices[0].delta
            
            if delta.get("content"):
                token = delta.content
                
                # Track first token time
                if first_token_time is None:
                    first_token_time = time.time()
                    logger.info(f"First token in {(first_token_time - start_time)*1000:.0f}ms")
                
                accumulated_text += token
                yield token
        
        # Log completion metrics
        total_time = time.time() - start_time
        logger.info("Streaming complete", extra={
            "total_time_ms": total_time * 1000,
            "first_token_ms": (first_token_time - start_time) * 1000 if first_token_time else None,
            "total_tokens": len(accumulated_text.split()),
            "tokens_per_second": len(accumulated_text.split()) / total_time if total_time > 0 else 0
        })
        
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        raise
```

**Key Features**:
- Tracks `first_token_ms` (your 1-2s target metric)
- Accumulates full text for logging/storage
- Yields chunks in real-time for SSE

---

### 1.2 FastAPI SSE Endpoint

**File**: `cove-ai-core/app/routes/agent.py` (MODIFY)

**Add new streaming endpoint**:

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from app.core.llm_streaming import stream_openai_completion

@app.post("/ai/agent/query/stream")
async def agent_query_stream(body: AgentQuery):
    """
    Streaming version of agent query endpoint.
    Returns SSE stream of tokens.
    """
    
    async def event_generator():
        """Generate SSE events."""
        try:
            # 1. Classify intent (fast, cached)
            intent = await classify_intent(body.message)
            
            # 2. Send intent event
            yield f"event: intent\ndata: {json.dumps({'intent': intent})}\n\n"
            
            # 3. Stream LLM response
            messages = build_messages(body, intent)
            
            yield f"event: stream_start\ndata: {{}}\n\n"
            
            async for token in stream_openai_completion(messages):
                # Send each token as SSE event
                yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
            
            yield f"event: stream_end\ndata: {{}}\n\n"
            
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
```

**SSE Event Types**:
- `intent` - Intent classification result (immediate)
- `stream_start` - LLM streaming beginning
- `token` - Each text chunk
- `stream_end` - Completion
- `error` - Error occurred

---

## Phase 2: Frontend Streaming UI

### 2.1 EventSource Integration

**File**: `frontend/src/components/cove-ai/CoveChatWidget.tsx` (MODIFY)

**Add streaming message handler**:

```typescript
const [streamingMessage, setStreamingMessage] = useState<string>("");
const [isStreaming, setIsStreaming] = useState(false);

async function sendMessageStreaming(message: string) {
  setIsStreaming(true);
  setStreamingMessage("");
  
  const eventSource = new EventSource(
    `/api/agent-dev/query/stream?message=${encodeURIComponent(message)}&userId=${userId}`
  );
  
  eventSource.addEventListener("intent", (event) => {
    const data = JSON.parse(event.data);
    console.log("Intent:", data.intent);
  });
  
  eventSource.addEventListener("stream_start", () => {
    // Show typing indicator
    const tempMsg: ChatMessage = {
      id: makeId(),
      role: "assistant",
      content: "",
      isStreaming: true
    };
    setMessages(prev => [...prev, tempMsg]);
  });
  
  eventSource.addEventListener("token", (event) => {
    const data = JSON.parse(event.data);
    setStreamingMessage(prev => prev + data.token);
    
    // Update last message
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1].content = streamingMessage + data.token;
      return updated;
    });
  });
  
  eventSource.addEventListener("stream_end", () => {
    setIsStreaming(false);
    eventSource.close();
    
    // Finalize message
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1].isStreaming = false;
      return updated;
    });
  });
  
  eventSource.addEventListener("error", (err) => {
    console.error("Stream error:", err);
    setIsStreaming(false);
    eventSource.close();
  });
}
```

**UX Enhancements**:
- Show typing animation while `isStreaming === true`
- Append tokens word-by-word (not char-by-char)
- Smooth cursor blink at end of partial text

---

### 2.2 Typing Animation Component

**File**: `frontend/src/components/cove-ai/TypingIndicator.tsx` (NEW)

```typescript
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0ms'}} />
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '150ms'}} />
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '300ms'}} />
    </div>
  );
}
```

**Usage**: Show while waiting for first token from SSE stream

---

## Phase 3: Prompt Optimization

### 3.1 Intent-Specific Templates

**File**: `cove-ai-core/app/core/prompt_templates.py` (NEW)

**Purpose**: Use shorter, focused prompts for quick queries

```python
from typing import Dict

# Short prompt for simple queries (50-100 tokens)
QUICK_RESPONSE_TEMPLATE = """You are a helpful e-commerce assistant for Cove, a premium streetwear brand.

User query: {query}
Context: {context}

Respond in 1-2 sentences. Be direct and helpful."""

# Standard prompt for complex queries (200-300 tokens)  
STANDARD_TEMPLATE = """You are an expert fashion stylist and e-commerce assistant for Cove...
[full existing prompt]
"""

# Intent-specific templates
PROMPT_TEMPLATES: Dict[str, str] = {
    # Quick responses (<100 token prompts)
    "size_fit": """You're a sizing expert. Answer this sizing question:
    
User: {query}
Available sizes: {sizes}

Give practical sizing advice in 2 sentences.""",
    
    "policy": """Answer this policy question directly:

Question: {query}
Policy: {policy_text}

1-2 sentence answer.""",
    
    # Standard responses
    "discover": STANDARD_TEMPLATE,
    "generic": STANDARD_TEMPLATE,
    
    # Default
    "default": QUICK_RESPONSE_TEMPLATE
}

def get_prompt_template(intent_kind: str) -> str:
    """Get appropriate template for intent."""
    return PROMPT_TEMPLATES.get(intent_kind, PROMPT_TEMPLATES["default"])
```

**Impact**:
- `size_fit` queries: ~50 input tokens instead of ~200
- Faster encoding + faster generation
- Target: 30-40% reduction in p99 latency for quick queries

---

### 3.2 Dynamic Template Selection

**File**: `cove-ai-core/app/routes/agent.py` (MODIFY)

```python
from app.core.prompt_templates import get_prompt_template

async def build_messages(body: AgentQuery, intent_kind: str) -> list:
    """Build LLM messages with appropriate template."""
    
    # Select template based on intent
    template = get_prompt_template(intent_kind)
    
    # Inject context
    context = await gather_context(body, intent_kind)
    
    prompt = template.format(
        query=body.message,
        **context
    )
    
    return [
        {"role": "system", "content": prompt},
        {"role": "user", "content": body.message}
    ]
```

---

## Phase 4: MCP Client Integration

### 4.1 MCP Client Wrapper

**File**: `cove-ai-core/app/cove_mcp/client.py` (NEW)

**Purpose**: Call MCP server from agent code (controlled by feature flag)

```python
import os
import sys
from typing import Dict, Any, Optional
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.session import ClientSession

class MCPClient:
    """Client for Cove MCP commerce server."""
    
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.enabled = os.getenv("USE_MCP_TOOLS", "false").lower() == "true"
    
    async def connect(self):
        """Connect to MCP server."""
        if not self.enabled:
            return
            
        server_params = StdioServerParameters(
            command=sys.executable,
            args=["-m", "app.cove_mcp.commerce_server"]
        )
        
        self.read, self.write = await stdio_client(server_params).__aenter__()
        self.session = await ClientSession(self.read, self.write).__aenter__()
        await self.session.initialize()
    
    async def call_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Call MCP tool with logging."""
        if not self.enabled or not self.session:
            raise RuntimeError("MCP client not enabled or connected")
        
        import time
        start = time.time()
        
        try:
            result = await self.session.call_tool(tool_name, args)
            duration_ms = (time.time() - start) * 1000
            
            logger.info(f"MCP tool call", extra={
                "tool": tool_name,
                "duration_ms": duration_ms,
                "success": True
            })
            
            return result.model_dump()
            
        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            
            logger.error(f"MCP tool failed", extra={
                "tool": tool_name,
                "duration_ms": duration_ms,
                "success": False,
                "error": str(e)
            })
            
            raise

# Singleton instance
_mcp_client: Optional[MCPClient] = None

async def get_mcp_client() -> MCPClient:
    """Get or create MCP client singleton."""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
        await _mcp_client.connect()
    return _mcp_client
```

---

### 4.2 Tool Routing with Feature Flag

**File**: `cove-ai-core/app/routes/agent.py` (MODIFY)

**Route tool calls based on `USE_MCP_TOOLS` flag**:

```python
import os
from app.cove_mcp.client import get_mcp_client
from app.cove_ai_tools import checkout, orders, emails

USE_MCP = os.getenv("USE_MCP_TOOLS", "false").lower() == "true"

async def recommend_products(query: str, filters: dict) -> dict:
    """Recommend products - routed via feature flag."""
    
    if USE_MCP:
        # Use MCP server
        client = await get_mcp_client()
        return await client.call_tool("recommend_products", {
            "query": query,
            "filters": filters,
            "top_k": 6
        })
    else:
        # Direct call (current implementation)
        from app.ai.recs import suggest_products
        return await suggest_products(query, filters)

async def add_to_cart(variant_id: str, size: str, user_id: str) -> dict:
    """Add to cart - routed via feature flag."""
    
    if USE_MCP:
        client = await get_mcp_client()
        return await client.call_tool("cart_add", {
            "variantId": variant_id,
            "size": size,
            "clerkUserId": user_id,
            "quantity": 1
        })
    else:
        # Direct Django call
        from app.cove_ai_tools.cart import cart_add
        return await cart_add({
            "variantId": variant_id,
            "size": size,
            "clerkUserId": user_id,
            "quantity": 1
        })
```

**Environment Variable**:
```bash
# .env
USE_MCP_TOOLS=false  # Start disabled, test, then enable
```

---

## Phase 5: Telemetry & Monitoring

### 5.1 Performance Metrics

**File**: `cove-ai-core/app/core/telemetry.py` (NEW)

```python
import time
import logging
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

logger = logging.getLogger("cove.telemetry")

class PerformanceTracker:
    """Track performance metrics for agent queries."""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {}
        self.start_time: float = 0
        self.first_token_time: Optional[float] = None
    
    def start(self):
        """Start tracking."""
        self.start_time = time.time()
        self.metrics = {
            "start_time": self.start_time
        }
    
    def mark_first_token(self):
        """Mark first token received."""
        if self.first_token_time is None:
            self.first_token_time = time.time()
            self.metrics["first_token_ms"] = (self.first_token_time - self.start_time) * 1000
    
    def mark_intent_classified(self, intent: str):
        """Mark intent classification complete."""
        self.metrics["intent_classification_ms"] = (time.time() - self.start_time) * 1000
        self.metrics["intent"] = intent
    
    def mark_complete(self):
        """Mark request complete."""
        self.metrics["total_time_ms"] = (time.time() - self.start_time) * 1000
    
    def log(self):
        """Log collected metrics."""
        logger.info("Agent query metrics", extra=self.metrics)
    
    @property
    def time_to_first_token(self) -> Optional[float]:
        """Get time to first token in ms."""
        return self.metrics.get("first_token_ms")

@asynccontextmanager
async def track_performance():
    """Context manager for performance tracking."""
    tracker = PerformanceTracker()
    tracker.start()
    
    try:
        yield tracker
    finally:
        tracker.mark_complete()
        tracker.log()
```

**Usage in agent endpoint**:
```python
async def agent_query_stream(body: AgentQuery):
    async def event_generator():
        async with track_performance() as tracker:
            # Classify intent
            intent = await classify_intent(body.message)
            tracker.mark_intent_classified(intent)
            
            # Stream response
            async for token in stream_openai_completion(...):
                tracker.mark_first_token()  # Only marks once
                yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
    
    return StreamingResponse(event_generator(), ...)
```

---

### 5.2 Monitoring Dashboard Queries

**Track key metrics**:

```python
# Query for slow first-token times
SELECT 
    AVG(first_token_ms) as avg_first_token,
    P50(first_token_ms) as p50_first_token,
    P95(first_token_ms) as p95_first_token,
    P99(first_token_ms) as p99_first_token
FROM agent_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY intent
ORDER BY p99_first_token DESC;
```

**Alerts**:
- `p95_first_token > 2000ms` → Investigate slow queries
- `total_time_ms > 10000ms` → Backend performance issue
- `error_rate > 5%` → Streaming errors

---

## Phase 6: Testing Strategy

### 6.1 Streaming Smoke Tests

**File**: `cove-ai-core/test_streaming.py` (NEW)

```python
import asyncio
import httpx

async def test_streaming_endpoint():
    """Test SSE streaming works."""
    
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "http://localhost:8000/ai/agent/query/stream",
            json={"message": "show me hoodies", "clerkUserId": "test"}
        ) as response:
            
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    events.append(line)
            
            print(f"Received {len(events)} SSE events")
            assert len(events) > 0, "Should receive events"
            assert any("token" in e for e in events), "Should receive tokens"

asyncio.run(test_streaming_endpoint())
```

---

### 6.2 Performance Comparison Tests

**Test**: Measure before/after streaming implementation

```python
async def compare_streaming_vs_blocking():
    """Compare streaming vs blocking response times."""
    
    # Blocking (old way)
    start = time.time()
    response = await client.post("/ai/agent/query", json={...})
    blocking_time = time.time() - start
    
    # Streaming (new way) - measure time to first token
    start = time.time()
    first_token_time = None
    
    async with client.stream("POST", "/ai/agent/query/stream", json={...}) as stream:
        async for line in stream.aiter_lines():
            if "token" in line and first_token_time is None:
                first_token_time = time.time() - start
                break
    
    print(f"Blocking: {blocking_time*1000:.0f}ms")
    print(f"Streaming (first token): {first_token_time*1000:.0f}ms")
    print(f"Improvement: {(blocking_time/first_token_time):.1f}x faster perceived")
```

---

## Implementation Timeline

### Week 5 Day-by-Day Plan

**Monday**: Phase 1 - Backend Streaming
- [ ] Create `llm_streaming.py` with OpenAI streaming wrapper
- [ ] Add `/ai/agent/query/stream` SSE endpoint
- [ ] Test with curl/Postman

**Tuesday**: Phase 2 - Frontend Streaming  
- [ ] Add EventSource integration to `CoveChatWidget`
- [ ] Create `TypingIndicator` component
- [ ] Test end-to-end streaming UX

**Wednesday**: Phase 3 - Prompt Optimization
- [ ] Create `prompt_templates.py` with intent-specific templates
- [ ] Measure token reduction (aim for 30%+ on quick queries)
- [ ] A/B test answer quality

**Thursday**: Phase 4 - MCP Client
- [ ] Build `cove_mcp/client.py` wrapper
- [ ] Add feature flag routing in agent.py
- [ ] Test MCP path works (keep flag OFF)

**Friday**: Phase 5 & 6 - Telemetry & Testing
- [ ] Add performance tracking to all endpoints
- [ ] Run streaming smoke tests
- [ ] Compare metrics: target `first_token_ms < 1500ms`

---

## Rollout Strategy

### Stage 1: Streaming Only (Days 1-2)
- Deploy streaming endpoint
- Keep blocking endpoint as fallback
- Monitor error rates

### Stage 2: Prompt Optimization (Day 3)
- Deploy optimized templates
- Compare quality metrics
- Rollback if quality drops

### Stage 3: MCP Client (Days 4-5)
- Keep `USE_MCP_TOOLS=false`
- Test MCP path in dev
- Enable for 10% traffic
- Full rollout if metrics good

---

## Success Criteria

### Before Week 5:
- Average time to first response: ~5-7 seconds
- User sees "thinking..."static message
- No streaming

### After Week 5:
- ✅ Time to first token: <1.5 seconds (p95)
- ✅ User sees typing animation within 500ms
- ✅ 30%+ reduction in prompt tokens for quick queries
- ✅ MCP client working (feature flag ready)
- ✅ Comprehensive telemetry in place

---

## Risk Mitigation

**Risk**: Streaming adds complexity
- **Mitigation**: Keep blocking endpoint as fallback

**Risk**: EventSource browser support
- **Mitigation**: Polyfill for older browsers, graceful degradation

**Risk**: Prompt optimization hurts answer quality
- **Mitigation**: A/B test, measure satisfaction, easy rollback

**Risk**: MCP adds latency
- **Mitigation**: Feature flag allows instant disable

---

## Next Steps

1. **Review this plan** - any adjustments needed?
2. **Start Phase 1** - backend streaming infrastructure
3. **Set up monitoring** - ensure metrics are captured
4. **Iterate based on data** - optimize what's slow

**Ready to start implementing?** 🚀
