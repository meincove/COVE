# Proactive Agent Implementation Plan

## 1. File Structure
*   `app/agents/proactive_agent.py`: Core logic class.
*   `data/proactive_offers.json`: Config file (Created).
*   `app/routes/events.py`: New endpoint for receiving frontend signals.

## 2. Signal Processing (`app/routes/events.py`)
We need an endpoint `POST /ai/events` that accepts:
```json
{
  "signal": "VIEW_BRAND",
  "context": {
    "brand": "nike",
    "url": "/brand/nike",
    "time_on_page": 0
  },
  "user_id": "...",
  "session_id": "..."
}
```

## 3. Agent Logic (`app/agents/proactive_agent.py`)
The `ProactiveAgent` class will:
1.  Load `proactive_offers.json`.
2.  Maintain (or access) a simple in-memory or Redis-based state of user visits (for `min_visits` tracking).
    *   *Note: For MVP, we might trust the frontend to send `visit_count` in the context.*
3.  Match signals to rules.
    *   `if signal == 'VIEW_BRAND' and brand in offers:` check conditions.
4.  Return a "Proactive Action" if matched.

## 4. Response Format
The API should return:
```json
{
  "triggered": true,
  "message": "...",
  "priority": 10
}
```

## 5. Frontend Integration
The frontend will poll this endpoint or receive the response immediately after sending the signal.
If `triggered: true`, the `CoveChatWidget` will display the message as an incoming "Assistant" message.
