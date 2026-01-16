# Chatbot UI Fixes - MusicBot Style Alignment

> Reference: LiveChat/MusicBot design vs current Bubbles chatbot

---

## Batch 1: Header & Background (High Priority)

### 1.1 Simplify Header Bar
**Current:** `←` + trash + minimize + `×` with gray background  
**Target:** Minimal header - just `←` on left, `—` and `×` on right, no background color

**Files:** `FloatingChatbot.tsx`
- Remove trash icon from header
- Remove gray background (`bg-gray-50/80`)
- Keep only: Back arrow (left), Minimize + Close (right)
- Add subtle bottom border instead

### 1.2 Clean Chat Background  
**Current:** Gray-ish with image bleeding through top  
**Target:** Pure white/off-white background, no image bleed

**Files:** `FloatingChatbot.tsx`, `CoveChatWidget.tsx`
- Set solid `bg-white` on chat container
- Remove/adjust blur zone that may be causing transparency
- Ensure no content bleeds through header area

---

## Batch 2: Message Bubbles (High Priority)

### 2.1 Elevate Assistant Bubbles
**Current:** Flat white with thin gray border, minimal depth  
**Target:** White with soft shadow, no border, card-like feel

**Files:** `CoveChatWidget.tsx`
- Remove `border border-gray-200` from assistant messages
- Add `shadow-sm` or `shadow` for elevation
- Increase border-radius (more rounded)

### 2.2 User Message Styling
**Current:** Black/dark green background  
**Target:** Keep dark but ensure consistency with reference

**Files:** `CoveChatWidget.tsx`
- Verify rounded corners match reference
- Slight shadow on user bubbles too

---

## Batch 3: Message Spacing & Typography (Medium Priority)

### 3.1 Increase Vertical Spacing
**Current:** Messages feel cramped  
**Target:** More breathing room between messages

**Files:** `CoveChatWidget.tsx`
- Increase `gap` or `mb` between message bubbles
- Add more padding inside bubbles

### 3.2 Typography Adjustments
**Current:** 13px compact  
**Target:** Slightly larger, more readable

**Files:** `CoveChatWidget.tsx`
- Increase font size from 13px to 14px
- Increase line-height

---

## Batch 4: Input Bar (Medium Priority)

### 4.1 Input Area Styling
**Current:** Has `+` icon, emoji, green circular send button  
**Target:** Cleaner look with subtle top separator

**Files:** `FloatingChatbot.tsx`
- Add subtle top border/shadow to input area
- Consider adjusting send button styling
- Keep functionality, just visual polish

---

## Batch 5: Status Pill Refinement (Low Priority)

### 5.1 Pill Design
**Current:** Green square + "Bubbles" text  
**Target:** Black circle with logo + Name + Subtitle

**Files:** `BubblesStatusPill.tsx`
- Add subtitle "ChatBot" below "Bubbles"
- Consider black circle logo instead of green square
- Add more prominent shadow

---

## Implementation Order

| Batch | Focus | Est. Changes | Files |
|-------|-------|--------------|-------|
| **1** | Header + Background | 2 edits | FloatingChatbot.tsx |
| **2** | Message Bubbles | 2 edits | CoveChatWidget.tsx |
| **3** | Spacing + Typography | 2 edits | CoveChatWidget.tsx |
| **4** | Input Bar | 1 edit | FloatingChatbot.tsx |
| **5** | Status Pill | 1 edit | BubblesStatusPill.tsx |

---

## Visual Reference

The goal is to achieve a cleaner, more elevated design:
- **Minimalist header** (less icons, no background)
- **Elevated message cards** (shadows instead of borders)
- **More whitespace** (breathing room)
- **Cohesive styling** (consistent shadows, radii)
