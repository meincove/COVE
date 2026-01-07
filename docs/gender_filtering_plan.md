# Gender Filtering Implementation Plan

## Goal
Add gender-aware product filtering throughout the system (male, female, unisex) without hardcoding.

## Current State
- ✅ **Intent Classifier** extracts `gender` entity from queries
- ✅ **Database** has `gender` field in product metadata
- ❌ **RecsFilters** model missing `gender` field
- ❌ **Filter logic** doesn't filter by gender
- ❌ **No prompt** to ask user for gender if unknown

---

## Proposed Changes

### 1. [MODIFY] [RecsFilters](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/recs.py#L33-40)
Add `gender` field to the filter model:
```python
gender: Optional[str] = None  # male, female, unisex
```

### 2. [MODIFY] [_matches_filters](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/recs.py#L280-333)
Add gender check using the existing config-driven filter map pattern:
- If `gender` filter is set, match against product's `gender` field
- `unisex` products should match ANY gender query (male or female)

### 3. [MODIFY] [agent.py - rec_filters](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py)
Pass extracted `gender` entity from Intent Classifier to `RecsFilters`:
```python
rec_filters["gender"] = numeric_filters.get("gender")  # from entities
```

### 4. [MODIFY] [agent.py - Gender Prompt Logic]
Add logic to **ask for gender** if:
- No gender in query
- No gender in user profile (ai_profile)
- No gender in session state

Use LLM-style follow-up (not hardcoded): "What gender are you shopping for?"

### 5. [MODIFY] [SessionStateManager](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/services/session_state.py)
Add gender persistence in session state so we don't ask repeatedly.

---

## Verification Plan

### Automated Tests
1. Run existing tests to ensure no regressions:
   ```bash
   PYTHONPATH=. pytest tests/ -v 2>&1 | head -100
   ```

### Manual Verification
1. Start the frontend and backend
2. Ask "show me hoodies" → System should ask "Shopping for men's, women's, or unisex?"
3. Reply "mens" → Should filter to male products only
4. Ask "show me dresses" (follow-up) → Should remember gender preference

---

## Risks & Mitigations
- **Risk**: Gender field empty in DB → **Mitigation**: Treat empty as "unisex"
- **Risk**: Over-filtering removes good results → **Mitigation**: Unisex products always included
