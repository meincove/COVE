# Phase 2: Multi-Agent System + Outfit Builder
**Status:** In Planning  
**Duration:** 2-3 weeks  
**Priority:** ⭐⭐⭐ **HIGH** - Foundation for all future agentic features  
**Previous:** Phase 1 (Visible Thinking) ✅ Complete

---

## 🎯 Goals

### Business Goals
1. **↑ 3-4x items per transaction** (outfit vs single item)
2. **↑ 40% conversion rate** (decision made easier)
3. **↑ AOV from €60 → €200+** (complete outfits)
4. **Wow investors** with truly agentic behavior

### Technical Goals
1. Build scalable multi-agent architecture
2. Implement agent registry (zero hardcoding)
3. Create specialized agents (stylist, fit, budget)
4. Deploy first multi-agent workflow: **Outfit Builder**
5. Set foundation for Phase 3 (proactive features)

---

## 🏗️ Architecture Overview

### Current State (Phase 1 ✅)
```
User Query → Agent → Tools → Response
             ↓
        Thinking Display
        (Shows reasoning)
```

### Target State (Phase 2)
```
User Query → Orchestrator (Supervisor)
                    ↓
         ┌──────────┼──────────┐
         ↓          ↓          ↓
    Stylist     Fit Agent  Budget
     Agent                   Agent
         ↓          ↓          ↓
    [Product]  [Size Rec] [Price Opt]
         └──────────┼──────────┘
                    ↓
            Complete Outfit
                    ↓
            Thinking Display
         (Shows which agent did what)
```

**Key Difference:** Specialized agents working together, visible to user!

---

## 📦 Deliverables Summary

**Week 1:** Agent Registry + Stylist Agent  
**Week 2:** Fit + Budget Agents + Orchestrator  
**Week 3:** Frontend Integration + Launch

**First Feature:** Outfit Builder (uses all 3 agents)

---

## 🗓️ Detailed Timeline

### Week 1: Foundation (Dec 13-19)

#### Day 1-2: Agent Registry
**Files to Create:**
- `app/core/agent_registry.py`
- `app/agents/base_agent.py`
- `tests/test_agent_registry.py`

**Tasks:**
- Implement dynamic agent registration
- Create base agent class with standard interface
- Add agent discovery by capabilities
- Unit tests (80%+ coverage)

---

#### Day 3-4: Stylist Agent
**Files to Create:**
- `app/agents/stylist_agent.py`
- `tests/test_stylist_agent.py`

**Capabilities:**
- Parse occasion/style from natural language
- Multi-category product search (tops, bottoms, shoes)
- Style compatibility rules
- Budget-aware selection

**Test Cases:**
```
"business casual for meeting" → blazer + tee + chinos
"date night outfit under €150" → shirt + jeans + shoes
"gym clothes comfortable" → hoodie + joggers
```

---

### Week 2: Specialized Agents + Orchestrator (Dec 20-26)

#### Day 1: Fit Agent
**Files to Create:**
- `app/agents/fit_agent.py`
- `tests/test_fit_agent.py`

**Capabilities:**
- Check size availability
- Analyze user size history
- Detect brand-specific sizing
- Provide size recommendations with confidence scores

---

#### Day 2: Budget Agent
**Files to Create:**
- `app/agents/budget_agent.py`
- `tests/test_budget_agent.py`

**Capabilities:**
- Optimize outfit within budget
- Find applicable discount codes
- Calculate free shipping opportunities
- Suggest cheaper alternatives if over budget

---

#### Day 3-4: Orchestrator
**Files to Create:**
- `app/agents/orchestrator.py`
- `data/agent_workflows.json`
- `tests/test_orchestrator.py`

**Capabilities:**
- Detect outfit-building queries
- Plan multi-agent execution sequence
- Delegate to specialized agents
- Synthesize results
- Stream thinking events (Phase 1 integration!)

**Workflow Definition:**
```json
{
  "outfit_builder": {
    "trigger_patterns": ["outfit", "complete look", "what to wear"],
    "steps": [
      {"agent": "stylist", "required": true},
      {"agent": "fit", "required": false},
      {"agent": "budget", "required": true}
    ]
  }
}
```

---

### Week 3: Integration + Polish (Dec 27-Jan 2)

#### Day 1-2: Frontend Components
**Files to Create:**
- `frontend/src/components/cove-ai/OutfitCard.tsx`
- `frontend/src/components/cove-ai/OutfitGrid.tsx`

**Files to Modify:**
- `frontend/src/components/cove-ai/CoveChatWidget.tsx`
- `frontend/types/agent.ts`

**Features:**
- Display complete outfits with images
- "Add All to Cart" functionality
- Individual item customization
- Show price breakdown
- Thinking display integration

---

#### Day 3: Backend Endpoint
**Files to Create:**
- `app/routes/outfits.py`

