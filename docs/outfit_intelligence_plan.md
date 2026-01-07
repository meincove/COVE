# Deep Outfit Intelligence Plan

## Goal
Upgrade the `OutfitBuilderAgent` to use **Vector Semantics** for compatibility checking. Instead of just "Black matches everything", it will measure "Do these items share the same visual vibe?".

## 1. Upgrade `OutfitBuilderAgent` (`app/agents/outfit_builder_agent.py`)

### A. Fetch Embeddings
- **Action**: In `execute()`, extract all unique `slugs` from the candidates.
- **Action**: Fetch embeddings for all these slugs in one batch (or loop) using `get_product_embedding_by_slug`.
- **Why**: We need vectors to compute distances.

### B. Implement `_calculate_semantic_compatibility`
- **Logic**:
    - Compute **Cosine Similarity** between `Candidate Item` and `Current Outfit Items`.
    - **Scoring**:
        - `Similarity > 0.8`: **+20 points** (Strong Vibe Match).
        - `Similarity > 0.7`: **+10 points** (Good Match).
        - `Similarity < 0.5`: **-10 points** (Style Clash).
    - **Reasoning**: "Visually cohesive with {other_item}".

### C. Refine `_calculate_compatibility`
- Combine `Rule-Based Score` (Colors) + `Semantic Score` (Vectors).
- **Formula**: `Final Score = (RuleScore * 0.4) + (VectorScore * 0.6)`.

## 2. New Endpoint: `POST /ai/recs/complete-look` (`app/routes/recs.py`)
- **Input**: `anchor_slug` (The item the user wants to style).
- **Process**:
    1. Retrieve Anchor Item.
    2. Determine Occasion/Category from Anchor (e.g. if Dress -> Event).
    3. Call `StylistAgent` (which calls `OutfitBuilder`) with the Anchor as a pre-selected item.
    4. Return the complete outfit.

## Verification
- **Script**: `tests/test_outfit_intelligence.py`
    - **Test**: Pick a "Boho Dress".
    - **Expect**: Outfit Builder selects "Sandals" (High Vibe Match) over "Combat Boots" (Low Vibe Match), even if both are "Black".
