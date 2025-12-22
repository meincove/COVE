# Hardcoding Audit Report - Dec 21, 2024

## 🔍 Found Hardcoded Values

### ⚠️ CRITICAL - Needs Config Migration

#### 1. **Type Normalization Map** - app/routes/rag.py (Lines 792-810)
```python
# HARDCODED type mappings
catalog_types = {
    "shirt": "tee",
    "shirts": "tee",
    "tshirt": "tee",
    # ... more mappings
}
```
**Impact**: Adding new product types requires code change  
**Recommendation**: Move to `data/type_normalization_config.json`

#### 2. **Default Product Type Fallback** - app/routes/rag.py (Line 1252)
```python
product_type = (attrs.get("types") or ["hoodie"])[0]  # ❌ Hardcoded "hoodie"
```
**Impact**: Always falls back to "hoodie" when no type detected  
**Recommendation**: Load default from config or use most common catalog type

#### 3. **Model Defaults** - Multiple Files
Files with hardcoded model fallbacks:
- `app/services/conversation_manager.py:78` - `"openrouter/anthropic/claude-3.5-sonnet"`
- `app/agents/preference_extractor.py:29` - `"openrouter/anthropic/claude-3.5-sonnet"`
- `app/agents/occasion_analyzer.py:25` - `"openrouter/anthropic/claude-3.5-sonnet"`
- `app/agents/visual_validator.py:24` - `"openrouter/openai/gpt-4o"`
- `app/agents/knowledge_agent.py:26` - `"openrouter/anthropic/claude-3.5-sonnet"`

✅ **ProductAvailabilityChecker** - NOW USES GEN_MODEL (Fixed today!)  
⚠️ **Others** - Still hardcoded, should use GEN_MODEL from env

---

### ✅ ACCEPTABLE - Examples/Documentation Only

These are in docstrings, test files, or comments - OK to keep:
- Test files (test_*.py) - intentionally hardcoded for test scenarios
- Docstring examples - illustrative only
- User message templates - part of UX copy

---

## 📋 Recommendations

### Priority 1: Create Type Normalization Config
```json
// data/type_normalization_config.json (NEW)
{
  "type_synonyms": {
    "tee": ["shirt", "shirts", "tshirt", "tshirts", "t-shirt", "t-shirts", "top"],
    "sweater": ["knit", "knits"],
    "hoodie": ["sweatshirt", "hoody"],
    "bomber": ["jacket"],
    "blazer": ["suit jacket"]
  },
  "default_type": "tee",  // Fallback when no type detected
  "load_from_catalog": true  // Auto-discover from database
}
```

### Priority 2: Centralize Model Configuration
All agents should use this pattern:
```python
def __init__(self, model: Optional[str] = None):
    self.model = model or os.getenv("GEN_MODEL", "openrouter/openai/gpt-4o-mini")
```

---

## 🧪 Test Coverage Gaps

### Missing Comprehensive Tests:
1. **Empty catalog scenarios** - What happens if no products match?
2. **Malformed queries** - Very long queries, special characters, unicode
3. **Edge case colors** - Partial matches, multiple colors, complex color names
4. **Concurrent requests** - Multiple users querying simultaneously
5. **Database failures** - Graceful degradation when DB is down
6. **LLM timeout/failures** - ProductAvailabilityChecker resilience
7. **Cache edge cases** - Stale data, cache misses, race conditions

### Test Suite Needed:
- `tests/test_type_normalization.py` - Comprehensive type mapping tests
- `tests/test_edge_cases_brutal.py` - Malformed input, unicode, edge cases
- `tests/test_error_handling.py` - DB failures, LLM failures, timeouts
- `tests/test_concurrent_load.py` - Load testing, race conditions
- `tests/test_cache_behavior.py` - Vocab cache, search cache behavior

---

## ✅ Good Practices Found

These are **correctly config-driven**:
- ✅ Fuzzy matching (data/fuzzy_matching_config.json)
- ✅ Intent classification (data/intent_classification_config.json)
- ✅ Orchestrator workflows (data/orchestrator_workflows.json)
- ✅ Color synonyms (app/routes/rag.py:COLOR_SYNONYMS) - extracted from database!

---

## Action Items

### Immediate (Today/Tomorrow):
- [ ] Create type_normalization_config.json
- [ ] Update type normalization to load from config
- [ ] Centralize model config for remaining agents
- [ ] Remove "hoodie" hardcoded default fallback

### This Week:
- [ ] Create comprehensive edge case test suite
- [ ] Test error handling (DB, LLM failures)
- [ ] Test with malformed/unicode queries
- [ ] Load testing for concurrent requests

### Nice to Have:
- [ ] Auto-discover product types from database
- [ ] Dynamic type synonym learning from user queries
- [ ] A/B test different default types
