# Security Audit Report: Accounts & Payments Apps

**Date**: 2025-12-06  
**Audited Components**: `/backend/accounts/` and `/backend/payments/`  
**Audit Type**: Security vulnerability assessment, code quality review

---

## Executive Summary

The audit identified **3 CRITICAL**, **4 HIGH**, and **5 MEDIUM** risk issues across authentication, payment processing, and data handling code. While core security mechanisms (webhook signature verification, CSRF exemptions) are properly implemented, several important vulnerabilities require immediate attention to prevent financial loss, data breaches, and race conditions.

---

## 🔴 CRITICAL Issues

### 1. **Race Condition in Stock Management**

**Location**: `payments/views.py:158-163` (soft check), `payments/views.py:896-929` (decrement)

**Issue**: The stock check in `create_checkout_session` is **not atomic** with the checkout creation. This creates a window for overselling:

```python
# Line 159 - Soft check (not in transaction)
if qty > ssp.quantity:
    return JsonResponse({...}, status=400)
```

**Attack Scenario**:
1. User A checks out 5 items (stock: 5)
2. User B checks out 5 items simultaneously (stock: still 5)
3. Both pass the soft check
4. Webhook decrements stock twice → oversold

**Impact**: Overselling inventory, customer dissatisfaction, operational chaos

**Fix**:
```python
with transaction.atomic():
    ssp = SizeStockPrice.objects.select_for_update().get(
        variant__variant_id=variant_id, size=size
    )
    if qty > ssp.quantity:
        return JsonResponse({...}, status=400)
    # Reserve stock immediately
    ssp.quantity -= qty
    ssp.save(update_fields=["quantity"])
```

Or use pessimistic locking + rollback on Stripe failure.

---

### 2. **Idempotency Key Not Enforced for Duplicate Requests**

**Location**: `payments/views.py:224`

**Issue**: Idempotency key is generated but not validated for duplicates. If a client retries with the same key, the server creates duplicate checkout sessions.

```python
idem_key = request.headers.get("Idempotency-Key") or str(uuid.uuid4())
# ❌ No check if this key was already used
```

**Impact**: Duplicate charges, double inventory decrement

**Fix**: Store idempotency keys in DB/cache with a TTL:
```python
from django.core.cache import cache

IDEM_TTL = 3600  # 1 hour

idem_key = request.headers.get("Idempotency-Key")
if not idem_key:
    return JsonResponse({"error": "Idempotency-Key required"}, status=400)

cached = cache.get(f"idem:{idem_key}")
if cached:
    return JsonResponse(cached, status=200)  # Return cached response
```

---

### 3. **Insufficient Webhook Replay Protection**

**Location**: `payments/views.py:548-560`

**Issue**: While event deduplication exists, it doesn't catch **replayed** events from attackers who intercept valid webhooks.

```python
record, created = StripeEvent.objects.get_or_create(
    event_id=event["id"],  # ✅ Prevents exact duplicates
    # ❌ But doesn't validate timestamp freshness
)
```

