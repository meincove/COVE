# Week 4 - Phase 4: Agent Integration Audit

**Date**: 2025-12-06  
**Status**: Audit Complete, Ready for Implementation

---

## 🔍 Audit Findings

### Current Agent Architecture

**Intent Classification**:
- Uses `classify()` from `/app/agent/orchestrator.py`
- Config-driven from `data/intent_config.json` 
- **FINDING**: No `intent_config.json` file exists yet
- Fallback intents: `discover`, `lookup_product`, `size_fit`, `policy`, `history_meta`, `generic`, `unknown`

**Tool Integration Pattern**:
```python
# Import pattern (line 28-30)
from app.cove_ai_tools import recommendations as tools_recs
from app.cove_ai_tools import size_fit as tools_size_fit
from app.cove_ai_tools import cart as tools_cart

# Usage pattern (line 732)
tool_resp = await tools_recs.recommend_products(tool_input)
```

**Cart Add Integration** (Existing Reference):
- Endpoint: `/ai/agent/cart_add` (line 1260)
- Uses `tools_cart.cart_add()` (line 1300)
- Has `_looks_like_cart_add()` detector (line 223)

---

## ⚠️ Issues Found

### Issue 1: Missing `intent_config.json`
**Severity**: MEDIUM  
**Impact**: Intent classification falls back to hardcoded defaults
**Files**: `data/` directory only has `regex_rules.json` and `search_config.json`
**Recommendation**: Create `intent_config.json` with all intents

### Issue 2: No Checkout/Order Intents
**Severity**: HIGH (for Phase 4)  
**Impact**: Agent cannot detect checkout or order queries
**Recommendation**: Add 3 new intents to config

### Issue 3: No Import for New Tools
**Severity**: HIGH  
**Impact**: Cannot use new tools (checkout, orders, emails)
**Recommendation**: Add imports in `agent.py`

---

## ✅ Recommended Implementation Plan

### Step 1: Create `intent_config.json`

**File**: `/Users/ssg/Desktop/COVE/cove-ai-core/data/intent_config.json`

```json
{
  "intents": [
    {
      "name": "checkout_start",
      "priority": 95,
      "keywords": [
        "checkout",
        "buy now",
        "proceed to payment",
        "pay for cart",
        "complete purchase",
        "go to checkout",
        "ready to pay"
      ]
    },
    {
      "name": "order_query",
      "priority": 90,
      "keywords": [
        "my orders",
        "order history",
        "last order",
        "previous purchase",
        "track order",
        "where is my order",
        "show orders",
        "order status"
      ]
    },
    {
      "name": "order_email",
      "priority": 85,
      "keywords": [
        "resend",
        "confirmation email",
        "receipt",
        "resend confirmation",
        "email receipt",
        "send me confirmation"
      ]
    },
    {
      "name": "discover",
      "priority": 80,
      "keywords": [
        "show me",
        "looking for",
        "find",
        "recommend",
        "suggest",
        "hoodie",
        "tee",
        "bomber",
        "jacket",
        "pants"
      ]
    },
    {
      "name": "size_fit",
      "priority": 75,
      "keywords": [
        "size",
        "fit",
        "what size",
        "sizing",
        "measurements",
        "will it fit",
        "too big",
        "too small"
      ]
    },
    {
      "name": "policy",
      "priority": 70,
      "keywords": [
        "return",
        "shipping",
        "delivery",
        "refund",
        "exchange",
        "policy",
        "how long",
        "when will"
      ]
    },
    {
      "name": "lookup_product",
      "priority": 65,
      "keywords": [
        "care",
        "wash",
        "material",
        "fabric",
        "shrink",
        "cotton",
        "quality"
      ]
    }
  ],
  "brand_aliases": ["cove", "cove ai"]
}
```

**Priority System**:
- Higher priority = matched first
- Checkout (95) beats orders (90) for overlapping keywords
- All commerce intents prioritized over discover

---

### Step 2: Add Tool Imports to `agent.py`

**File**: `/Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py`

**Add after line 30**:
```python
from app.cove_ai_tools import checkout as tools_checkout
from app.cove_ai_tools import orders as tools_orders
from app.cove_ai_tools import emails as tools_emails
```

---

### Step 3: Add Intent Handlers

**Add after existing cart_add handler** (~line 1260):

