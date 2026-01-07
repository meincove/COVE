# 🌟 Legendary Proactive Agent Strategy (2025 Edition)

**Goal:** Create an AI that feels like a top-tier personal shopper who *anticipates* needs, rather than a bot that waits for commands.

**Status:** Planning Phase 3 (Proactive Engagement)

---

## 1. The Core Philosophy: "State-Aware & Event-Driven"

Most chatbots are **Reactive** (User types -> Bot replies).
We will build a **Proactive** system (User acts -> System signals -> Bot thinks -> Bot initiates).

### The "Legendary" Difference
| Feature | Standard Bot | Legendary COVE Agent |
| :--- | :--- | :--- |
| **Awareness** | Knows nothing until you type | Knows you're looking at "Nike Hoodies" right now |
| **Memory** | Forgets you after session | "Welcome back! Still interested in that bomber jacket?" |
| **Triggers** | None | "Psst... doing a 20% flash sale on the brand you're browsing." |
| **Style** | Generic "Can I help?" | Context-aware: "That earthy tone would match your previous purchases!" |

---

## 2. Architecture: Event-Driven Signal System

We need a realtime loop between the User's browser and the AI Brain.

```mermaid
graph TD
    User[User / Browser] -- 1. Navigates to /brand/nike --> Tracker[SignalTracker (Frontend)]
    Tracker -- 2. POST /ai/events (Signal: VIEW_BRAND, context: Nike) --> API[Backend Event Bus]
    API -- 3. Routes to --> ProactiveAgent[Proactive Agent 🧠]
    ProactiveAgent -- 4. Checks Context & Offers --> OffersDB[(Offers & Rules DB)]
    ProactiveAgent -- 5. Decides to Trigger --> Client[Chat Widget]
    Client -- 6. Shows Bubble --> Bubble["Floating Notification: 'Nike 20% off!' (Click to chat)"]
```

### 2.1 The Signals (Frontend)
The frontend needs to capture high-value signals:
*   `VIEW_BRAND`: User visits a brand collection page.
*   `VIEW_PRODUCT`: User dwells on a product page (> 10s).
*   `CART_IDLE`: User has items in cart but stops interacting (> 60s).
*   `SCROLL_DEPTH`: User scrolls to bottom of reviews (high intent).

### 2.2 The Offers Data (Backend)
To be "legendary", the agent needs *ammunition*—cool things to offer.
We will create a **Config-Driven Offer Engine** (`data/proactive_offers.json`):

```json
{
  "brand_offers": {
    "nike": {
      "trigger": "view_brand",
      "threshold_visits": 2,
      "message": "Big fan of Nike? We actually have a hidden 20% discount code: NIKE20",
      "action": "apply_discount"
    },
    "parada": {
        "trigger": "view_product",
        "message": "Since you like Prada, did you know we have their runway collection coming next week? Want a sneak peek?",
        "action": "show_sneak_peek"
    }
  },
  "cart_offers": {
     "near_free_shipping": {
        "condition": "cart_total > 80 AND cart_total < 100",
        "message": "You're only €{diff} away from free shipping. Want to see some socks?",
        "action": "recommend_fillers"
     }
  }
}
```

---

## 3. Implementation Roadmap

### Phase 3.1: The "Eyes" (Signal Tracker) - Day 1
*   Create `useProactiveSignals.ts` hook.
*   Track route changes (Next.js `usePathname`).
*   Send lightweight signals to `/ai/events`.

### Phase 3.2: The "Brain" (Proactive Logic) - Day 2
*   Create `ProactiveAgent`.
*   Implement `analyze_signal(signal: AgentSignal)`.
*   Connect to `offers.json` database.

### Phase 3.3: The "Voice" (UI Integration) - Day 3
*   Implement `ProactiveBubble` component (hovering pill/speech bubble).
*   **Crucial:** Do NOT auto-open the chat window.
*   Allow user to click the bubble to engage.

---

## 4. Why This is Better
*   **Privacy-First**: We track *session intent*, not creepy personal history.
*   **High Conversion**: Offers are contextually relevant (right brand, right time).
*   **Engagement**: Turns the chatbot into a helpful shopping assistant.

---

## 5. Next Steps
1.  Create `data/proactive_offers.json` with some juicy fake offers.
2.  Implementing `ProactiveAgent` in Python.
3.  Hooking up the frontend signal tracker.
