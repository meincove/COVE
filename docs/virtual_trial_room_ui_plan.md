# Virtual Trial Room UI: The "Canvas" Concept 🎨

## Core Philosophy
We are moving away from a standard "chat list" and building a **Dynamic Canvas**. The chat remains on the left (or bottom on mobile), but the center stage is a **Visual Workspace** where outfits come to life.

## 1. The Layout: "The Super-Modal" (Expandable Widget)
- **Default State**: The familiar **Floating Chat Bubble** in the corner.
- **Active State**: When an outfit is generated, the widget **expands** into a large, centered modal overlay (90% screen width).
  - **Left Panel (35%)**: The Chat (maintains context).
  - **Right Panel (65%)**: **The Trial Room Canvas** (slides in).
- **Behavior**: This is **amodal** in spirit—you never leave the current page. It's a "temporal workspace" that appears when needed and collapses back to the bubble when done.

## 2. Key Components

### A. The "Magic Manifestation" Animation ✨
When the AI generates an outfit, it doesn't just "appear." It **manifests**:
1.  **Phase 1: The Blueprint (Skeleton)**
    - Faint outlines of the items appear first.
    - Providing immediate visual feedback that "something big is coming."
2.  **Phase 2: The Materialization (Streaming)**
    - Images fade in one by one.
    - "Searching for matching shoes..." toast appears briefly.
3.  **Phase 3: The Polish (Fact Check)**
    - A subtle checkmark or "sparkle" effect scans the outfit (VisualValidator running).
    - If valid: "Stylist Approved" badge appears.

### B. Interactive Outfit Cards
Each item in the canvas is a "Smart Card":
- **Hover**: Shows price, brand, and "Swap" button.
- **Click**: Opens a mini-drawer with alternatives ("Here are 3 other beige chinos").
- **Action**: "Shop this look" button bundles everything to cart.

### C. The "Vibe" Toggle
A floating control to quickly shift the context without typing:
- [☀️ Day] / [🌙 Night]
- [Briefcase Work] / [🎉 Party]
- **Effect**: Instantly regenerates the outfit while keeping the "core" user style.

## 3. Tech Stack Update
- **Framework**: Next.js (Existing)
- **State**: React Query + Zustand (for Canvas state)
- **Animation**: Framer Motion (Crucial for the "premium" feel)
- **Drag & Drop**: dnd-kit

## 4. Work Breakdown (Phase 3)
1.  **Setup**: Install Framer Motion, dnd-kit.
2.  **Visuals**: Build the `OutfitCanvas` component.
3.  **Logic**: Connect `useChat` to the Canvas state (Streaming JSON).
4.  **Polish**: Add the "Magic Manifestation" animations.