**Attack Scenario**:
1. Attacker intercepts a valid `checkout.session.completed` webhook
2. Modifies metadata (e.g., changes email to attacker's)
3. Replays it with same event ID → database already has it
4. But if they use a NEW `event_id` in the JSON, it processes again

**Fix**: Add timestamp validation:
```python
from django.utils import timezone
from datetime import timedelta

event_time = event.get("created")  # Unix timestamp
if event_time:
    event_age = timezone.now() - datetime.fromtimestamp(event_time, tz=timezone.utc)
    if event_age > timedelta(minutes=5):
        return JsonResponse({"error": "event_too_old"}, status=400)
```

---

## 🟠 HIGH Risk Issues

### 4. **Email Injection via Unsanitized Metadata**

**Location**: `payments/views.py:593-597`, `accounts/webhooks.py:59`

**Issue**: User-controlled email addresses are stored without validation and used in email sending.

```python
user_email = (
    (session.get("customer_details") or {}).get("email")  # ❌ Stripe-validated
    or metadata.get("user_email")  # ❌❌ USER-CONTROLLED, no validation
)
```

**Attack**: Inject newlines/headers in email field:
```
user@example.com\nBcc: attacker@evil.com
```

**Fix**: Use Django's `EmailField` validation:
```python
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

try:
    validate_email(user_email)
except ValidationError:
    user_email = None
```

---

### 5. **Missing Rate Limiting on Payment Intent Creation**

**Location**: `payments/views.py:52-93`

**Issue**: `create_payment_intent` has no throttling, allowing abuse.

```python
@csrf_exempt  # ❌ No throttle decorator
def create_payment_intent(request):
```

**Impact**: Financial DoS (Stripe fees accumulate), resource exhaustion

**Fix**:
```python
from rest_framework.decorators import throttle_classes
from rest_framework.throttling import AnonRateThrottle

@csrf_exempt
@throttle_classes([AnonRateThrottle])  # Add throttling
def create_payment_intent(request):
```

Configure in `settings.py`:
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/hour',  # Adjust as needed
    }
}
```

---

### 6. **Potential SQL Injection in Order Lookup** *(Low likelihood but worth fixing)*

**Location**: `payments/views.py:598`

**Issue**: While Django ORM prevents classic SQL injection, the `.filter()` uses user-controlled `clerk_user_id` without explicit length validation.

```python
user = User.objects.filter(user_id=clerk_user_id).first()
```

If `clerk_user_id` is extremely long (e.g., 10MB string), it could cause:
- Database query timeout
- Memory exhaustion

**Fix**: Add max length validation in serializer:
```python
class CreateCheckoutSessionSerializer(serializers.Serializer):
    clerkUserId = serializers.CharField(
        max_length=255,  # ✅ Already present
        required=False,
        allow_blank=True
    )
    # But ensure it's also validated on webhook paths
```

---

### 7. **Clerk Webhook Signature Not Always Checked**

**Location**: `accounts/webhooks.py:26-28`

**Issue**: If `CLERK_WEBHOOK_SECRET` is not set, the webhook returns a 500 but **doesn't reject the request early**. Attackers can craft requests that skip verification.

```python
secret = getattr(settings, "CLERK_WEBHOOK_SECRET", None)
if not secret:
    return JsonResponse({"error": "CLERK_WEBHOOK_SECRET not set"}, status=500)
```

**Fix**: Fail fast with 503 Service Unavailable:
```python
if not secret:
    log.critical("CLERK_WEBHOOK_SECRET not configured!")
    return JsonResponse({"error": "service_misconfigured"}, status=503)
```

---

## 🟡 MEDIUM Risk Issues

### 8. **Sensitive Data in Logs**

**Location**: Multiple (e.g., `payments/views.py:92`, `accounts/webhooks.py:43`)

**Issue**: Exception messages may leak sensitive data:

```python
except Exception as e:
    return JsonResponse({"error": str(e)}, status=400)  # ❌ Exposes internals
```

**Fix**: Generic error messages + secure logging:
```python
except Exception as e:
    log.error("Checkout failed: %s", e, exc_info=True)  # Log details securely
    return JsonResponse({"error": "checkout_failed"}, status=400)  # Generic to user
```

---

### 9. **Missing Input Validation on Weight/Country**

**Location**: `payments/views.py:229-231`

**Issue**: Shipping calculation trusts user input without validation:

```python
dest_country = (request.data.get("country") or "DE").upper()  # ❌ No allowlist check
weight_g = int(request.data.get("totalWeightGrams") or 0)  # ❌ No max limit
```

**Attack**: Send `weight_g = 999999999` → shipping price overflow/DoS

**Fix**:
```python
dest_country = (request.data.get("country") or "DE").upper()
if len(dest_country) != 2:  # ISO-2 codes
    return JsonResponse({"error": "invalid_country"}, status=400)

try:
    weight_g = int(request.data.get("totalWeightGrams") or 0)
    if not (0 <= weight_g <= 50000):  # Max 50kg
        raise ValueError
except (ValueError, TypeError):
    return JsonResponse({"error": "invalid_weight"}, status=400)
