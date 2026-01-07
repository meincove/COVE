# Week 4 - Phase 2: AI Tools Layer Documentation

**Status**: ✅ Complete  
**Date**: 2025-12-06

---

## 🏗️ Architecture Overview

### Design Principles
- **Configuration-driven**: No hardcoded values, all configurable via environment variables
- **Type-safe**: Full TypedDict schemas for all inputs/outputs
- **Production-ready**: Retry logic, timeouts, structured logging, error handling
- **Testable**: Clear separation of concerns, dependency injection via http_client
- **Extensible**: Easy to add new tools following established patterns

### Directory Structure
```
cove-ai-core/app/cove_ai_tools/
├── __init__.py
├── config.py          # Centralized configuration
├── types.py           # Type definitions (TypedDict schemas)
├── http_client.py     # Reusable HTTP client with retry logic
├── checkout.py        # Checkout tool
├── orders.py          # Order history tool
├── emails.py          # Email confirmation tool
├── cart.py            # (Existing) Cart management
└── recommendations.py # (Existing) Product recommendations
```

---

## 📦 Components

### 1. **config.py** - Configuration Layer

**Purpose**: Centralize all configuration to avoid hardcoding

**Configuration Points**:
- `DJANGO_BASE_URL`: Backend API base URL (default: `http://127.0.0.1:8001`)
- `HTTP_TIMEOUT`: Request timeout in seconds (default: `30`)
- `MAX_RETRIES`: Maximum retry attempts (default: `3`)
- `RETRY_BACKOFF`: Exponential backoff multiplier (default: `1.0`)
- `CACHE_TTL_SECONDS`: Cache time-to-live (default: `600`)

**Environment Variables**:
```bash
export DJANGO_BASE_URL=http://127.0.0.1:8001
export AI_TOOLS_HTTP_TIMEOUT=30
export AI_TOOLS_MAX_RETRIES=3
export AI_TOOLS_CACHE_TTL=600
```

---

### 2. **types.py** - Type Definitions

**Purpose**: Strong typing for all tool interfaces

**Key Types**:
- `CheckoutStartInput/Output`: Checkout flow types
- `OrderGetStatusInput/Output`: Order query types
- `EmailSendConfirmationInput/Output`: Email send types

**Benefits**:
- IDE autocomplete
- Type checking with mypy
- Self-documenting code
- Easier refactoring

---

### 3. **http_client.py** - HTTP Client

**Purpose**: Robust, reusable HTTP client with enterprise features

**Features**:
- ✅ Automatic retry on transient failures (5xx, network errors)
- ✅ Exponential backoff
- ✅ Configurable timeouts
- ✅ Structured error handling
- ✅ Request/response logging
- ✅ Singleton pattern for connection pooling

**Retry Strategy**:
- Max attempts: 3 (configurable)
- Retries on: `TimeoutException`, `NetworkError`, 5xx HTTP errors
- Backoff: Exponential with jitter (1s, 2s, 4s...)

---

### 4. **checkout.py** - Checkout Tool

**Function**: `checkout_start(payload: CheckoutStartInput) -> CheckoutStartOutput`

**Flow**:
1. Validate user identification (clerk or guest)
2. Build request for Django backend
3. Call `/api/payments/create-checkout-session/`
4. Return Stripe Checkout URL

**Error Handling**:
- Empty cart → Returns error with clear message
- Invalid user → Returns authentication error
- Backend unavailable → Automatic retry, then error

---

### 5. **orders.py** - Orders Tool

**Function**: `order_get_status(payload: OrderGetStatusInput) -> OrderGetStatusOutput`

**Flow**:
1. Validate at least one identifier provided
2. Query `/api/orders/mine/` with params
3. Transform Django response to normalized schema
4. Return list of orders with full details

**Data Normalization**:
- Converts snake_case to camelCase
- Parses decimals to strings for JSON compatibility
- Includes shipping address if available

---

### 6. **emails.py** - Email Tool

**Function**: `email_send_order_confirmation(payload: EmailSendConfirmationInput) -> EmailSendConfirmationOutput`

**Flow**:
1. Validate order ID
2. Call `/api/orders/send-receipt/`
3. Return send status (sent, already sent, recipient)

**Idempotency**:
- Default: Sends once per order
- `forceResend=True`: Overrides idempotency

---

## 🧪 Testing Procedures

### Setup

1. **Ensure services are running**:
```bash
# Terminal 1: Django backend
cd /Users/ssg/Desktop/COVE/backend
python manage.py runserver 8001

# Terminal 2: AI Core
cd /Users/ssg/Desktop/COVE/cove-ai-core
uvicorn app.main:app --reload --port 8000
```

2. **Install dependencies**:
```bash
pip install httpx tenacity
```

---

### Test 1: Checkout Tool

