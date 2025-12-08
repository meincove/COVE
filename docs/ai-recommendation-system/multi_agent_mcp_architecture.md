# Multi-Agent Architecture with MCP Tools

**Decision**: Keep single orchestrator LLM, add specialized MCP agents

---

## Research Summary

### Industry Consensus

**What Big Companies Do:**
- **Single orchestrator + specialized agents** (not multiple competing LLMs)
- Orchestrator delegates to domain-specific agents via MCP
- Each agent = separate MCP server with focused capability

**Why NOT Multiple LLMs:**
- ❌ Coordination nightmare - which LLM handles what?
- ❌ Higher cost - running multiple GPT-4s simultaneously
- ❌ Unpredictable behavior - LLMs competing/contradicting
- ❌ Memory management hell - sharing context across LLMs

**Why Single Orchestrator + MCP Agents:**
- ✅ **Modularity** - Each agent is independent, testable module
- ✅ **Cost-effective** - Use smaller/specialized models per agent
- ✅ **Clear responsibility** - NO coordination conflicts
- ✅ **Easy to scale** - Add/remove agents without touching core
- ✅ **MCP standard** - Agents communicate via standardized protocol

---

## Proposed Architecture

### Current State
```
User Query → Single LLM Orchestrator → Tool Routing → Response
                   |
                   ├─ Catalog Search
                   ├─ Cart Management  
                   └─ Checkout
```

### New State (Hybrid Multi-Agent)
```
User Query 
    ↓
Single LLM Orchestrator (gpt-4o-mini)
    ↓
Intent Router (MCP Agent - Fast)
    ↓
┌──────────────┬────────────────┬─────────────────┐
│              │                │                 │
Intent         Product          Order            Checkout
Classifier     Recommender      Manager          Agent
(MCP)          (MCP)            (MCP)            (MCP)
│              │                │                 │
gpt-4o-mini    Embeddings       gpt-4o-mini      Rule-based
               + Pinecone
```

---

## MCP Agents Breakdown

### 1. **Intent Classifier Agent** (MCP Server)

**Purpose**: Fast semantic intent detection  
**Model**: `gpt-4o-mini` OR `multilingual-e5` embeddings  
**Location**: `cove-ai-core/app/mcp_agents/intent_classifier/`

**Capabilities:**
```python
# MCP Tool: classify_intent
{
  "query": "show me hoodies",
  "user_context": {...}
}
→ Returns: {
  "intent": "recommendations",
  "confidence": 0.95,
  "entities": {"product_type": "hoodie"}
}
```

**Why MCP?**
- ✅ Can swap embedding models without touching orchestrator
- ✅ Can A/B test different classification strategies
- ✅ Scales independently under load

---

### 2. **Product Recommender Agent** (MCP Server)

**Purpose**: Semantic product search + personalization  
**Model**: Embeddings + Vector DB (Pinecone/Weaviate)  
**Location**: `cove-ai-core/app/mcp_agents/product_recommender/`

**Capabilities:**
```python
# MCP Tool: recommend_products
{
  "query": "show hoodies for cold weather",
  "user_profile": {...},
  "context": "browsing_history"
}
→ Returns: {
  "items": [...],
  "reasoning": "Selected thermal hoodies based on..."
}
```

**Why MCP?**
- ✅ Specialized for semantic search (faster than main LLM)
- ✅ Can use cheaper embedding models vs GPT-4
- ✅ Isolates vector DB logic from orchestrator

---

### 3. **Order Manager Agent** (MCP Server)

**Purpose**: Order tracking, returns, modifications  
**Model**: `gpt-4o-mini` + Django APIs  
**Location**: `cove-ai-core/app/mcp_agents/order_manager/`

**Capabilities:**
```python
# MCP Tool: manage_order
{
  "action": "track_order",
  "order_id": "12345",
  "user_id": "..."
}
→ Returns: {
  "status": "shipped",
  "tracking": "...",
  "estimated_delivery": "..."
}
```

