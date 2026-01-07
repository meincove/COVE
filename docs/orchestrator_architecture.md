# 🎯 Multi-Model Architecture: Orchestrator Pattern

## ⚠️ **The Concern (Valid!)**

**Problem:** Using multiple LLMs typically causes:
- Context fragmentation (each model has partial history)
- Inconsistent responses (models don't know what others said)
- Token waste (duplicating context across models)
- Complexity (managing multiple conversation threads)

**Solution:** **Single Orchestrator Pattern** ✅

---

## 🏗️ **Architecture: One Brain, Multiple Tools**

```
┌─────────────────────────────────────────────────────────────┐
│                    CONVERSATION HISTORY                      │
│  [User: "Build outfit for wedding"]                         │
│  [Orchestrator: "What's your budget?"]                      │
│  [User: "€200"]                                             │
│  [Orchestrator: "Analyzing options..."]                     │
│  ← MAINTAINED BY ORCHESTRATOR ONLY                          │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              ORCHESTRATOR (Claude 3.5 Sonnet)               │
│  • Owns ALL conversation state                              │
│  • Maintains user context & history                         │
│  • Makes all decisions                                      │
│  • Delegates SPECIFIC tasks to workers                      │
│  • Aggregates results                                       │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │  GPT-4o  │        │GPT-4o-mini│       │ Embeddings│
    │ (Vision) │        │(Profiling)│       │  (Vector) │
    └──────────┘        └──────────┘        └──────────┘
    Stateless           Stateless           Stateless
    Worker              Worker              Worker
```

---

## 💡 **How It Works:**

### **1. Orchestrator = Single Source of Truth**

```python
class OutfitBuilderOrchestrator:
    """Claude 3.5 Sonnet - owns ALL context"""
    
    def __init__(self):
        self.model = Claude35Sonnet()
        self.conversation_history = []  # ONLY place history lives
        self.user_context = {}          # User preferences, past actions
        
        # Workers are TOOLS, not conversationalists
        self.vision_tool = GPT4o()
        self.profiler_tool = GPT4oMini()
        self.vector_tool = VectorStore()
    
    async def process_message(self, user_message: str):
        """Main entry point - orchestrator processes everything"""
        
        # Add to history (orchestrator owns this)
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        # Orchestrator analyzes intent with FULL CONTEXT
        response = await self.model.chat({
            "messages": self.conversation_history,  # Full history
            "system": """You're a fashion stylist orchestrator.
            
            You have access to these tools:
            1. analyze_outfit_images(images) - Vision analysis
            2. extract_user_preferences(text) - Profile building
            3. search_similar_items(query) - Vector search
            
            Use tools as needed, but YOU maintain conversation."""
        })
        
        # If orchestrator decides to use a tool, call it
        if response.tool_calls:
            for tool_call in response.tool_calls:
                if tool_call.name == "analyze_outfit_images":
                    # STATELESS call - no history shared
                    result = await self.vision_tool.analyze(
                        images=tool_call.args["images"],
                        criteria=tool_call.args["criteria"]
                        # NO CONVERSATION HISTORY PASSED
                    )
                    
                    # Orchestrator gets result back
                    tool_result = {"name": tool_call.name, "result": result}
                    
                    # Orchestrator continues with result
                    final_response = await self.model.chat({
                        "messages": self.conversation_history + [
                            {"role": "assistant", "tool_calls": [tool_call]},
                            {"role": "tool", "content": str(tool_result)}
                        ]
                    })
        
        # Add orchestrator response to history
        self.conversation_history.append({
            "role": "assistant",
            "content": final_response.content
        })
        
        return final_response
```

**Key Points:**
- ✅ **History lives in ONE place** (orchestrator's `conversation_history`)
- ✅ **Workers are stateless** (no memory between calls)
- ✅ **Workers don't see conversation** (just specific task data)
- ✅ **Orchestrator aggregates everything**

---

## 🔧 **Worker Tools Are Stateless**

### **Vision Worker (GPT-4o)**
```python
class VisionWorker:
    """Stateless image analysis - no conversation memory"""
    
    async def analyze_outfit_coherence(
        self,
        images: List[str],
        criteria: str
    ) -> Dict:
        """
        Single-shot analysis, no history needed.
        
        Args:
            images: List of product image URLs
            criteria: What to evaluate (color, style, formality)
            
        Returns:
            {confidence: 94, reasoning: "Navy and grey complement..."}
        """
        # NO ACCESS TO CONVERSATION HISTORY
        # Just does ONE JOB with given inputs
        
        response = await gpt4o.chat({
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Analyze outfit: {criteria}"},
                    *[{"type": "image_url", "url": img} for img in images]
                ]
            }],
            "max_tokens": 500  # Short, focused response
        })
        
        return parse_vision_result(response)
```

**Why this works:**
- GPT-4o doesn't need conversation history
- It's doing pure image analysis
- Results go back to orchestrator who maintains context

### **Profiler Worker (GPT-4o-mini)**
```python
class ProfilerWorker:
    """Stateless preference extraction"""
    
    async def extract_preferences(self, text: str) -> Dict:
        """
        Extract structured preferences from text.
        
        Args:
            text: User statement like "I hate hoodies, love navy"
            
        Returns:
            {
                "dislikes": ["hoodies"],
                "color_preferences": ["navy"],
                "fit_preferences": []
            }
        """
        # NO CONVERSATION HISTORY NEEDED
        # Just parse one piece of text
        
        response = await gpt4o_mini.chat({
            "messages": [{
                "role": "user",
                "content": f"Extract preferences: {text}"
            }],
            "response_format": {"type": "json_object"}
        })
        
        return json.loads(response.content)
```

---

## 🎯 **Comparison: Wrong vs Right**

### **❌ WRONG: Multiple LLMs with Shared History**

```python
# BAD - Each model tries to maintain conversation
async def build_outfit_wrong(user_message: str, history: List):
    # Step 1: Route intent (GPT-4o-mini)
    intent = await gpt4o_mini.chat({
        "messages": history + [{"role": "user", "content": user_message}]
    })
    # GPT-4o-mini now thinks it's in a conversation
    
    # Step 2: Reason about fashion (Claude)
    plan = await claude.chat({
        "messages": history + [{"role": "user", "content": user_message}]
        # Claude has DIFFERENT understanding of conversation state!
    })
    
    # Step 3: Visual matching (GPT-4o)
    match = await gpt4o.chat({
        "messages": history + [{"role": "user", "content": user_message}]
        # GPT-4o has YET ANOTHER view of conversation!
    })
    
    # Problem: Who responds to user? Whose history is correct?
    # All three models are confused about conversation state!
```

**Problems:**
- 3x token usage (full history to each model)
- Inconsistent context (models disagree on state)
- Who owns the conversation? Chaos!

### **✅ RIGHT: Single Orchestrator + Stateless Tools**

```python
# GOOD - One orchestrator, stateless workers
class OutfitOrchestratorV2:
    def __init__(self):
        self.claude = Claude35Sonnet()    # OWNS conversation
        self.history = []                 # SINGLE source of truth
        
    async def build_outfit(self, user_message: str):
        # Add to history
        self.history.append({"role": "user", "content": user_message})
        
        # Orchestrator reasons with FULL context
        response = await self.claude.chat({
            "messages": self.history,
            "tools": [
                {
                    "name": "analyze_images",
                    "description": "Get visual coherence score",
                    "parameters": {"images": "list", "criteria": "string"}
                },
                {
                    "name": "extract_preferences",
                    "description": "Parse user preferences",
                    "parameters": {"text": "string"}
                }
            ]
        })
        
        # If Claude wants to use tools
        if response.tool_calls:
            for call in response.tool_calls:
                if call.name == "analyze_images":
                    # Stateless worker call
                    result = await gpt4o.analyze_images(
                        images=call.args["images"],
                        criteria=call.args["criteria"]
                        # No history passed!
                    )
                elif call.name == "extract_preferences":
                    result = await gpt4o_mini.extract_preferences(
                        text=call.args["text"]
                        # No history passed!
                    )
                
                # Claude gets result, continues reasoning
                # (with full context still intact)
        
        # Add Claude's response to history
        self.history.append({"role": "assistant", "content": response.content})
        return response
```

**Benefits:**
- ✅ Single conversation thread (Claude owns it)
- ✅ Workers are called like functions (stateless)
- ✅ No context duplication
- ✅ Clear ownership

---

## 📊 **Context Management Strategy**

### **What Orchestrator Maintains:**
```python
{
    "conversation_history": [
        {"role": "user", "content": "Build outfit for wedding"},
        {"role": "assistant", "content": "What's your budget?"},
        {"role": "user", "content": "€200"},
        {"role": "assistant", "content": "Analyzing options..."}
    ],
    "user_profile": {
        "preferences": {"colors": ["navy"], "dislikes": ["patterns"]},
        "past_purchases": [...],
        "body_measurements": {...}
    },
    "current_task": {
        "type": "outfit_builder",
        "occasion": "wedding",
        "budget": 200,
        "status": "in_progress"
    }
}
```

### **What Workers Get (Stateless):**
```python
# Vision worker only gets:
{
    "images": ["url1.jpg", "url2.jpg"],
    "criteria": "Analyze color harmony and style coherence"
}

# Profiler worker only gets:
{
    "text": "I prefer navy and hate patterns"
}

# NO CONVERSATION HISTORY!
```

---

## 🎯 **Final Architecture Recommendation**

### **Orchestrator (Maintains ALL State):**
**→ Claude 3.5 Sonnet**

**Why:**
- Best reasoning (complex fashion decisions)
- Best context understanding (200k tokens!)
- Handles nuance ("business casual for conservative firm")
- Can use tools effectively

**Responsibilities:**
- Maintain conversation history
- Understand user intent
- Make all decisions
- Call workers as needed
- Synthesize results
- Respond to user

### **Worker 1: Vision Analysis (Stateless)**
**→ GPT-4o**

**Task:** Analyze images for outfit coherence  
**Input:** Images + criteria  
**Output:** Confidence score + reasoning  
**No history needed!**

### **Worker 2: Preference Extraction (Stateless)**
**→ GPT-4o-mini**

**Task:** Parse user preferences from text  
**Input:** Single statement  
**Output: ** Structured JSON  
**No history needed!**

### **Worker 3: Embeddings (Stateless)**
**→ text-embedding-3-small**

**Task:** Generate vectors for similarity search  
**Input:** Product description  
**Output:** Vector (1536 dimensions)  
**No history needed!**

---

## 💰 **Cost per Conversation**

```
User builds outfit over 5 messages:

Message 1: "Build outfit for wedding"
- Claude (orchestrator): 100 tokens in, 50 out = $0.0015

Message 2: "€200 budget, prefer navy"
- Claude: 200 tokens in, 100 out = $0.0045
- Profiler (GPT-4o-mini): 20 tokens in, 50 out = $0.00001

Message 3: "Show me options"
- Claude: 300 tokens in, 150 out = $0.0090
- Vector search (embeddings): $0.0001
- Product retrieval: (database, free)

Message 4: "Do these match?"
- Claude: 400 tokens in, 200 out = $0.0180
- Vision (GPT-4o): 3 images + 100 tokens = $0.15

Message 5: "Perfect, I'll buy them"
- Claude: 500 tokens in, 100 out = $0.0210

Total: ~$0.20 per 5-message conversation
```

**But orchestrator maintains perfect context throughout!**

---

## ✅ **Summary: Why This Works**

1. **ONE orchestrator** (Claude 3.5) maintains ALL conversation state
2. **Workers are stateless tools** - called like functions
3. **No context duplication** - history lives in one place
4. **Clear ownership** - orchestrator decides everything
5. **Specialized excellence** - each model does what it's best at
6. **Cost effective** - only orchestrator sees full context

**This is the pattern enterprises use!** (LangChain agents, OpenAI Assistants, etc.)

**Not multiple LLMs fighting - ONE brain with specialized tools!** 🧠