```python
# ========== CHECKOUT HANDLER ==========

@router.post("/ai/agent/checkout_start")
async def agent_checkout_start(body: AgentIn) -> Dict[str, Any]:
    """
    Initiate checkout for user's cart.
    """
    try:
        payload = {
            "clerkUserId": body.clerkUserId,
            "guestSessionId": body.guestSessionId,
            "email": body.email,
            "country": "DE",  # Default, could be from profile
            "shippingSpeed": "standard",
        }
        
        result = await tools_checkout.checkout_start(payload)
        
        if result.get("ok"):
            return {
                "kind": "checkout_link",
                "answer": f"Checkout ready! Click here to complete your purchase.",
                "paymentUrl": result["data"]["paymentUrl"],
                "total": result["data"].get("total", "0.00"),
            }
        else:
            return {
                "kind": "error",
                "answer": result.get("error", "Checkout failed. Please try again."),
            }
    
    except Exception as e:
        log.exception("checkout_start failed")
        return {
            "kind": "error",
            "answer": "Sorry, checkout is temporarily unavailable.",
        }


# ========== ORDER HISTORY HANDLER ==========

@router.post("/ai/agent/order_history")
async def agent_order_history(body: AgentIn) -> Dict[str, Any]:
    """
    Query user's order history.
    """
    try:
        payload = {
            "clerkUserId": body.clerkUserId,
            "guestSessionId": body.guestSessionId,
            "email": body.email,
            "limit": 5,
        }
        
        result = await tools_orders.order_get_status(payload)
        
        if result.get("ok"):
            orders = result["data"]["orders"]
            if not orders:
                return {
                    "kind": "answer",
                    "answer": "You don't have any orders yet. Ready to shop?",
                }
            
            # Format orders for display
            summary_lines = []
            for order in orders[:3]:  # Show max 3
                summary_lines.append(
                    f"Order #{order['orderId']}: €{order['total']} - "
                    f"{order['itemCount']} items - {order['status']}"
                )
            
            answer = "Here are your recent orders:\\n" + "\\n".join(summary_lines)
            
            return {
                "kind": "order_history",
                "answer": answer,
                "orders": orders,
            }
        else:
            return {
                "kind": "error",
                "answer": result.get("error", "Couldn't fetch orders."),
            }
    
    except Exception as e:
        log.exception("order_history failed")
        return {
            "kind": "error",
            "answer": "Sorry, couldn't retrieve your orders.",
        }


# ========== EMAIL RESEND HANDLER ==========

@router.post("/ai/agent/resend_email")
async def agent_resend_email(orderId: int, body: AgentIn) -> Dict[str, Any]:
    """
    Resend order confirmation email.
    """
    try:
        payload = {
            "orderId": orderId,
            "forceResend": False,
        }
        
        result = await tools_emails.email_send_order_confirmation(payload)
        
        if result.get("ok"):
            data = result["data"]
            if data["alreadySent"]:
                answer = f"Confirmation was already sent to {data['sentTo']}."
            else:
                answer = f"Confirmation email sent to {data['sentTo']}!"
            
            return {
                "kind": "answer",
                "answer": answer,
            }
        else:
            return {
                "kind": "error",
                "answer": result.get("error", "Couldn't send email."),
            }
    
    except Exception as e:
        log.exception("resend_email failed")
        return {
            "kind": "error",
            "answer": "Sorry, couldn't resend confirmation.",
        }
```

---

### Step 4: Update Main Agent Logic

**In `/ai/agent/chat` endpoint**, add handling for new intents:

**Around line 1131** (after size_fit check):

```python
# CHECKOUT intent
if intent_kind == "checkout_start":
    checkout_result = await agent_checkout_start(body)
    return AgentOut(
        kind=checkout_result.get("kind", "answer"),
        answer=checkout_result.get("answer", ""),
        citations=[],
        items=[],
        debug_plan={"intent_kind": "checkout_start"},
    )

# ORDER HISTORY intent
if intent_kind == "order_query":
    history_result = await agent_order_history(body)
    return AgentOut(
        kind=history_result.get("kind", "answer"),
        answer=history_result.get("answer", ""),
        citations=[],
        items=[],
        debug_plan={"intent_kind": "order_query", "order_count": len(history_result.get("orders", []))},
    )

# EMAIL RESEND intent
if intent_kind == "order_email":
    # Need to determine which order - default to last
    history_result = await agent_order_history(body)
    if history_result.get("ok") and history_result.get("orders"):
        last_order_id = history_result["orders"][0]["orderId"]
        email_result = await agent_resend_email(last_order_id, body)
        return AgentOut(
            kind=email_result.get("kind", "answer"),
            answer=email_result.get("answer", ""),
            citations=[],
            items=[],
            debug_plan={"intent_kind": "order_email"},
        )
    else:
        return AgentOut(
            kind="error",
            answer="No orders found to resend confirmation for.",
            citations=[],
            items=[],
            debug_plan={"intent_kind": "order_email", "error": "no_orders"},
        )
```

---

## 🧪 Testing Strategy

### Test 1: Intent Classification
```bash
# Test if intents are recognized
curl -X POST http://127.0.0.1:8000/ai/agent/chat \
  -d '{"message": "I want to checkout now", "clerkUserId": "test_123"}'
 
# Should classify as checkout_start
```

### Test 2: Checkout Flow
```bash
# Add item to cart first, then checkout
curl -X POST http://127.0.0.1:8000/ai/agent/cart_add \
  -d '{"variantId": "...", "size": "M", "clerkUserId": "test_123"}'

curl -X POST http://127.0.0.1:8000/ai/agent/chat \
  -d '{"message": "checkout", "clerkUserId": "test_123"}'
```

### Test 3: Order History
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/chat \
  -d '{"message": "show my orders", "clerkUserId": "test_123"}'
```

### Test 4: Email Resend
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/chat \
  -d '{"message": "resend my confirmation email", "clerkUserId": "test_123"}'
```

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Existing Intents
**Mitigation**: Test all existing intents after adding new ones

### Risk 2: Empty Cart Checkout
**Mitigation**: Check cart before calling checkout_start

### Risk 3: Missing Order ID for Email
**Mitigation**: Default to last order, or ask user which order

---

## ✅ Success Criteria

- [ ] `intent_config.json` created and loaded
- [ ] All 7 intents recognized by classifier
- [ ] Checkout intent triggers checkout flow
- [ ] Order query intent returns order list
- [ ] Email intent resends confirmation
- [ ] No regression in existing intents
- [ ] All error cases handled gracefully