**Why MCP?**
- ✅ Complex order logic separate from main chatbot
- ✅ Can handle order APIs independently
- ✅ Easy to update order policies without redeploying chatbot

---

### 4. **Checkout Agent** (MCP Server)

**Purpose**: Payment processing, address validation  
**Model**: Rule-based + Stripe API  
**Location**: `cove-ai-core/app/mcp_agents/checkout/`

**Capabilities:**
```python
# MCP Tool: initiate_checkout
{
  "cart_items": [...],
  "user_id": "...",
  "shipping_address": {...}
}
→ Returns: {
  "checkout_url": "...",
  "total": "...",
  "estimated_delivery": "..."
}
```

**Why MCP?**
- ✅ No need for LLM - pure logic/API calls
- ✅ Isolated payment security
- ✅ Easy to swap Stripe → another processor

---

## Architecture Decisions

### Should We Use Multiple LLMs?

**Answer: NO** ❌

**Instead:**
- **1 orchestrator LLM** (gpt-4o or gpt-4o-mini)
- **Specialized models per agent**:
  - Intent Classifier: `embeddings` (fast, cheap)
  - Product Recommender: `embeddings + vector DB` (semantic search)
  - Order Manager: `gpt-4o-mini` (reasoning)
  - Checkout: `no LLM` (rule-based)

**Why This Works:**
- Orchestrator handles conversation flow
- Agents handle specialized tasks efficiently
- Total cost < running multiple GPT-4s
- Clear separation of concerns

---

### Should We Replace Current Orchestrator?

**Answer: NO** ❌ **Evolve it instead**

**Keep:**
- Current `app/routes/agent.py` as orchestrator
- LLM reasoning for conversation flow
- Tool calling architecture

**Add:**
- MCP agent layer for specialized tasks
- Agent-as-a-Tool pattern
- Standardized MCP protocol

---

## Implementation Plan

### Phase 1: Intent Classifier MCP Agent (Week 1)

**Goal**: Move intent classification to dedicated MCP agent

```bash
# New structure
cove-ai-core/
├── app/
│   ├── mcp_agents/
│   │   ├── __init__.py
│   │   └── intent_classifier/
│   │       ├── server.py  # MCP server
│   │       ├── classifier.py  # LLM-based logic
│   │       └── config.json  # Intent definitions
│   └── routes/
│       └── agent.py  # Orchestrator calls MCP agent
```

**Changes:**
1. Create MCP server for intent classification
2. Update orchestrator to call MCP agent instead of inline logic
3. Test parallel run (old vs new)
4. Switch to MCP agent once validated

---

### Phase 2: Product Recommender MCP Agent (Week 2)

**Goal**: Semantic product search as MCP agent

```bash
cove-ai-core/
├── app/
│   ├── mcp_agents/
│   │   ├── product_recommender/
│   │   │   ├── server.py
│   │   │   ├── embeddings.py  # Vector search
│   │   │   └── catalog_client.py  # Django API
```

**Benefits:**
- Faster semantic search (< 50ms)
- No LLM cost for product retrieval
- Scalable vector DB integration

---

### Phase 3: Order & Checkout Agents (Week 3)

**Goal**: Modularize complex business logic

```bash
cove-ai-core/
├── app/
│   ├── mcp_agents/
│   │   ├── order_manager/
│   │   │   ├── server.py
│   │   │   └── order_logic.py
│   │   └── checkout/
│   │       ├── server.py
│   │       └── payment_handler.py
```

---

## File Structure

