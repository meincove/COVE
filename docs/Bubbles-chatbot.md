# Bubbles Chatbot UI Redesign

Complete UI redesign of the COVE chatbot to match the clean, minimal MusicBed aesthetic. Named "Bubbles" with expandable status indicators and a light theme.

## Overview

- **Framer Motion**: ✅ Already installed (`framer-motion@12.23.26`)
- **Backend Unchanged**: All backend logic stays 100% untouched

---

## Design Comparison

| Current | New (Bubbles) |
|---------|---------------|
| Dark purple/pink gradients | Clean white/light gray |
| Header with tabs | Centered "Bubbles" pill (expandable) |
| View tabs in header | View tabs as pills at bottom |
| Dark message bubbles | White cards with subtle shadows |
| Complex input styling | Minimal white input bar |
| No footer branding | "Powered by CoveAI" footer |

---

## Components to Modify

### 1. FloatingChatbot.tsx
- Simplify floating button (no glow effects)
- White background container
- Replace header with centered "Bubbles" status pill
- Move view tabs to bottom (below input)
- Add "Powered by CoveAI" footer

### 2. BubblesStatusPill.tsx (NEW)
- Centered header pill with "Bubbles" logo
- Expands to show thinking steps when AI is processing
- Framer Motion animations
- Thumbs up/down feedback buttons

### 3. CoveChatWidget.tsx
- Light background container
- User messages: Dark pill on right
- Assistant messages: White card with shadow on left
- Clean white input area

### 4. PersonalizedGreeting.tsx
- Light theme card styling
- User info display (Name, Email card)
- Remove purple/pink gradients

### 5. ChatProductCard.tsx
- Light background cards
- Subtle shadows instead of dark overlays

---

## Final Layout

```
┌─────────────────────────────────────────┐
│         🫧 Bubbles                       │  ← Header Pill
├─────────────────────────────────────────┤
│                                         │
│  [Messages area]                        │
│                                         │
├─────────────────────────────────────────┤
│ [+] Write a message...        [😊] [↑] │  ← Input
├─────────────────────────────────────────┤
│   💬 Chat    👔 Outfit Builder   🛒 Cart │  ← View Tabs
├─────────────────────────────────────────┤
│         Powered by 🫧 CoveAI            │  ← Footer
└─────────────────────────────────────────┘
```

---

## Implementation Order

1. BubblesStatusPill.tsx - Create new component
2. FloatingChatbot.tsx - Major restructure
3. CoveChatWidget.tsx - Theme changes only
4. PersonalizedGreeting.tsx - Light theme
5. ChatProductCard.tsx - Light theme
6. Add Framer Motion animations

---

## Verification

1. Visual comparison with MusicBed reference
2. Test all chat modes (Chat, Outfit Builder, Cart)
3. Verify backend functionality still works
4. Test on different screen sizes
