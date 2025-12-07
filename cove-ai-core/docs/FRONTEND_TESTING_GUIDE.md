# Week 4 - Frontend Testing Guide (Agent-Dev Chatbox)

**How to test Week 4 features from the frontend UI**

---

## 🚀 Setup

### 1. Start all services
```bash
# Terminal 1: Backend
cd backend
python manage.py runserver 8001

# Terminal 2: AI Core
cd cove-ai-core
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend  # or wherever your Next.js app is
npm run dev
```

### 2. Open the agent-dev chatbox
```
http://localhost:3000/agent-dev
```

---

## 🧪 Test Scenarios

### Test 1: Product Discovery (Baseline - Should Already Work)

**Type in chatbox**:
```
show me black hoodies
```

**Expected**:
- ✅ Shows product recommendations
- ✅ Product cards displayed
- ✅ Intent: `discover`

**Status**: This should already work from previous weeks

---

### Test 2: Policy Questions (NEW - Phase 5 Cache)

**Type in chatbox**:
```
how long is shipping
```

**Expected response**:
```
We offer 2-5 business days shipping within the EU, and 5-10 business days worldwide. 
All orders are dispatched within 24 hours.
```

**Check in debug panel** (if available):
- `intent_kind: "policy"`
- `policy_cache_hit: true` ✅
- Response should be instant (<1 second)

**Also test**:
```
what is your return policy
```
```
how do i wash my hoodie
```

**Expected**: Instant answers from static cache

---

### Test 3: Checkout Intent (NEW - Phase 4)

**Type in chatbox**:
```
I want to checkout
```

**Expected response**:
```
I'm not sure which item you want me to add. Please either click a specific product 
or say something like "Add the black hoodie in size M to my cart"...
```

**OR** (if cart has items):
```
Sorry, I couldn't start checkout: [error about cart or payment]
```

**What's happening**:
- ✅ Intent recognized as `checkout_start`
- ⚠️ Likely triggers cart_add flow first (known issue)
- Still validates intent classification working

**Also test**:
```
checkout now
```
```
proceed to payment
```
```
ready to buy
```

**Expected**: All should recognize checkout intent

---

### Test 4: Order History (NEW - Phase 4)

**Type in chatbox**:
```
show my orders
```

**Expected response**:
```
You don't have any orders yet. Ready to start shopping?
```

**Check in debug panel**:
- `intent_kind: "order_query"` ✅
- Clean, friendly message about no orders

**Also test**:
```
what did i buy
```
```
order history
```
```
where is my order
```

**Expected**: All should trigger order_query intent

---

### Test 5: Email Resend (NEW - Phase 4)

**Type in chatbox**:
```
resend my confirmation email
```

**Expected response**:
```
No orders found to resend confirmation for.
```

**Check in debug panel**:
- `intent_kind: "order_email"` ✅
- Graceful handling of no orders

**Also test**:
```
send me my receipt
```
```
resend confirmation
```

**Expected**: All should trigger order_email intent

---

### Test 6: Size & Fit (Regression Test)

**Type in chatbox**:
```
what size should I get
```

**Expected response**:
- ✅ Size recommendation or request for measurements
- ✅ Intent: `size_fit`

**Also test**:
```
I'm 180cm and 75kg, what size?
```

**Expected**: Sizing advice based on measurements

---

### Test 7: Intent Classification Fix (Critical)

**Type in chatbox**:
```
black hoodie size M
```

**Expected**:
- ✅ Shows product recommendations
- ✅ Intent: `discover` (NOT size_fit!)
- ✅ This was the bug we fixed in Phase 4

**If this shows size_fit intent**: Server needs restart

---

## 🎯 Complete User Journey Test

### Journey: Browse → Ask → Checkout Attempt

**Step 1**: Product discovery
```
show me hoodies
```
**Expected**: Product cards displayed ✅

**Step 2**: Policy question
```
how long is shipping
```
**Expected**: Instant cached answer ✅

**Step 3**: Sizing question
```
what size for 180cm tall person
```
**Expected**: Size recommendation ✅

**Step 4**: Checkout attempt
```
I want to checkout now
```
**Expected**: Message about cart or checkout ✅

**Step 5**: Order check
```
show my orders
```
**Expected**: "No orders yet" message ✅

