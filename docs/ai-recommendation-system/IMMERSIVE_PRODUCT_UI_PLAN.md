# Immersive Product UI Redesign Plan

## Goal
Transform the current vertical stack of large product cards into a space-efficient, "mesmerizing" horizontal carousel that fits naturally within the chat interface while maintaining a premium feel.

## User Review Required
> [!IMPORTANT]
> This change will modify the `ChatProductCard` component significantly to fit a carousel layout. It will also introduce a new `ProductCarousel` container.

## Proposed Changes

### Frontend Components

#### [NEW] `src/components/cove-ai/ProductCarousel.tsx`
A new container component that:
- Handles horizontal scrolling with CSS scroll snapping (`snap-x`).
- Manages "active" state for the centered card (optional 3D effect).
- Hides scrollbars for a clean look (`scrollbar-hide`).
- Adds "peek" effect for next/prev items.

#### [MODIFY] `src/components/cove-ai/ChatProductCard.tsx`
- **Dimensions:** Change from full-width landscape/large card to a fixed width (e.g., `w-64`) portrait card.
- **Layout:**
  - Full-height image background with gradient overlay (like TikTok/Stories).
  - Text and actions overlaid at the bottom.
  - "Like" button floating top-right.
- **Interactions:**
  - Hover: Slight scale up (`scale-105`), image zoom.
  - Click: Open product details (existing behavior).

#### [MODIFY] `src/components/cove-ai/CoveChatWidget.tsx`
- Replace the mapping of `ChatProductCard` with the new `ProductCarousel` component when rendering `recommendations` metadata.

## Visual Design (Tailwind)
- **Carousel Container:** `flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 py-2 scrollbar-hide`
- **Card:** `snap-center shrink-0 w-60 h-80 rounded-3xl overflow-hidden relative group`
- **Animations:** `transition-all duration-500 ease-out`

## Verification Plan
1.  **Visual Check:** Verify the carousel scrolls smoothly and snaps to items.
2.  **Responsiveness:** Ensure it works on mobile (touch scroll) and desktop (trackpad/mouse wheel).
3.  **Interactions:** Verify "Add to Cart" and "Like" buttons work within the new layout.
