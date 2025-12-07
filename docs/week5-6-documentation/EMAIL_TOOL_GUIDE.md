# Email Tool Guide

**File**: `app/cove_ai_tools/emails.py`  
**Tool**: `email_send_order_confirmation`

---

## 📧 How It Works

### Overview

The email tool allows the AI agent to resend order confirmation emails to customers. It's primarily used when:
1. User says "I didn't receive my order confirmation"
2. User asks "Can you send me a receipt?"
3. User needs proof of purchase

### Architecture

```
AI Agent → emails.py → Django Backend → Email Queue → Customer
                         (/api/orders/send-receipt)
```

**Flow**:
1. AI identifies need for email (user request)
2. AI calls `email_send_order_confirmation({orderId, forceResend})`
3. Tool makes POST to Django `/api/orders/send-receipt`
4. Django fetches order details from database
5. Django generates email HTML from template
6. Django queues email for sending
7. Email service (SendGrid/AWS SES/etc.) sends email
8. Tool returns success/failure to AI

---

## 🔧 Function Signature

```python
async def email_send_order_confirmation(
    payload: EmailSendConfirmationInput
) -> EmailSendConfirmationOutput
```

### Input (`EmailSendConfirmationInput`)

```python
{
    "orderId": int,              # Required - Order ID
    "forceResend": bool          # Optional - Force resend even if already sent
}
```

###Output (`EmailSendConfirmationOutput`)

**Success**:
```python
{
    "ok": True,
    "data": {
        "orderId": 123,
        "sent": True,               # Email was sent
        "alreadySent": False,       # Was it previously sent?
        "sentTo": "user@email.com"  # Recipient email
    },
    "error": None
}
```

**Failure**:
```python
{
    "ok": False,
    "data": None,
    "error": "Order 123 not found"  # Error message
}
```

---

## 💡 Key Features

### 1. **Idempotent by Default**

```python
# First call - sends email
result1 = await email_send_order_confirmation({"orderId": 123})
# result1["data"]["sent"] = True
# result1["data"]["alreadySent"] = False

# Second call - doesn't resend (idempotent)
result2 = await email_send_order_confirmation({"orderId": 123})
# result2["data"]["sent"] = False
# result2["data"]["alreadySent"] = True
```

**Why?** Prevents accidental spam if AI calls it multiple times.

### 2. **Force Resend Option**

```python
# Override idempotency - always sends
result = await email_send_order_confirmation({
    "orderId": 123,
    "forceResend": True
})
# Email sent even if previously sent
```

**Use when**: User explicitly asks "send it again"

### 3. **Rate Limiting**

Backend enforces **5 emails per hour per IP** to prevent abuse.

### 4.**Automatic Email Lookup**

You only need `orderId`. The backend:
- Fetches order from database
- Extracts customer email from order
- Uses order data for email content
- No need to pass email separately!

---

## 🧪 How to Test

### Test 1: Basic Function Call (No Backend)

```python
from app.cove_ai_tools import emails

# This will fail gracefully (backend not running)
result = await emails.email_send_order_confirmation({
    "orderId": 999,
    "forceResend": False
})

print(result)
# {"ok": False, "error": "Failed to send email"}
```

### Test 2: With Django Backend Running

**Prerequisites**:
1. Start Django backend: `python manage.py runserver 8001`
2. Have at least one order in database

**Test**:
```python
# Get a real order ID first
from app.cove_ai_tools import orders

orders_result = await orders.order_get_status({
    "clerkUserId": "your_clerk_user_id",
    "limit": 1
})

if orders_result["ok"]:
    order_id = orders_result["data"]["orders"][0]["orderId"]
    
    # Send email for that order
    email_result = await emails.email_send_order_confirmation({
        "orderId": order_id
    })
    
    print(f"Email sent: {email_result['data']['sent']}")
    print(f"Sent to: {email_result['data']['sentTo']}")
```

### Test 3: Via AI Agent (End-to-End)

**In agent-dev chat**:
```
You: "Can you send me my order confirmation email?"

Agent:
1. Identifies intent (email/order confirmation)
2. Gets your recent orders (order_get_status)
3. Finds most recent order
4. Calls email_send_order_confirmation
5. Responds: "✓ I've sent the confirmation email for 
   order #123 (€89.99) to your@email.com"
```

**Check Agent Logs**:
```bash
tail -f cove-ai-core/logs/app.log | grep "Email send"

# Should see:
# Sending order confirmation for order 123
# Email send result: {'orderId': 123, 'sent': True, ...}
```

### Test 4: Force Resend

```python
# First send
result1 = await emails.email_send_order_confirmation({
    "orderId": 123
})
# sent: True, alreadySent: False

# Second send (idempotent)
result2 = await emails.email_send_order_confirmation({
    "orderId": 123
})
# sent: False, alreadySent: True

# Force resend
result3 = await emails.email_send_order_confirmation({
    "orderId": 123,
    "forceResend": True
})
# sent: True, alreadySent: False (sent again)
```

---

## 🎯 Real-World Examples

### Example 1: Simple Resend Request

**User**: "I didn't get my order confirmation"

**Agent Code**:
```python
# Step 1: Get user's recent order
orders = await tools_orders.order_get_status({
    "clerkUserId": user_id,
    "limit": 1
})

if orders["ok"] and orders["data"]["orders"]:
    order = orders["data"]["orders"][0]
    
    # Step 2: Resend confirmation
    email_result = await tools_emails.email_send_order_confirmation({
        "orderId": order["orderId"]
    })
    
    if email_result["ok"]:
        return f"✓ I've resent the confirmation for order #{order['orderId']} to {email_result['data']['sentTo']}"
```

