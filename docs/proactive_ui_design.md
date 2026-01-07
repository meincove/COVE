# Proactive UI Design: The "Floating Bubble" 💬

**User Request:** "Chatbox shouldn't open every time... chat button extends and shows the message."

**Solution:** We will implement a **Floating Bubble Notification** (also known as a "Toast" or "Pill") that hovers above the closed chat launcher.

## 1. Visual Behavior
*   **State A (Idle):** Normal Chat Icon (Launcher).
*   **State B (Proactive Trigger):**
    *   A sleek bubble fades in *above* or *next to* the launcher.
    *   Content: "Psst... Nike items are 20% off right now! 👀"
    *   Animation: Spring-based entry (framer-motion).
    *   Sound: Optional subtle "pop" (muted by default).
*   **State C (User Interaction):**
    *   **Click Bubble:** Opens full chat window with that specific context focused.
    *   **Ignore:** Bubble auto-dismisses after 10-15 seconds (to be non-annoying).
    *   **Close (x):** User manually dismisses.

## 2. Component Structure
We will create a new component `ProactiveBubble.tsx` inside `CoveChatWidget`.

```typescript
// Proposed Component API
<ProactiveBubble
  message="You're €10 away from free shipping!"
  isVisible={hasProactiveMessage && !isChatOpen}
  onOpenChat={() => setIsChatOpen(true)}
  onDismiss={() => dismissMessage()}
/>
```

## 3. Styling (Tailwind + Framer Motion)
*   **Position:** Absolute, `bottom-20 right-0` (anchored to launcher).
*   **Style:** Glassmorphism or solid brand color match.
*   **Typography:** Small, punchy text. Emoji support.

## 4. Updates to Strategy
*   **Old Plan:** `setIsOpen(true)` (Auto-open chat).
*   **New Plan:** `setProactiveBubble(message)` (Show bubble). Only open chat if user clicks the bubble.

This ensures we are **helpful**, not **harassing**.
