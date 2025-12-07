# COVE AI Core - Tests

All test files for the COVE AI Core system.

## Running Tests

### Run All Tests
```bash
cd /Users/ssg/Desktop/COVE/cove-ai-core
python -m pytest tests/ -v
```

### Run Specific Test
```bash
python -m pytest tests/test_week6.py -v
python -m pytest tests/test_prompt_optimization.py -v
```

### Run Individual Test Files
```bash
cd /Users/ssg/Desktop/COVE/cove-ai-core
python tests/test_week6.py
python tests/test_mcp_routing.py
```

## Test Files

### Week 6 Tests
- **test_week6.py** - Comprehensive Week 6 test suite (MCP, caching, monitoring, streaming)
- **test_mcp_routing.py** - MCP client routing and feature flags
- **test_prompt_optimization.py** - Prompt optimization token savings

### Week 4-5 Tests
- **test_phase4_intents.py** - Intent classification tests
- **test_phase5_performance.py** - Performance benchmarks
- **test_history_direct.py** - Conversation history tests

### Tool Tests
- **test_email_tool.py** - Email tool functionality and examples

### Utilities
- **verify_refactor.py** - Code refactoring verification

## Test Coverage

- ✅ MCP error handling
- ✅ Response caching
- ✅ Monitoring endpoints  
- ✅ End-to-end streaming
- ✅ Prompt optimization
- ✅ Intent classification
- ✅ Tool routing

---

**Last Updated**: December 7, 2025