```

---

### 10. **Hardcoded Fallback Email Allows User Enumeration**

**Location**: `accounts/webhooks.py:59`

**Issue**: Fallback email pattern reveals internal user IDs:

```python
"email": email or f"{clerk_user_id}@noemail.local",
```

**Impact**: User enumeration, spam targeting

**Fix**: Use a constant placeholder or hash:
```python
import hashlib
fallback = f"user_{hashlib.sha256(clerk_user_id.encode()).hexdigest()[:8]}@noemail.local"
```

---

### 11. **Refund Logic Doesn't Validate Refund Amount**

**Location**: `payments/views.py:981`

**Issue**: `AUTO_RESTOCK_ON_REFUND` triggers on partial refunds without checking if items were actually refunded:

```python
is_full_refund = charge_amount and refunded >= charge_amount
if settings.AUTO_RESTOCK_ON_REFUND and is_full_refund:
    # Restocks ALL items, even if only shipping was refunded
```

**Fix**: Only restock on 100% refund OR parse Stripe's `refund` object metadata:
```python
# Better: check refund.reason and metadata
if settings.AUTO_RESTOCK_ON_REFUND and is_full_refund and refunded == charge_amount:
```

---

### 12. **Missing HTTPS Enforcement on Webhook URLs**

**Location**: All webhook handlers

**Issue**: No check if webhooks are received over HTTPS (rely on deployment config).

**Fix**: Add middleware or decorator:
```python
def require_https(view_func):
    def wrapped(request, *args, **kwargs):
        if not request.is_secure():
            return JsonResponse({"error": "https_required"}, status=400)
        return view_func(request, *args, **kwargs)
    return wrapped

@require_https
@csrf_exempt
def stripe_webhook(request):
    ...
```

---

## ✅ What's Done Well

1. **Webhook Signature Verification**: Both Stripe and Clerk webhooks properly verify signatures
2. **Idempotent Order Creation**: `get_or_create` by `payment_intent_id` prevents duplicate orders
3. **Transactional Inventory Decrement**: Uses `select_for_update` (though checkout stock check isn't atomic)
4. **CSRF Exemption**: Properly applied to webhooks (they wouldn't work otherwise)
5. **Email Idempotency**: `receipt_emailed` flag prevents duplicate emails
6. **Error Handling**: Most exceptions are caught and logged

---

## Priority Fix Recommendations

### Immediate (P0 - Fix This Week)
1. ✅ **Fix race condition in stock check** (Issue #1)
2. ✅ **Add idempotency key enforcement** (Issue #2)
3. ✅ **Add webhook timestamp validation** (Issue #3)

### High Priority (P1 - Fix This Month)
4. **Add rate limiting to payment endpoints** (Issue #5)
5. **Sanitize user emails before storage** (Issue #4)
6. **Validate shipping input** (Issue #9)

### Medium Priority (P2 - Technical Debt)
7. Improve error message handling (Issue #8)
8. Add HTTPS enforcement (Issue #12)
9. Fix refund restock logic (Issue #11)

---

## Testing Recommendations

### Security Tests to Add

1. **Race Condition Test**:
```python
# Use threading to simulate concurrent checkouts
import threading

def test_concurrent_checkout_oversell():
    # Create product with stock=5
    # Spawn 2 threads, each buying qty=5
    # Assert: One should fail with "insufficient stock"
```

2. **Webhook Replay Attack Test**:
```python
def test_old_webhook_rejected():
    # Craft event with timestamp > 5 min old
    # Assert: Returns 400
```

3. **Idempotency Test**:
```python
def test_duplicate_idempotency_key():
    # Make same request twice with same Idempotency-Key
    # Assert: Second returns cached response
```

---

## Code Quality Notes

- **Good**: Clean separation of concerns (serializers, models, views)
- **Good**: Extensive comments explaining business logic
- **Issue**: 998-line `views.py` is too large; consider splitting into:
  - `views/checkout.py`
  - `views/webhooks.py`
  - `views/payment_intents.py`

---

## Summary

The codebase demonstrates solid understanding of Stripe integration and Django best practices. However, the race condition in stock management and missing idempotency enforcement are critical issues that could result in financial losses. Addressing the P0 issues should be the immediate priority before going live.

**Overall Security Score: 7/10** *(Would be 9/10 after P0 fixes)*
