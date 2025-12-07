# Week 4 - Complete Testing Guide

**How to properly test all Week 4 features**

---

## 🚀 Quick Start

### Prerequisites
```bash
# 1. Both servers must be running
cd backend && python manage.py runserver 8001  # Terminal 1
cd cove-ai-core && uvicorn app.main:app --reload --port 8000  # Terminal 2
```

### Run All Tests
```bash
cd cove-ai-core
./test_week4.sh
```

**Expected output**: All tests passing ✅

---

## 📋 Comprehensive Test Plan

### Phase 1: Backend Tests

#### Test 1.1: Email Endpoint Exists
```bash
curl -X POST http://127.0.0.1:8001/api/orders/send-receipt/ \
  -H "Content-Type: application/json" \
  -d '{"orderId": 999999}'
```

**Expected**: 
```json
{"error": "Order 999999 not found"}
```

**Status**: ✅ Endpoint working (404 is expected for fake order)

---

#### Test 1.2: Throttle Protection
```bash
# Run 6 times rapidly (should hit throttle at 5/hour)
for i in {1..6}; do
  curl -X POST http://127.0.0.1:8001/api/orders/send-receipt/ \
    -H "Content-Type: application/json" \
    -d '{"orderId": 1}'
  echo ""
done
```

**Expected on 6th request**: 
```json
{"detail": "Request was throttled"}
```

**Status**: ✅ Throttle working

---

### Phase 2: AI Tools Layer

#### Test 2.1: Tools Import
```bash
cd cove-ai-core
source .venv/bin/activate
python -c "
from app.cove_ai_tools import checkout, orders, emails
print('✅ All tools import successfully')
"
```

**Expected**: No errors, prints success message

---

#### Test 2.2: Configuration
```bash
python -c "
from app.cove_ai_tools.config import ToolsConfig
print(f'Django URL: {ToolsConfig.DJANGO_BASE_URL}')
print(f'Timeout: {ToolsConfig.HTTP_TIMEOUT}s')
print('✅ Configuration loaded')
"
```

**Expected**: Shows config values

---

### Phase 3: MCP Server

#### Test 3.1: MCP Tools Available
```bash
cd cove-ai-core
source .venv/bin/activate
python app/cove_mcp/test_all_tools.py
```

**Expected**: All 7 tools tested, checkout/orders/email show expected errors (no data)

---

#### Test 3.2: MCP Commerce Server Starts
```bash
python -m app.cove_mcp.commerce_server
```

**Expected**: Server starts, no import errors  
**Exit**: Ctrl+C

---

### Phase 4: Agent Intelligence

#### Test 4.1: Full Intent Test Suite
```bash
python test_phase4_intents.py
```

**Expected results**:
- TEST 1: Intent Classification → 6/6 passing ✅
- TEST 2: Order History → Handles empty orders ✅
- TEST 3: Email Resend → Handles no orders ✅
- TEST 4: Checkout Intent → Recognizes intent ✅
- TEST 5: Regression → All existing intents work ✅

**Total**: 15/15 tests passing

---

#### Test 4.2: Manual Intent Tests

**Test: Checkout Intent**
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to checkout", "clerkUserId": "test_user"}'
```

**Expected**: 
- `intent_kind: "checkout_start"`
- Response about empty cart or checkout error (expected without cart items)

---

**Test: Order History**
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "show my orders", "clerkUserId": "test_user"}'
```

**Expected**:
- `intent_kind: "order_query"`
- Answer: "You don't have any orders yet..."

---

**Test: Email Resend**
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "resend my confirmation email", "clerkUserId": "test_user"}'
```

**Expected**:
- `intent_kind: "order_email"`
- Answer: "No orders found to resend confirmation for."

---

**Test: Product Discovery (Regression)**
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "black hoodie size M", "clerkUserId": "test_user"}'
```

**Expected**:
- `intent_kind: "discover"` ✅ (not size_fit!)
- Returns product recommendations

---

**Test: Sizing Question (Regression)**
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "what size should I get", "clerkUserId": "test_user"}'
```

**Expected**:
- `intent_kind: "size_fit"` ✅
- Returns sizing advice

---

### Phase 5: Performance Tests

#### Test 5.1: Full Performance Suite
```bash
python test_phase5_performance.py
```

**Expected results**:
- TEST 1: Policy Cache → Cache hits for shipping/return questions ✅
- TEST 2: Cache Stats → Tracking working ✅
- TEST 3: Performance → 5x+ speedup on cached queries ✅
- TEST 4: Regression → All intents still work ✅

**Total**: 4/4 tests passing

---

#### Test 5.2: Manual Cache Test

**Test: Policy Question (Should be cached)**
```bash
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "how long is shipping", "clerkUserId": "test"}'
```

**Expected in debug_plan**:
```json
{
  "policy_cache_hit": true,
  "cache_used": true,
  "intent_kind": "policy"
}
```

**Answer should be**: Instant response about 2-5 business days

---

#### Test 5.3: Cache Statistics
```bash
python -c "
from app.core.cache import get_cache_stats
print(get_cache_stats())
"
```

**Expected**: Shows hits, misses, hit_rate

---

## 🎯 End-to-End User Scenarios

### Scenario 1: Shopping Journey
```bash
# 1. User asks for products
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -d '{"message": "show me black hoodies", "clerkUserId": "e2e_test"}'