**Create test script**: `test_checkout_tool.py`
```python
import asyncio
from app.cove_ai_tools.checkout import checkout_start

async def test_checkout():
    # Test with Clerk user
    result = await checkout_start({
        "clerkUserId": "user_test_123",
        "email": "test@example.com",
        "country": "DE",
        "shippingSpeed": "standard"
    })
    
    print("Checkout Result:")
    print(f"  OK: {result['ok']}")
    if result['ok']:
        print(f"  Checkout URL: {result['data']['paymentUrl']}")
    else:
        print(f"  Error: {result['error']}")

asyncio.run(test_checkout())
```

**Run**:
```bash
cd /Users/ssg/Desktop/COVE/cove-ai-core
python test_checkout_tool.py
```

**Expected Output**:
```
Checkout Result:
  OK: True
  Checkout URL: https://checkout.stripe.com/c/pay/...
```

---

### Test 2: Orders Tool

**Create test script**: `test_orders_tool.py`
```python
import asyncio
from app.cove_ai_tools.orders import order_get_status

async def test_orders():
    # Test with Clerk user
    result = await order_get_status({
        "clerkUserId": "user_test_123",
        "limit": 5
    })
    
    print("Orders Result:")
    print(f"  OK: {result['ok']}")
    if result['ok']:
        print(f"  Found {len(result['data']['orders'])} orders")
        for order in result['data']['orders']:
            print(f"    Order #{order['orderId']}: {order['status']}, €{order['total']}")
    else:
        print(f"  Error: {result['error']}")

asyncio.run(test_orders())
```

**Run**:
```bash
python test_orders_tool.py
```

**Expected Output**:
```
Orders Result:
  OK: True
  Found 2 orders
    Order #123: PAID, €64.97
    Order #122: PAID, €39.99
```

---

### Test 3: Email Tool

**Create test script**: `test_email_tool.py`
```python
import asyncio
from app.cove_ai_tools.emails import email_send_order_confirmation

async def test_email():
    # Replace 123 with actual order ID
    result = await email_send_order_confirmation({
        "orderId": 123,
        "forceResend": False
    })
    
    print("Email Result:")
    print(f"  OK: {result['ok']}")
    if result['ok']:
        print(f"  Sent: {result['data']['sent']}")
        print(f"  Already Sent: {result['data']['alreadySent']}")
        print(f"  Sent To: {result['data']['sentTo']}")
    else:
        print(f"  Error: {result['error']}")

asyncio.run(test_email())
```

**Run**:
```bash
python test_email_tool.py
```

**Expected Output**:
```
Email Result:
  OK: True
  Sent: True
  Already Sent: False
  Sent To: user@example.com
```

---

## 🔍 Validation Checklist

Before proceeding to Phase 3, verify:

- [ ] All test scripts run without errors
- [ ] `checkout_start` returns valid Stripe URLs
- [ ] `order_get_status` returns order data correctly
- [ ] `email_send_order_confirmation` sends emails
- [ ] Error cases return structured error messages
- [ ] Logging shows appropriate INFO/ERROR messages
- [ ] Configuration can be overridden via env vars

---

## 🐛 Troubleshooting

### Issue: "Connection refused" errors

**Cause**: Django backend not running

**Solution**:
```bash
cd /Users/ssg/Desktop/COVE/backend
python manage.py runserver 8001
```

---

### Issue: "Module not found" errors

**Cause**: Missing dependencies

**Solution**:
```bash
pip install httpx tenacity
```

---

### Issue: "orderId not found" in email tool

**Cause**: No orders in database

**Solution**: Create test order via frontend or use existing order ID

---

## 📊 Performance Metrics

**Expected Performance**:
- Checkout: <500ms (network + backend processing)
- Orders: <300ms (database query + serialization)
- Email: <200ms (database lookup + email queue)

**Retry Overhead**:
- On transient failure: +1-4s (exponential backoff)
- Max total time: timeout × max_retries = 30s × 3 = 90s worst case

---

## 🔄 Next Steps

After Phase 2 validation:
1. **Phase 3**: MCP integration (register tools in commerce_server.py)
2. **Phase 4**: Agent intelligence (add intents and flows)
3. **Phase 5**: Performance optimization (caching, parallelism)

---

## 📝 Code Quality Notes

**What makes this production-grade:**
1. **No hardcoding**: All URLs, timeouts, retries configurable
2. **Type safety**: Full TypedDict coverage
3. **Error handling**: Structured errors with context
4. **Logging**: Structured logs with request context
5. **Retry logic**: Automatic recovery from transient failures
6. **Documentation**: Comprehensive docstrings and examples
7. **Testability**: Clear interfaces, dependency injection
8. **Maintainability**: DRY principles, single responsibility

---

## 🎓 Learning Resources

- **httpx**: https://www.python-httpx.org/
- **tenacity**: https://tenacity.readthedocs.io/
- **TypedDict**: https://docs.python.org/3/library/typing.html#typing.TypedDict
- **Async patterns**: https://docs.python.org/3/library/asyncio.html
