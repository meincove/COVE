# Zalando Phase 2: Outfit Intelligence & Visual Discovery

## Goal
Move beyond searching for *single items* to understanding *relationships between items*. This replicates Zalando's "Complete the Look" and "Similar Items" features using our new vector architecture.

## 1. Deep Outfit Intelligence (The "Stylist")
Currently, our `OutfitBuilderAgent` uses simple hardcoded color rules (e.g., "Black matches everything"). We will upgrade this to use **Vector Compatibility**.

### [MODIFY] `app/agents/outfit_builder_agent.py`
- **Feature**: `_calculate_semantic_compatibility`
- **Logic**:
    - Fetch embeddings for the candidate item and current outfit items.
    - Calculate **Style Distance**: Do these items belong to the same "vibe"?
    - **Cross-Category Vector Arithmetic**: `Dress Vector + Jacket Vector` affinity.
    - This allows detecting that a "Grunge Flannel" goes with "Distressed Jeans" even if color rules don't explicitly say so.

## 2. Visual Discovery ("See Similar")
A core Zalando feature is finding items that *look* like the one you're viewing, purely based on visual/semantic indicators.

### [NEW] `POST /ai/recs/similar`
- **Input**: `slug` (Product Slug)
- **Logic**:
    1. Get the target product's embedding.
    2. Perform a pure Vector Search (no keyword mixing) for `top_k=20`.
    3. Filter out the original item.
- **Value**: Allows "infinite scroll" of visually similar items (e.g., "Show me more floral sundresses like this one").

## 3. "Complete the Look" Endpoint
Expose the outfit logic as a direct API for the frontend (simulating the "Shop the Look" widget).

### [NEW] `POST /ai/recs/complete-look`
- **Input**: `anchor_slug` (The main item, e.g., a Dress)
- **Logic**:
    1. Trigger `StylistAgent` / `OutfitBuilderAgent`.
    2. Fix the Anchor Item.
    3. Find 1 matching Shoe, 1 matching Bag/Accessory.
    4. Return as a bundle.

## Roadmap
1. **Implement `similar` endpoint** (Low hanging fruit, high value).
2. **Upgrade `OutfitBuilder`** to use vectors (High complexity, high magic).
3. **Expose `complete-look`** API.
