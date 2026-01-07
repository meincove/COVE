# Build Outfit Button Integration Plan

**Goal:** Connect "Build Outfit" button to multi-agent orchestrator for dedicated outfit building experience.

**Status:** Ready for Implementation

---

## Current State

**Frontend:**
- ✅ "Build Outfit" button exists in UI
- Location: Personal Stylist widget
- Current behavior: Unknown (needs investigation)

**Backend:**
- ✅ Multi-agent orchestrator implemented
- ✅ Workflow config: `outfit_builder`
- ✅ All 3 agents working (Stylist, Fit, Budget)
- ✅ Production tested (100% pass rate)

---

## Proposed User Experience

### Flow:

1. **User clicks "Build Outfit" button**
   ```
   Personal Stylist Widget
   ┌──────────────────────┐
   │  🎨 Build Outfit     │ ← Click
   └──────────────────────┘
   ```

2. **Opens dedicated chat mode**
   ```
   Chat switches to "Outfit Builder" mode
   - Shows greeting: "Hi! I'll help build your perfect outfit."
   - Prompts: "What's the occasion?"
   ```

3. **User describes occasion**
   ```
   User: "business casual for client meeting, budget €300"
   ```

4. **Multi-agent orchestrator executes**
   ```
   [Thinking visible]
   → Stylist: Finding outfit items...
   → Fit: Recommending sizes...
   → Budget: Optimizing pricing...
   ```

5. **Shows complete outfit**
   ```
   📦 Your Outfit (€280 total)
   
   1. Navy Blazer (€120)
      Size: M (recommended)
      Why: Professional and polished
   
   2. White Oxford Shirt (€80)
      Size: M 
      Why: Classic business look
   
   3. Chinos (€80)
      Size: 32/32
      Why: Comfortable and professional
   
   💰 Applied STARTUP15: Saved €45
   ✅ Within budget: €20 remaining
   
   [Add All to Cart] [Try Different Style]
   ```

---

## Implementation Plan

### 1. Backend: Create Orchestrator Endpoint

**New endpoint:** `/ai/outfit/build`

```python
# app/routes/outfit.py (NEW FILE)

from fastapi import APIRouter
from app.agents import orchestrator

router = APIRouter(prefix="/ai/outfit", tags=["outfit"])

@router.post("/build")
async def build_outfit(request: OutfitRequest):
    """
    Build complete outfit using multi-agent orchestrator.
    
    Triggers: Stylist → Fit → Budget agents
    """
    result = await orchestrator.execute_workflow(
        workflow_name="outfit_builder",
        query=request.query,
        context={
            "budget_max": request.budget_max,
            "user_id": request.user_id,
            "occasion": request.occasion,
            "style_preference": request.style
        }
    )
    
    return {
        "success": result["success"],
        "outfit_items": result["outfit_items"],
        "total": result["total"],
        "within_budget": result["within_budget"],
        "reasoning": result["reasoning"],
        "discount": result.get("discount_applied"),
        "agent_timings": result["agent_timings"]
    }
```

### 2. Frontend: Update Build Outfit Button

**Current (assumed):**
```tsx
// CoveChatWidget.tsx
<Button onClick={handleBuildOutfit}>
  🎨 Build Outfit
</Button>
```

**New:**
```tsx
const handleBuildOutfit = () => {
  // Set chat mode to outfit builder
  setChatMode("outfit_builder");
  
  // Send initial message
  sendMessage("I want to build an outfit");
  
  // Show outfit builder prompt
  setSystemMessage(
    "Hi! I'll help build your perfect outfit. " +
    "What's the occasion? (e.g., date night, business meeting, weekend casual)"
  );
};
```

### 3. Backend: Detect Outfit Builder Intent

**Modify:** `/ai/agent-stream` to detect outfit builder

