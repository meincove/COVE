# Implementation Plan - UI Integration for Outfit Builder

## Goal
Connect the OutfitBuilder agent output to the React frontend so users see:
1. Live streaming updates (searching, candidates found, item selected)
2. Final outfit displayed as product cards with images, prices, and match reasons

## Current Data Flow (Verified ✅)
```
Backend Orchestrator → emit_event() → SSE Stream → Frontend useAgentStream → agenticEvents[]
                                                                              ↓
                                                      CoveChatWidget → handleAgentResponse()
```

## Issues Found

### 1. Frontend receives `agenticEvents` but doesn't render them
- The hook captures events but `CoveChatWidget` doesn't display them during streaming
- **Fix**: Add a UI component to show live exploration progress

### 2. Final outfit items may be missing `imageUrl`
- The `_extract_product_data` in StylistAgent now includes `color` but we should also verify `imageUrl` is passed
- **Verified**: Line 594 already extracts `imageUrl`

### 3. Outfit items displayed with `RecommendationsMeta`
- Backend returns `kind: "recommendations"` with outfit items
- Frontend shows product cards via `RecommendationsMeta`
- **Status**: Should work, but need to verify card rendering includes match reason

## Proposed Changes

### Frontend Changes

#### [MODIFY] [CoveChatWidget.tsx](file:///Users/ssg/Desktop/COVE/frontend/src/components/cove-ai/CoveChatWidget.tsx)
- Add display of `agenticEvents` during streaming (show "Searching Tops...", "Found 3 options")
- This gives users real-time feedback while outfit is being built

#### [VERIFY] Product Card Component
- Ensure product cards display `reason` field (e.g., "neutral match with Pants")
- Ensure `imageUrl` renders correctly

## Verification Plan
1. Open frontend at `localhost:3000`
2. Start an outfit builder conversation ("Casual weekend outfit under €500")
3. Observe streaming events appear in UI
4. Verify final outfit cards show:
   - Product image
   - Price
   - Match reason
