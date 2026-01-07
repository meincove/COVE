# User Intelligence Layer Implementation

## Goal
Track & learn user preferences from queries:
- **Guests**: Session accumulator (lightweight, in-memory)
- **Signed-in**: LLM fact extraction → Django AiUserProfile
- **Verifier**: Gets user profile for personalized suggestions

---

## Current State
- ✅ `_trigger_fact_extraction_background()` - LLM fact extraction (exists)
- ✅ `store_facts()` / `get_facts()` - Django API client (exists)
- ❌ Session accumulator for guests (missing)
- ❌ Verifier doesn't receive user profile (missing)

---

## Proposed Changes

### 1. [MODIFY] [session_state.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/services/session_state.py)
Add entity accumulator for guests:
```python
_SESSION_ACCUMULATED_PROFILE: Dict[str, Dict[str, Any]] = {}

def accumulate_entities(body, entities: Dict) -> None:
    """Track entities from each query (sizes, colors, styles, etc.)"""

def get_accumulated_profile(body) -> Dict[str, Any]:
    """Get inferred profile from accumulated entities"""
```

---

### 2. [MODIFY] [agent.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py)
After each query (around line 1340):
```python
# Accumulate entities for session intelligence
SessionStateManager.accumulate_entities(body, numeric_filters)
```

---

### 3. [MODIFY] [verifier.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/mcp_agents/verifier/verifier.py)
Pass user profile to Verifier prompt:
```python
USER PROFILE:
- Gender: male
- Preferred size: XL
- Style: minimalist
- Budget: under €100
```

This enables Verifier to suggest: "Try XL" or "Under budget, add to cart?"

---

## Verification Plan

### Existing Tests
```bash
# E2E fact extraction test
PYTHONPATH=. python tests/test_fact_extraction_e2e.py
```

### Manual Test
1. Start servers: `uvicorn` and `python manage.py runserver 8001`
2. Open frontend
3. As guest: "show me mens XL hoodies" → Check log for `👤 [GENDER] Stored`
4. Follow-up: "show me jackets" → Check log uses stored gender
5. Verify Verifier uses profile in suggestions
