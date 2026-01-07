# Stylist Agent Integration Plan
**Status:** Ready for Implementation  
**Based on:** Industry best practices + LangGraph patterns + COVE architecture  
**Goal:** Production-ready Stylist Agent with real product search

---

## 🔬 Research Summary

### Industry Best Practices (2024)

**Key Findings:**
1. **RAG is Standard** - Use Retrieval-Augmented Generation for product search
2. **Specialized Agents** - Each agent should have clear, single responsibility
3. **Error Handling** - Graceful degradation when products unavailable
4. **Context Awareness** - Remember user preferences across conversation
5. **Performance** - Target < 5s for outfit recommendations

**Architecture Pattern (LangGraph):**
```
User Query → Planner Agent → Product Search Agent → Preference Agent → Recommendation Agent
```

**COVE Implementation:**
```
User Query → Stylist Agent → /ai/recs/suggest → Filter/Rank → Return Outfit
```

---

## 📋 Current State Analysis

### What Works ✅
- Config-driven occasions/styles (`stylist_config.json`)
- Agent registry pattern
- Base agent with standard interface
- Session state management exists

### What's Missing ❌
- Real product search integration
- Empty result handling
- Budget constraint logic
- Item compatibility rules
- Comprehensive tests

---

## 🎯 Integration Goals

### Primary
1. **Real Product Search** - Use existing `/ai/recs/suggest` endpoint
2. **Category-based Search** - Search separately for tops, bottoms, shoes
3. **Budget Constraints** - Respect user's budget limit
4. **Error Handling** - Graceful handling of empty results

### Secondary
1. **Item Compatibility** - Basic color/style matching
2. **Performance** - < 3s for outfit building
3. **Test Coverage** - 80%+ unit test coverage

---

## 🔧 Technical Implementation

### Step 1: Product Search Integration

**Current Mock:**
```python
# Placeholder: will be replaced with actual product search
outfit_items.append({
    "product": {"id": f"mock_{category}_001", "price": 50}
})
```

**Target Implementation:**
```python
# Use existing _call_recs_suggest function
search_result = await _call_recs_suggest({
    "message": f"{style} {category} for {occasion}",
    "clerkUserId": context.get("user_id"),
    "filters": {
        "type": category,
        "price_max": remaining_budget
    },
    "top_k": 5  # Get top 5 candidates per category
})

if search_result.get("items"):
    best_item = search_result["items"][0]
    outfit_items.append({
        "category": category,
        "product": best_item,
        "reason": self._get_selection_reason(...)
    })
```

**Why `_call_recs_suggest`?**
- Already exists in `agent.py`
- Uses COVE's recommendation engine
- Returns properly formatted product data
- Respects user history and preferences

---

### Step 2: Error Handling Strategy

**Failure Scenarios:**

| Scenario | Handling Strategy | Fallback |
|----------|------------------|----------|
| No products found for category | Skip category, try alternatives | Return partial outfit |
| All categories empty | Return AgentResult with success=False | Suggest broadening search |
| Over budget | Find cheaper alternatives | Reduce categories |
| API timeout | Retry once, then fail gracefully | Generic error message |
| Invalid category | Use closest valid category | Default to "top" |

**Implementation:**
```python
class StylistAgent(BaseAgent):
    async def execute(self, task, context):
        outfit_items = []
        errors = []
        
        for category in categories:
            try:
                items = await self._search_category(
                    category, 
                    occasion, 
                    style, 
                    remaining_budget
                )
                
                if items:
                    outfit_items.append(items[0])
                else:
                    errors.append(f"No {category} found")
                    
            except Exception as e:
                log.error(f"Search failed for {category}: {e}")
                errors.append(f"Search error: {category}")
        
        # Success if we got at least 2 items
        success = len(outfit_items) >= 2
        
        # Adjust confidence based on completeness
        confidence = len(outfit_items) / len(categories)
        
        return AgentResult(
            success=success,
            data={"outfit_items": outfit_items},
            reasoning=self._build_reasoning(outfit_items, errors),
            confidence=confidence,
            errors=errors if errors else []
        )
```

