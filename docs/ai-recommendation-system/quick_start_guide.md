# COVE AI - Quick Start Guide

## 🚀 Getting Started with Multi-Agent AI

### Prerequisites
- Backend running on port 8001
- Frontend running on port 3000
- Database populated with products
- `.env` configured with `GEN_MODEL=openrouter/openai/gpt-4o-mini`

---

## 📝 Try These Queries

### 1. Simple Product Search
```
"show me hoodies"
```
**What happens:**
- Intent: recommendations
- Single-agent flow
- Returns: 6 matching hoodies

### 2. Complete Outfit Request
```
"I need a complete outfit for a job interview, budget €250"
```
**What happens:**
- Intent: outfit_builder  
- Multi-agent orchestrator activated
- StylistAgent → FitAgent → BudgetAgent
- Returns: Complete coordinated outfit

### 3. Size Question
```
"I'm 180cm and 75kg, what size hoodie should I get?"
```
**What happens:**
- Intent: size_help
- FitAgent activated
- Returns: Size M with 85% confidence

### 4. Budget Query
```
"What can I get for €100?"
```
**What happens:**
- Intent: discover with price filter
- BudgetAgent filters products
- Returns: Items within budget + discount tips

### 5. Unavailable Product (Honesty Test)
```
"show me a tuxedo"
```
**What happens:**
- ProductAvailabilityChecker validates
- Returns: Honest "we don't have that" message
- Suggests alternatives

### 6. Typo Handling
```
"show me hoddie"  (typo)
```
**What happens:**
- Fuzzy matching corrects to "hoodie"
- Returns: 6 hoodies

### 7. Non-existent Product
```
"show me a shrug"
```
**What happens:**
- Vocabulary-aware: "shrug" not in catalog
- NO false corrections (won't show shirts)
- Returns: Honest message

---

## 🎯 What to Watch For

### Visible Thinking
Look for these indicators in the UI:
```
🧠 Understanding your request...
🔍 Searching 247 products...
✨ Building complete outfit...
💰 Finding best discounts...
```

### Tool Usage
Check the debug panel or console for:
```
{
  "tools_used": [
    "hybrid_search",
    "stylist_agent",
    "fit_agent", 
    "budget_agent"
  ]
}
```

### Multi-Agent Coordination
When multiple agents work together, you'll see:
```
🎯 Routing to Agent Orchestrator
   ↓
   StylistAgent: Finding items...
   FitAgent: Analyzing sizes...
   BudgetAgent: Optimizing price...
```

---

## 🔧 Configuration

All agent behavior is in JSON configs:

```bash
# Edit agent rules
nano data/stylist_config.json       # Occasion rules
nano data/fit_agent_config.json     # Brand sizing
nano data/budget_agent_config.json  # Discounts

# Restart to apply changes
# (or wait for hot-reload if configured)
```

---

## 🧪 Testing

### Run Full Test Suite
```bash
# Availability tests
.venv/bin/python3 tests/test_availability_comprehensive.py

# Multi-agent tests
.venv/bin/python3 tests/test_phase2_multi_agent.py

# Fuzzy matching tests
.venv/bin/python3 tests/test_fuzzy_suits.py
```

### Expected Results
- Availability: 4/4 passing
- Multi-agent: 12/17 passing (70.6%)
- Fuzzy matching: All passing

---

## 🐛 Troubleshooting

### "No items found" for everything
**Check:**
1. Database has products: `SELECT COUNT(*) FROM ai_products;`
2. Vocab cache loaded: Look for log `📚 [VOCAB] Loaded X colors`
3. Search index working: Check logs for search errors

### Multi-agent not triggering
**Check:**
1. Query includes "complete outfit" or "I need"
2. Intent classification logs show `outfit_builder`
3. Orchestrator config exists: `data/orchestrator_workflows.json`

### Wrong sizes recommended
**Check:**
1. `data/fit_agent_config.json` has brand sizing rules
2. User history (if any) is formatted correctly
3. FitAgent logs show confidence scores

### Budget not optimized
**Check:**
1. `data/budget_agent_config.json` has discount codes
2. Order total meets minimum for discounts
3. BudgetAgent logs show discount discovery

---

## 📊 Monitoring

### Key Metrics to Watch

**Response Times:**
- Simple search: < 2 seconds
- Complete outfit: < 5 seconds
- Size recommendation: < 1 second

**Accuracy:**
- Intent classification: > 90%
- Size confidence: > 70% average
- Budget adherence: 100%

**Error Rate:**
- System crashes: 0%
- Graceful degradation: 100%

---

## 💡 Pro Tips

1. **Use specific occasions** for better outfit suggestions:
   - ✅ "job interview"
   - ✅ "wedding guest"
   - ❌ "something nice"

2. **Include budget** for optimization:
   - ✅ "around €250"
   - ✅ "under €150"
   - ❌ "cheap"

3. **Be precise with sizes** for better recommendations:
   - ✅ "I'm 180cm and 75kg"
   - ✅ "I usually wear M"
   - ❌ "medium-ish"

4. **Test edge cases** to see robustness:
   - Nonsense queries
   - Impossible budgets (€0)
   - Non-existent products

---

## 🚀 Next Steps

1. Try all demo queries above
2. Review logs to understand agent coordination
3. Modify a config file and see behavior change
4. Create custom workflows in `orchestrator_workflows.json`
5. Add new agents to `app/agents/` (they auto-register!)

---

## 📚 Further Reading

- [Multi-Agent System Documentation](./multi_agent_system.md)
- [Investor Demo Script](./investor_demo_script.md)
- [Agentic Enhancement Strategy](./agentic_enhancement_strategy_2024.md)
- [Phase 2 Test Results](../../cove-ai-core/tests/phase2_config_validation.md)