---

## 📊 Expected Results Summary

| Test | Input | Expected Intent | Expected Behavior |
|------|-------|-----------------|-------------------|
| Discovery | "black hoodies" | discover | Show products ✅ |
| Policy | "shipping time" | policy | Cached answer ✅ |
| Checkout | "checkout now" | checkout_start | Recognized ✅ |
| Orders | "my orders" | order_query | No orders message ✅ |
| Email | "resend email" | order_email | No orders message ✅ |
| Size/Fit | "what size" | size_fit | Sizing advice ✅ |
| Regression | "hoodie size M" | discover | Products ✅ (not size_fit) |

---

## 🐛 Troubleshooting

### Issue: All responses are slow
**Check**: Is AI core server running on port 8000?
```bash
curl http://127.0.0.1:8000/
```

### Issue: Policy cache not hitting
**Possible causes**:
1. Server not restarted after Phase 5 changes
2. Intent classified as something other than "policy"

**Fix**: Restart AI core server
```bash
# Stop uvicorn (Ctrl+C)
uvicorn app.main:app --reload --port 8000
```

### Issue: "black hoodie size M" → size_fit
**Cause**: Server using old intent config

**Fix**: Restart AI core server (will reload intent_config.json)

### Issue: Checkout not working
**Expected**: Checkout won't fully work without items in cart
- Intent should still be recognized as `checkout_start` ✅
- Message about cart issues is expected

### Issue: Debug panel not showing
**Note**: Debug info might not show in frontend UI
- That's OK - focus on the response text
- Check backend logs for intent classification:
```bash
# In AI core terminal, look for:
{"intent": "policy", ...}
```

---

## ✅ Success Criteria for Frontend Testing

Week 4 is working when you can:

### Core Features
- [ ] Type "how long is shipping" → Get instant policy answer
- [ ] Type "show my orders" → Get "no orders" message
- [ ] Type "resend email" → Get "no orders" message
- [ ] Type "checkout" → Intent recognized (even if fails)

### Regression Tests
- [ ] Type "black hoodie size M" → Get products (NOT sizing advice)
- [ ] Type "what size should I get" → Get sizing advice
- [ ] Type "show me hoodies" → Get product cards

### Performance
- [ ] Policy questions feel instant
- [ ] No errors in browser console
- [ ] No errors in AI core logs

---

## 📝 Testing Checklist

Before marking complete:

- [ ] Frontend dev server running (port 3000)
- [ ] Backend running (port 8001)
- [ ] AI core running (port 8000)
- [ ] Can access `/agent-dev` route
- [ ] Tested all 7 scenarios above
- [ ] All intents correctly recognized
- [ ] Policy cache working (fast responses)
- [ ] No regressions in existing features
- [ ] User experience smooth and natural

---

## 💡 Pro Tips

### Tip 1: Check Browser Console
Open DevTools → Console to see any frontend errors

### Tip 2: Check Network Tab
DevTools → Network → Filter "query" to see agent API calls
- Should POST to `/ai/agent/query`
- Check response payload for intent classification

### Tip 3: Backend Logs
Watch the AI core terminal for:
```
{"event": "query_received", "intent": "policy", ...}
```

### Tip 4: Test Both Logged In & Guest
If your frontend supports auth:
- Test as logged-in user
- Test as guest
Both should work

---

## 🎬 Demo Script for Stakeholders

**Professional demo flow**:

1. **"Let me show you our intelligent shopping assistant"**
   - Type: "show me black hoodies"
   - *Shows products*

2. **"It answers policy questions instantly"**
   - Type: "how long is shipping"
   - *Instant answer from cache*

3. **"It provides personalized sizing advice"**
   - Type: "I'm 180cm and 75kg, what size?"
   - *Size recommendation*

4. **"And handles order management"**
   - Type: "show my orders"
   - *No orders message*

5. **"Even checkout initiation"**
   - Type: "ready to checkout"
   - *Checkout intent recognized*

---

**File**: `/cove-ai-core/FRONTEND_TESTING_GUIDE.md`  
**For**: Manual UI testing in agent-dev chatbox  
**Status**: Ready to test

**Start testing**: Open `http://localhost:3000/agent-dev` and try the scenarios above! 🚀