### Example 2: Specific Order

**User**: "Send me the confirmation for order 456"

**Agent Code**:
```python
# User specified order ID
result = await tools_emails.email_send_order_confirmation({
    "orderId": 456
})

if result["ok"]:
    if result["data"]["alreadySent"]:
        return "That email was already sent. Would you like me to send it again?"
    else:
        return f"✓ Confirmation sent to {result['data']['sentTo']}"
```

### Example 3: Multiple Attempts

**User**: "Send it again, I still don't see it"

**Agent Code**:
```python
# Use forceResend for explicit repeat requests
result = await tools_emails.email_send_order_confirmation({
    "orderId": order_id,
    "forceResend": True  # Override idempotency
})

if result["ok"]:
    return f"✓ I've sent another copy to {result['data']['sentTo']}. Check your spam folder if you still don't see it."
```

---

## 🔍 Integration in Agent

The email tool is integrated in `app/routes/agent.py`:

```python
# Line 1441 - When agent needs to send email
if user_wants_email:
    email_payload = {
        "orderId": recent_order["orderId"],
        "forceResend": False
    }
    
    email_result = await tools_emails.email_send_order_confirmation(
        email_payload
    )
    
    if email_result["ok"]:
        assistant_message = f"I've sent the confirmation to {email_result['data']['sentTo']}"
    else:
        assistant_message = f"Sorry, I couldn't send the email: {email_result['error']}"
```

---

## ⚠️ Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `"orderId is required"` | Missing orderId in payload | Provide orderId |
| `"Order 123 not found"` | Invalid order ID | Verify order exists |
| `"Failed to send email"` | Backend down or network issue | Check backend status |
| `"Rate limit exceeded"` | Too many requests | Wait 1 hour |

### Handling in Agent

```python
result = await email_send_order_confirmation(payload)

if not result["ok"]:
    error = result["error"]
    
    if "not found" in error:
        return "I couldn't find that order. Can you check the order number?"
    elif "rate limit" in error:
        return "Too many email requests. Please try again in an hour."
    else:
        return f"Sorry, I encountered an error: {error}"
```

---

## 🛠️ Backend Configuration

The tool connects to Django backend:

**Endpoint**: `POST http://127.0.0.1:8001/api/orders/send-receipt`

**Config** (in `app/cove_ai_tools/config.py`):
```python
ORDERS_SEND_RECEIPT_URL = f"{BACKEND_BASE_URL}/api/orders/send-receipt"
```

**Backend Requirements**:
1. Order must exist in database
2. Order must have customer email
3. Email template configured
4. Email service (SendGrid/SES) configured

---

## 📝 Best Practices

### DO ✅

1. **Check order exists first**:
   ```python
   orders = await order_get_status(...)
   if orders["ok"]:
       # Then send email
   ```

2. **Use forceResend sparingly**:
   ```python
   # Only when user explicitly asks "send it again"
   if user_says_again:
       forceResend = True
   ```

3. **Handle errors gracefully**:
   ```python
   if not result["ok"]:
       # Provide helpful message
   ```

### DON'T ❌

1. **Don't send without orderId**:
   ```python
   # BAD
   await email_send_order_confirmation({})
   ```

2. **Don't spam with forceResend**:
   ```python
   # BAD - will hit rate limit
   for i in range(10):
       await email_send_order_confirmation({...,"forceResend": True})
   ```

3. **Don't ignore errors**:
   ```python
   # BAD
   result = await email_send_order_confirmation({...})
   # Assume it worked (check result["ok"]!)
   ```

---

## 🚀 Quick Start

**Minimal working example**:

```python
import asyncio
from app.cove_ai_tools import emails

async def send_confirmation():
    result = await emails.email_send_order_confirmation({
        "orderId": 123  # Replace with real order ID
    })
    
    if result["ok"]:
        print(f"✓ Sent to: {result['data']['sentTo']}")
    else:
        print(f"✗ Error: {result['error']}")

# Run it
asyncio.run(send_confirmation())
```

---

## 📊 MCP Integration

The email tool is also available via MCP:

**MCP Tool Name**: `email_send_order_confirmation`

**Defined in**: `app/cove_mcp/commerce_server.py` (line 250)

**Usage via MCP**:
```python
from app.core.mcp_client import get_mcp_client

client = get_mcp_client()
result = await client.call_tool("email_send_order_confirmation", {
    "orderId": 123,
    "forceResend": False
})
```

---

## 🧩 Use Cases

1. **Lost Confirmation**:
   - User: "I lost my order confirmation"
   - Action: Resend confirmation email

2. **Wrong Email**:
   - User: "That went to my old email"
   - Action: (Requires backend to update email first, then resend)

3. **Proof of Purchase**:
   - User: "I need proof I ordered this"
   - Action: Send confirmation (serves as receipt)

4. **Multiple Requests**:
   - User: "Can you send it to me 3 times?"
   - Action: Use force Resend (up to rate limit)

---

## ✅ Summary

**Email Tool (`emails.py`)**:
- Resends order confirmation emails
- Idempotent by default (won't spam)
- Can force resend if needed
- Requires only `orderId`
- Backend handles email lookup and sending
- Rate limited (5/hour)
- Works with Django `/api/orders/send-receipt`

**To Test**:
1. Run `python3 test_email_tool.py` (educational)
2. Use with real Django backend + real order ID
3. Test via AI agent: "Send me my order confirmation"

**Status**: ✅ Fully implemented and working!