```python
# app/routes/agent_stream.py

async def _agent_query_impl(...):
    # Check if multi-agent orchestrator should handle
    workflow = await orchestrator.should_handle(message)
    
    if workflow == "outfit_builder":
        # Use multi-agent orchestrator
        result = await orchestrator.execute_workflow(
            workflow_name=workflow,
            query=message,
            context={...}
        )
        
        # Format response with outfit items
        return _format_outfit_response(result)
    
    # Otherwise, use normal agent flow
    ...
```

### 4. Frontend: Display Outfit Results

**New component:** `OutfitDisplay.tsx`

```tsx
interface OutfitDisplayProps {
  items: OutfitItem[];
  total: number;
  discount?: Discount;
  reasoning: string;
}

function OutfitDisplay({ items, total, discount, reasoning }: OutfitDisplayProps) {
  return (
    <div className="outfit-display">
      <h3>Your Complete Outfit</h3>
      
      {items.map((item, i) => (
        <OutfitItemCard
          key={i}
          category={item.category}
          product={item.product}
          recommendedSize={item.recommended_size}
          reason={item.reason}
        />
      ))}
      
      <OutfitSummary
        total={total}
        discount={discount}
        reasoning={reasoning}
      />
      
      <div className="actions">
        <Button onClick={addAllToCart}>
          Add All to Cart
        </Button>
        <Button variant="secondary" onClick={tryAgain}>
          Try Different Style
        </Button>
      </div>
    </div>
  );
}
```

---

## Integration Points

### Option A: Dedicated Chat Mode (RECOMMENDED)

**Pros:**
- Clean UX - dedicated experience
- Can show outfit-specific UI
- Easy to add features (save outfits, compare options)

**Cons:**
- Need to manage chat modes

**Implementation:**
```tsx
type ChatMode = "normal" | "outfit_builder";

const [chatMode, setChatMode] = useState<ChatMode>("normal");

// When Build Outfit clicked
setChatMode("outfit_builder");

// Show different UI based on mode
{chatMode === "outfit_builder" ? (
  <OutfitBuilderChat />
) : (
  <NormalChat />
)}
```

### Option B: Same Chat, Special Trigger (SIMPLER)

**Pros:**
- No mode management
- Works with existing chat

**Cons:**
- Mixed context
- Harder to show outfit-specific UI

**Implementation:**
```tsx
// Just send a special message
const handleBuildOutfit = () => {
  sendMessage("build me an outfit");
};

// Backend detects trigger pattern
// Returns outfit in special format
```

---

## Recommended Approach

**✅ Option A + B Hybrid:**

1. Button sends: `"🎨 I want to build an outfit"`
2. Backend detects via `orchestrator.should_handle()`
3. Sets session flag: `outfit_builder_mode = true`
4. Frontend detects outfit response and shows `OutfitDisplay` component
5. User can continue chatting to refine ("more casual", "different colors")

**Benefits:**
- Simple to implement
- No major UI changes needed
- Works with existing chat stream
- Can enhance later with dedicated mode

---

## Implementation Steps

### Phase 1: Backend (2 hours)
1. Add orchestrator detection to `/ai/agent-stream`
2. Format outfit results for frontend
3. Test with existing chat interface

### Phase 2: Frontend (2 hours)
1. Update "Build Outfit" button handler
2. Create outfit display components
3. Handle "add all to cart" action

### Phase 3: Polish (1 hour)
1. Add loading states
2. Error handling
3. Refinement flow ("try again", "different style")

---

## Success Criteria

- [ ] Build Outfit button triggers orchestrator
- [ ] Multi-agent workflow executes
- [ ] Outfit displayed with all items
- [ ] Sizes recommended
- [ ] Discounts applied
- [ ] "Add all to cart" works
- [ ] Can refine/try again

---

## Zero Hardcoding ✅

All configuration-driven:
- Trigger patterns: `orchestrator_workflows.json`
- Agent logic: Individual configs
- No hardcoded outfit types

---

**Ready to implement!** 🚀
