# Intent Classification - Stress Test Queries

## Test Suite: Edge Cases & Challenging Scenarios

### Test Cases Run

| # | Query | Expected Intent | Challenge Type |
|---|-------|----------------|----------------|
| 1 | "cop this hoodie" | product_search | Slang ("cop" = buy/get) |
| 2 | "montre-moi des hoodies" | product_search | French language |
| 3 | "what size should i get if im 6 foot 2" | sizing_question | Complex size query with height |
| 4 | "lemme get some cheap tees under 30" | product_search | Informal + price filter |
| 5 | "add to my bag" | cart_addition | Alternative phrasing ("bag" not "cart") |
| 6 | "im ready to check out" | checkout_request | Informal checkout |
| 7 | "help me find something cool" | product_search | Vague request |
| 8 | "i need this" | cart_addition | Ambiguous context-dependent |

## Instructions

**Check your uvicorn terminal for 8 consecutive [INTENT_MONITOR] log lines.**

Look for:
```
🔍 [INTENT_MONITOR] query='...' | semantic='...' | mapped='...' | conf=XX.XX%
```

## Evaluation Criteria

- **High accuracy (90%+)**: 7-8 correct classifications → ✅ Move to Phase 2
- **Good accuracy (70-89%)**: 6 correct → 🔧 Minor prompt tuning needed
- **Needs work (<70%)**: ≤5 correct → 📝 Redesign prompts

## Next Steps After Review

1. Copy the 8 log lines from terminal
2. Compare actual vs expected intents
3. Calculate accuracy percentage
4. Decide: Phase 2 or iterate?