```
COVE/
├── cove-ai-core/
│   ├── app/
│   │   ├── main.py  # Main FastAPI app
│   │   ├── routes/
│   │   │   └── agent.py  # ORCHESTRATOR (keep as-is)
│   │   ├── mcp_agents/  # NEW: Specialized agents
│   │   │   ├── intent_classifier/
│   │   │   │   ├── server.py  # MCP server
│   │   │   │   ├── classifier.py  # Intent logic
│   │   │   │   └── mcp_config.json
│   │   │   ├── product_recommender/
│   │   │   │   ├── server.py
│   │   │   │   ├── embeddings.py
│   │   │   │   └── vector_search.py
│   │   │   ├── order_manager/
│   │   │   │   ├── server.py
│   │   │   │   └── order_logic.py
│   │   │   └── checkout/
│   │   │       ├── server.py
│   │   │       └── payment_handler.py
│   │   └── core/
│   │       └── mcp_client.py  # MCP client for orchestrator
```

---

## Code Example: Orchestrator with MCP Agents

```python
# app/routes/agent.py (ORCHESTRATOR - evolved, not replaced)

from app.core.mcp_client import MCPClient

# Initialize MCP clients for each agent
intent_agent = MCPClient("intent_classifier", port=8001)
product_agent = MCPClient("product_recommender", port=8002)
order_agent = MCPClient("order_manager", port=8003)

@router.post("/query")
async def agent_query(body: AgentIn):
    """
    Main orchestrator - delegates to MCP agents
    """
    
    # Step 1: Classify intent via MCP agent
    intent_result = await intent_agent.call_tool(
        "classify_intent",
        {
            "query": body.message,
            "user_context": {...}
        }
    )
    
    intent = intent_result["intent"]
    
    # Step 2: Route to specialized agent
    if intent == "recommendations":
        # Call product recommender MCP agent
        products = await product_agent.call_tool(
            "recommend_products",
            {
                "query": body.message,
                "user_profile": {...}
            }
        )
        return products
    
    elif intent == "order_tracking":
        # Call order manager MCP agent
        order_status = await order_agent.call_tool(
            "track_order",
            {
                "user_id": body.clerkUserId,
                "order_query": body.message
            }
        )
        return order_status
    
    # ... etc
```

---

## Benefits Summary

| **Benefit** | **Single Orchestrator + MCP Agents** | **Multiple LLMs** |
|---|---|---|
| **Cost** | ✅ Lower (specialized models per task) | ❌ Higher (multiple GPT-4s) |
| **Coordination** | ✅ Clear (single decision-maker) | ❌ Complex (which LLM leads?) |
| **Modularity** | ✅ High (add/remove agents easily) | ❌ Low (tightly coupled) |
| **Scalability** | ✅ Agents scale independently | ❌ All or nothing |
| **Maintenance** | ✅ Easy (update one agent) | ❌ Hard (update all LLMs) |
| **Speed** | ✅ Fast (specialized tools) | ❌ Slow (multiple LLM calls) |

---

## Answer to Your Questions

### 1. Should we use another LLM to implement intent classification?

**Answer**: Yes, but as an **MCP agent**, not a separate competing LLM.

- Orchestrator: `gpt-4o-mini` (conversation flow)
- Intent Classifier Agent (MCP): `embeddings` OR `gpt-4o-mini` (fast classification)

### 2. Should we implement in MCP tool?

**Answer**: **YES** ✅

- Each specialized capability = separate MCP server
- Orchestrator calls MCP agents via standardized protocol
- "Agent-as-a-Tool" pattern (industry standard)

### 3. Should we form multi-agent architecture?

**Answer**: **YES** ✅ (with orchestrator still in control)

- Single orchestrator decides WHAT to do
- MCP agents execute HOW to do it
- Best of both worlds: coordination + specialization

### 4. Should we replace orchestrator?

**Answer**: **NO** ❌

- Evolve current orchestrator to use MCP agents
- Keep conversation flow logic centralized
- Add agent delegation via MCP protocol

---

## Next Steps

1. **This Week**: Implement Intent Classifier as MCP agent
2. **Next Week**: Add Product Recommender MCP agent
3. **Week 3**: Order Manager + Checkout agents
4. **Week 4**: Test multilingual + optimize performance

**Final Architecture**: Hybrid multi-agent with single orchestrator (industry best practice) ✅