---

### Step 3: Budget Constraint Logic

**Algorithm: Greedy with Priority**

```python
def _apply_budget_constraints(
    self,
    items_by_category: Dict[str, List[Product]],
    budget: float
) -> List[Product]:
    """
    Select items that maximize value within budget.
    
    Priority:
    1. Core items (top, bottom) - required
    2. Accessories (shoes, belt) - optional
    3. Extras (jacket, hat) - nice-to-have
    """
    
    # Priority categories
    core = ["top", "bottom"]
    accessories = ["shoes", "belt"]
    extras = ["jacket", "hat", "accessories"]
    
    selected = []
    remaining = budget
    
    # Step 1: Select core items (cheapest within quality)
    for cat in core:
        if cat in items_by_category:
            # Get cheapest that's still 50%+ of budget per item
            affordable = [
                item for item in items_by_category[cat]
                if item["price"] <= remaining * 0.5
            ]
            if affordable:
                best = affordable[0]  # Already sorted by relevance
                selected.append(best)
                remaining -= best["price"]
    
    # Step 2: Add accessories if budget allows
    for cat in accessories:
        if cat in items_by_category and remaining > 30:
            affordable = [
                item for item in items_by_category[cat]
                if item["price"] <= remaining * 0.3
            ]
            if affordable:
                selected.append(affordable[0])
                remaining -= affordable[0]["price"]
    
    # Step 3: Add extras if budget allows
    for cat in extras:
        if cat in items_by_category and remaining > 50:
            affordable = [
                item for item in items_by_category[cat]
                if item["price"] <= remaining
            ]
            if affordable:
                selected.append(affordable[0])
                remaining -= affordable[0]["price"]
                break  # Only one extra
    
    return selected
```

---

### Step 4: Item Compatibility Rules (Basic)

**Color Compatibility Matrix** (from config):
```json
{
  "color_compatibility": {
    "black": ["white", "gray", "navy", "beige"],
    "navy": ["white", "gray", "beige", "brown"],
    "gray": ["white", "black", "navy", "blue"],
    "white": ["black", "navy", "gray", "brown", "blue"]
  }
}
```

**Style Compatibility:**
```json
{
  "style_compatibility": {
    "minimalist": {
      "colors": ["black", "white", "gray", "beige"],
      "avoid": ["neon", "bright"]
    },
    "professional": {
      "colors": ["navy", "gray", "white", "black"],
      "avoid": ["casual_prints"]
    }
  }
}
```

**Implementation:**
```python
def _check_compatibility(
    self,
    item1: Product,
    item2: Product,
    style: str
) -> float:
    """
    Return compatibility score 0.0-1.0.
    """
    score = 1.0
    
    # Color compatibility
    color1 = (item1.get("color") or "").lower()
    color2 = (item2.get("color") or "").lower()
    
    if color1 and color2:
        compatible_colors = self.config.get("color_compatibility", {}).get(color1, [])
        if color2 not in compatible_colors:
            score *= 0.7  # Reduce score for poor color match
    
    # Style compatibility
    style_rules = self.config.get("style_compatibility", {}).get(style, {})
    preferred_colors = style_rules.get("colors", [])
    
    if color1 and color1 not in preferred_colors:
        score *= 0.8
    if color2 and color2 not in preferred_colors:
        score *= 0.8
    
    return score
```

---

## 🧪 Testing Strategy

### Unit Tests (`tests/agents/test_stylist_agent.py`)

**Test Cases:**

1. **Occasion/Style Parsing**
   ```python
   def test_parse_query_meeting():
       agent = StylistAgent("test")
       occasion, style = agent._parse_query("business casual for client meeting")
       assert occasion == "meeting"
       assert style == "professional"
   ```

2. **Budget Constraints**
   ```python
   async def test_budget_constraint():
       agent = StylistAgent("test")
       result = await agent.execute(
           task={"query": "outfit for date", "budget_max": 100},
           context={}
       )
       total = result.data.get("total", 0)
       assert total <= 100
   ```

