# Implementation Plan - Outfit Matching & Robust Retrieval

## Goal
Enable the `OutfitBuilderAgent` to intelligently select items that "match" (e.g., color coordination) covering the user request to see "what goes with what". Additionally, improve `StylistAgent` to ensure candidates are actually found.

## User Review Required
> [!IMPORTANT]
> This changes the selection logic from "First within budget" to "Best Match within budget". It might increase processing time slightly due to scoring.

## Proposed Changes

### Stylist Agent (Retrieval)
#### [MODIFY] [stylist_agent.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/agents/stylist_agent.py)
- **Fallback Search**: If `_call_recs_suggest` returns 0 items with strict filters (Type + Color), automatically retry with **relaxed filters** (Type only).
- **Reasoning**: Ensures we pass candidates to the Builder even if the specific color is out of stock.

### Outfit Builder Agent (Assembly)
#### [MODIFY] [outfit_builder_agent.py](file:///Users/ssg/Desktop/COVE/cove-ai-core/app/agents/outfit_builder_agent.py)
- **Robust Compatibility Engine**: Implement a `_calculate_compatibility(item, current_outfit)` method.
    - **Features**:
        - **Color Intelligence**: Map 65+ colors to families (Neutral, Warm, Cool, Earth).
            - Rule: Neutrals match everything.
            - Rule: Monochromatic (Same Family) = High Score.
            - Rule: Complementary (Warm + Cool) = High Score (if not clashing).
            - Rule: Avoid Clashes (e.g. Brown + Black?? Controversial, but maybe neutral).
        - **Formality Matching**: Map types to levels (0=Sport, 1=Casual, 2=Smart Casual, 3=Formal).
            - Rule: Difference > 1 level = Penalty. (e.g. Joggers(0) + Blazer(2) = Bad).
    - **Scoring**:
        - Start at 0.
        - Budget Score (0-5): How well it utilizes remaining budget.
        - Color Score (-5 to +5).
        - Formality Score (-5 to +5).
    - **Selection**: Pick item with highest Total Score.
    - **Explanation**: Generate "Why" string (e.g. "Matches formatting of Blazer").

## Verification Plan
### Automated Tests
- Run `deep_debug_stylist.py`.
- Verify `Stylist` falls back if needed (Logs: "Retry without color...").
- Verify `OutfitBuilder` logs show "Scoring item X: Score Y".
- Verify final outfit has basic color coordination.