# 2. User asks about sizing
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -d '{"message": "what size for 180cm 75kg", "clerkUserId": "e2e_test"}'

# 3. User asks about shipping
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -d '{"message": "how long is shipping", "clerkUserId": "e2e_test"}'

# 4. User tries to checkout (will fail gracefully)
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -d '{"message": "checkout now", "clerkUserId": "e2e_test"}'
```

**Expected flow**:
1. ✅ Shows product recommendations
2. ✅ Provides sizing advice
3. ✅ Instant cached policy answer
4. ✅ Graceful error about empty cart

---

### Scenario 2: Order Management
```bash
# 1. Check order history
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -d '{"message": "show my orders", "clerkUserId": "e2e_test"}'

# 2. Request email resend
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -d '{"message": "resend confirmation", "clerkUserId": "e2e_test"}'
```

**Expected flow**:
1. ✅ "No orders yet" message
2. ✅ "No orders found" message

---

## ✅ Success Criteria

Week 4 passes when:

### Automated Tests
- [ ] `./test_week4.sh` runs without errors
- [ ] Phase 4 tests: 15/15 passing
- [ ] Phase 5 tests: 4/4 passing

### Intent Classification
- [ ] "checkout" → checkout_start ✅
- [ ] "show orders" → order_query ✅
- [ ] "resend email" → order_email ✅
- [ ] "black hoodie size M" → discover ✅ (NOT size_fit)
- [ ] "what size" → size_fit ✅
- [ ] "shipping" → policy ✅

### Performance
- [ ] Policy cache hits working
- [ ] Cache statistics tracking
- [ ] No regression in response quality

### Error Handling
- [ ] Empty cart checkout → Graceful error
- [ ] No orders history → Informative message
- [ ] Email resend no orders → Clear explanation

---

## 🐛 Common Issues

### Issue 1: Tests failing with 404
**Cause**: Server not running  
**Fix**: Start both servers (backend on 8001, ai-core on 8000)

---

### Issue 2: Intent misclassification
**Cause**: Old server cache  
**Fix**: Restart ai-core server
```bash
# Ctrl+C to stop, then restart:
uvicorn app.main:app --reload --port 8000
```

---

### Issue 3: Policy cache not hitting
**Cause**: Intent not classified as "policy"  
**Check**: Look at `intent_kind` in debug_plan  
**Fix**: Review intent keywords in `/data/intent_config.json`

---

### Issue 4: Module import errors
**Cause**: Not in virtual environment  
**Fix**:
```bash
cd cove-ai-core
source .venv/bin/activate
```

---

## 📊 Expected Test Results Summary

| Test Area | Total Tests | Expected Pass |
|-----------|-------------|---------------|
| Phase 1 (Manual) | 2 | 2 ✅ |
| Phase 2 (Manual) | 2 | 2 ✅ |
| Phase 3 (MCP) | 7 tools | 7 ✅ |
| Phase 4 (Automated) | 15 | 15 ✅ |
| Phase 5 (Automated) | 4 | 4 ✅ |
| **TOTAL** | **30+** | **30+ ✅** |

---

## 🚀 Quick Test Command Reference

```bash
# Run everything
./test_week4.sh

# Just Phase 4
python test_phase4_intents.py

# Just Phase 5
python test_phase5_performance.py

# Manual agent test
curl -X POST http://127.0.0.1:8000/ai/agent/query \
  -H "Content-Type: application/json" \
  -d '{"message": "YOUR MESSAGE", "clerkUserId": "test"}'

# Check cache stats
python -c "from app.core.cache import get_cache_stats; print(get_cache_stats())"
```

---

## 📝 Testing Checklist

Before marking Week 4 complete:

- [ ] Both servers running
- [ ] Virtual environment activated
- [ ] `./test_week4.sh` passes
- [ ] All 15 Phase 4 tests passing
- [ ] All 4 Phase 5 tests passing
- [ ] Manual intent tests verified
- [ ] Policy cache confirmed working
- [ ] No regressions in existing features
- [ ] Error handling tested
- [ ] Documentation reviewed

---

**File**: `/cove-ai-core/WEEK4_TESTING_GUIDE.md`  
**Last Updated**: 2025-12-06  
**Status**: Ready for testing
