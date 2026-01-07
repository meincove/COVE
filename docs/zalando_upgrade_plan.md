# Zalando-Style Architecture Upgrade Plan

## Goal
Transform the search pipeline from "Filter-Based" to "Context-Aware Hybrid Search" to match Zalando's architecture.

## 1. The "Context Translator" (The "Brain")
Zalando doesn't just search for keywords; they translate *intent* into *attributes*.

### [NEW] `app/agents/context_translator.py`
Create a lightweight LLM agent that runs *before* search.
- **Input**: User query ("wedding in Santorini") + User Profile
- **Output**: `SearchStrategy` JSON
  ```json
  {
    "semantic_query": "elegant resort wear summer wedding guest dress",
    "required_filters": {"category": ["dresses", "suits"]},
    "attribute_boosts": ["linen", "silk", "breathable"],
    "visual_vibe": "boho chic"
  }
  ```

### [MODIFY] `app/routes/agent.py`
- Replace simple `build_rec_query` with `ContextTranslator`.
- Pass `SearchStrategy` to the search engine.

## 2. Profile-Based Search Boosting (The "Ranker")
Wire up the `UserIntelligence` profile directly into the search ranking (currently it's just a verification suggestion).

### [MODIFY] `app/vector/personalized_search.py`
- Update `personalized_search` to accept `user_profile` (gender, size, price affinity).
- **Implementation**:
    - If `profile.avg_price_max < 80`: Boost items < €80.
    - If `profile.preferred_color == "black"`: Boost items with `color="black"`.
    - Apply these as *soft boosts* to the RRF score, not hard filters (so we don't hide other valid options).

## 3. Dynamic Hybrid Weights (The "Engine")
Zalando tunes search based on query type.

### [MODIFY] `app/vector/hybrid_search.py`
- Accept `strategy` param.
- **Exact SKU / Product Name**: Boost BM25 (Keyword) weight (`0.8 vs 0.2`).
- **Vibe / Occasion**: Boost Vector weight (`0.8 vs 0.2`).

## Verification Plan

### Test Script: `tests/test_zalando_upgrade.py`
1. **Context Test**: Query "summer wedding" -> Verify `semantic_query` adds "formal", "guest", "lightweight".
2. **Personalization Test**: 
   - Set Session Profile: `price_affinity: budget`.
   - Query "jeans" -> Verify expensive jeans are ranked lower than budget jeans.
3. **Hybrid Tuning**:
   - Query "SKU-123" -> Verify BM25 takes precedence.
   - Query "romantic vibes" -> Verify Vector takes precedence.