3. **Empty Results**
   ```python
   async def test_no_products_found():
       # Mock empty search results
       with patch('_call_recs_suggest', return_value={"items": []}):
           result = await agent.execute(...)
           assert not result.success
           assert len(result.errors) > 0
   ```

4. **Category Search**
   ```python
   async def test_multi_category_search():
       result = await agent.execute(
           task={"query": "casual outfit", "categories": ["top", "bottom", "shoes"]},
           context={}
       )
       categories_found = {item["category"] for item in result.data["outfit_items"]}
       assert len(categories_found) >= 2
   ```

### Integration Tests

1. **End-to-End Outfit Building**
   - Real database query
   - Real product search
   - Budget validation
   - Performance (<5s)

2. **Error Scenarios**
   - Database timeout
   - Empty product catalog
   - Network errors

---

## 📈 Performance Requirements

| Metric | Target | Critical |
|--------|--------|----------|
| Response Time | < 3s | < 5s |
| Success Rate | > 90% | > 70% |
| Budget Accuracy | 100% | 100% |
| Category Coverage | > 80% | > 50% |

**Optimization Strategies:**
- Parallel category searches (use `asyncio.gather`)
- Cache frequent searches (15min TTL)
- Limit search pool to top 5 per category
- Early termination if budget exceeded

---

## 🔒 Data & Security

**User Data Handling:**
- Use existing `context.get("user_id")` for personalization
- Don't expose internal product IDs in errors
- Respect user privacy settings

**Config Validation:**
- Validate `stylist_config.json` on load
- Fail fast if config invalid
- Provide clear error messages

---

## 📝 Documentation Requirements

### Code Documentation
```python
class StylistAgent(BaseAgent):
    """
    Stylist Agent: Builds complete outfits based on occasion and style.
    
    **Algorithm:**
    1. Parse occasion/style from natural language
    2. Search products per category using RAG
    3. Apply budget constraints
    4. Check item compatibility
    5. Return ranked outfit recommendations
    
    **Configuration:**
    Loads from data/stylist_config.json:
    - occasions: Keyword mappings
    - styles: Style rules
    - color_compatibility: Color pairing rules
    
    **Example:**
        agent = StylistAgent("stylist")
        result = await agent.run(
            task={"query": "business casual meeting", "budget_max": 300},
            context={"user_id": "user_123"}
        )
        
        outfit = result.data["outfit_items"]  # List of products
        total = result.data["total"]  # Total price
    """
```

### API Documentation
- Document `task` parameters
- Document `context` requirements
- Provide usage examples
- List error codes

---

## ✅ Definition of Done

Stylist Agent is complete when:

- [ ] Real product search integrated (`_call_recs_suggest`)
- [ ] Budget constraints enforced
- [ ] Empty result handling graceful
- [ ] Item compatibility basic rules applied
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests pass
- [ ] Performance < 3s average
- [ ] Documentation complete
- [ ] Config validation added
- [ ] Logging comprehensive

---

## 🚀 Implementation Order

### Phase 1: Core Integration (Day 1-2)
1. Integrate `_call_recs_suggest` for product search
2. Remove mock data
3. Basic error handling
4. Test with real database

### Phase 2: Budget & Logic (Day 3)
1. Implement budget constraint algorithm
2. Add item compatibility rules
3. Update config with color matrix
4. Test budget scenarios

### Phase 3: Testing & Polish (Day 4)
1. Write unit tests
2. Write integration tests
3. Performance optimization
4. Documentation
5. Code review

---

## 🎯 Success Criteria

**Technical:**
- All tests pass
- Performance targets met
- No hardcoded values
- Proper error handling

**Business:**
- Returns relevant outfits
- Respects budget
- Handles edge cases
- User-friendly error messages

**Code Quality:**
- Clean, readable code
- Well-documented
- Follows COVE patterns
- Passes code review

---

**Ready to implement with confidence!** 💯