**Endpoint:** `POST /ai/outfits/build`
```typescript
Request: {
  query: "business casual for client meeting",
  budget_max: 300,
  preferences?: {
    style?: "minimalist" | "streetwear" | "professional",
    colors?: string[],
    avoid_brands?: string[]
  }
}

Response: {
  kind: "outfit_recommendations",
  outfits: [
    {
      id: string,
      name: string,
      total: number,
      items: Product[],
      reasoning: string,
      thinking_events: ThinkingEvent[],
      tools_used: ToolUsage[]
    }
  ]
}
```

---

#### Day 4: End-to-End Testing
- Complete user flow testing
- Performance optimization (target < 5s)
- Edge case handling
- Error scenarios

---

#### Day 5: Launch Prep
- Documentation updates
- Investor demo script
- Monitoring/analytics setup
- Deployment to staging

---

## 🎬 Example User Experience

**User types:** "I need an outfit for a startup pitch next week, budget €300"

**Thinking Display:**
```
🧠 Understanding request... 95%
   Intent: outfit_builder → startup_pitch

🎨 Stylist Agent: Building outfit...
   Occasion: business + approachable
   Categories: blazer, tee, chinos, accessories
   Tools: hybrid_search (4 queries, 67 products)
   Selected 4 items ✓

📏 Fit Agent: Checking sizes...
   User history: M in all brands
   All items available in M
   Confidence: 95% ✓

💰 Budget Agent: Optimizing price...
   Subtotal: €335 (€35 over)
   Found: STARTUP15 (-15%)
   Final: €285 (€15 under budget!)
   Free shipping: Yes ✓
```

**Agent Response:**
```
I've built you a complete pitch-ready outfit! 🚀

Outfit: Founder's Look (€285)

┌─────────────────────────────────┐
│ 🧥 NordicThread Navy Blazer     │
│ €140 - Professional, versatile  │
│                                  │
│ 👕 COVE Casual White Tee        │
│ €25 - Approachable, pairs well  │
│                                  │
│ 👖 ModernHeritage Grey Chinos   │
│ €85 - Smart casual              │
│                                  │
│ 🔗 TimelessCo Leather Belt      │
│ €35 - Completes the look        │
└─────────────────────────────────┘

Total: €335 €285 with STARTUP15
Savings: €50 + Free Shipping

Perfect balance: professional for VCs,
casual for startup culture.

[Add All to Cart] [See Other Outfits] [Customize]
```

**Time:** Query → Complete Outfit in ~30 seconds!

---

## 🔧 Technical Implementation

### Agent Registry Pattern
```python
# app/core/agent_registry.py

class AgentRegistry:
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
    
    def register(self, agent: Agent):
        """Auto-discovers agents at startup"""
        self.agents[agent.name] = agent
    
    def find_capable_agents(self, task: str) -> List[Agent]:
        """Matches agents to tasks by capabilities"""
        return [a for a in self.agents.values()
                if any(cap in task.lower() for cap in a.capabilities)]
```

### Base Agent Class
```python
# app/agents/base_agent.py

class BaseAgent(ABC):
    @abstractmethod
    async def execute(self, task: Dict, context: Dict) -> AgentResult:
        """Standard interface for all agents"""
        pass
```

### Stylist Agent (Example)
```python
# app/agents/stylist_agent.py

class StylistAgent(BaseAgent):
    async def execute(self, task, context):
        # Parse query
        occasion, style = self._parse_query(task["query"])
        
        # Search per category
        outfit = []
        for category in ["top", "bottom", "shoes"]:
            results = await hybrid_search(f"{style} {category}")
            outfit.append(results[0])
        
        return AgentResult(
            success=True,
            data={"outfit_items": outfit},
            reasoning=f"Selected items for {occasion}",
            confidence=0.9
        )
```

---

## 📊 Success Metrics

### Development Metrics
- [ ] Agent registry supports 3+ agents
- [ ] Orchestrator coordinates workflows
- [ ] Response time < 5 seconds
- [ ] Test coverage 80%+
- [ ] Phase 1 thinking integrated

### Business Metrics (Post-Launch)
- **Target:** 40%+ conversion on outfit queries
- **Target:** 3x+ items per transaction
- **Target:** €200+ AOV
- **Target:** 60%+ user satisfaction

---

## 🚨 Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Slow response time | Parallel agent execution, caching |
| Complex style rules | Start simple, iterate |
| Budget math difficult | Greedy algorithm first |
| Too many outfit options | Limit to top 3 |

---

## ✅ Definition of Done

Phase 2 complete when:
- [x] **THIS IS A CHECKBOX**
- [ ] Agent registry operational
- [ ] 3 specialized agents working
- [ ] Orchestrator coordinates workflows
- [ ] Outfit builder end-to-end functional
- [ ] Frontend displays outfits beautifully
- [ ] Thinking display integrated
- [ ] Response time < 5s
- [ ] Tests pass (80%+ coverage)
- [ ] Investor demo ready

---

## 🔄 What's Next: Phase 3

**Proactive Engagement** (uses Phase 2 agents!)
- "Welcome back! New items match your style"
- "Complete this outfit with..."
- Price drop alerts on wishlisted outfits
- Seasonal wardrobe suggestions

---

**Ready to make COVE truly agentic!** 🚀
