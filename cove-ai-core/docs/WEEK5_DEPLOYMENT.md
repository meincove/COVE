# Week 5 - Deployment Guide

**Quick Start**: Enable streaming and optimized prompts in production

---

## 🚀 Enabling Features

### Option 1: Enable Streaming Only (Recommended First Step)

**Frontend** - Add to `.env.local`:
```bash
NEXT_PUBLIC_USE_STREAMING=true
AI_CORE_URL=http://127.0.0.1:8000
```

**Backend** - Already enabled (streaming endpoint is live)

**Restart**:
```bash
# Restart frontend
cd frontend
npm run dev
```

**Test**:
1. Go to http://localhost:3000/agent-dev
2. Type "hi"
3. Watch text appear word-by-word instead of all at once

---

### Option 2: Verify Prompt Optimization (Already Enabled)

Prompt optimization is **ON by default**. To verify:

```bash
cd cove-ai-core
python3 test_prompt_optimization.py
```

Expected output:
```
✅ Target: 30-40% reduction
   ✓ PASSED! Achieved 78.3% reduction
```

To disable (not recommended):

**Edit** `data/prompt_config.json`:
```json
{
  "features": {
    "use_optimized_prompts": false
  }
}
```

---

### Option 3: Enable MCP Routing (Optional)

MCP routing is **OFF by default** (uses direct tool calls).

To enable, add to `.env`:
```bash
USE_MCP_TOOLS=true
```

**Test**:
```bash
cd cove-ai-core
python3 test_mcp_routing.py
```

Expected: `should_use_mcp() = True`

---

## 📊 Monitoring Metrics

### Check Streaming Performance

**Logs to watch**:
```bash
# In AI core logs
INFO:     🚀 First token in 273ms
INFO:     ✅ Streaming complete
```

**What to monitor**:
- First token time (target: <2s, expect: 200-500ms)
- Total stream time
- Token count

### Check Prompt Optimization

**Logs to watch**:
```bash
INFO:     📝 Using template: greeting
INFO:     Template: system_prompt_tokens=~7
```

**What to monitor**:
- Template selection per intent
- Token reduction vs default
- Response quality

### Check MCP Routing

**Logs to watch**:
```bash
INFO:     🔀 Routing 'recommend_products' via direct
INFO:     ✅ Tool 'recommend_products' completed via direct in 1234ms
```

**What to monitor**:
- Routing decisions (mcp vs direct)
- Success rates
- Fallback behavior

---

## 🧪 Testing Checklist

### Smoke Tests

**1. Streaming Endpoint**:
```bash
curl -N -X POST http://localhost:8000/ai/agent/query/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "hi"}'
```
Expected: SSE events with tokens

**2. Prompt Optimization**:
```bash
curl -X POST http://localhost:8000/ai/agent/query/stream \
  -d '{"message": "show me hoodies"}'
```
Check logs for: `📝 Using template: discover`

**3. Different Intents**:
```bash
# Greeting
curl -X POST ... -d '{"message": "hello"}'
# Policy
curl -X POST ... -d '{"message": "what is your return policy"}'
# Size/fit
curl -X POST ... -d '{"message": "what size should I get"}'
```

Each should use appropriate template (check logs)

---

### Browser Test

**URL**: http://localhost:3000/agent-dev

**Test Cases**:

1. **Greeting** - Type: "hi"
   - ✅ Should see typing animation
   - ✅ Text appears word-by-word
   - ✅ Short, friendly response

2. **Discovery** - Type: "show me hoodies"
   - ✅ Streaming works
   - ✅ Product cards appear
   - ✅ Concise intro text

3. **Policy** - Type: "what is your return policy"
   - ✅ Streaming works
   - ✅ Direct, clear answer
   - ✅ Suggests checking website if details unknown

4. **Size/Fit** - Type: "I'm 175cm 70kg, what size"
   - ✅ Streaming works
   - ✅ Practical sizing advice
   - ✅ 2-3 sentence response

---

## 🔧 Troubleshooting

### Streaming Not Working

**Symptom**: Text appears all at once, no animation

**Check**:
1. Frontend env variable set: `NEXT_PUBLIC_USE_STREAMING=true`
2. Frontend restarted after env change
3. Browser console for errors
4. AI core logs show streaming endpoint being hit

**Fix**:
```bash
# Verify env
cat frontend/.env.local | grep STREAMING

# Restart frontend
cd frontend
npm run dev
```

### Prompts Not Optimized

**Symptom**: Logs show "Using template: agent_chat" for all intents

**Check**:
1. Template files exist: `ls cove-ai-core/data/prompts/`
2. Config file exists: `cat cove-ai-core/data/prompt_config.json`
3. Feature enabled in config

**Fix**:
```bash
# Verify templates
ls cove-ai-core/data/prompts/*.txt

# Test optimization
cd cove-ai-core
python3 test_prompt_optimization.py
```

### Slow Responses

**Symptom**: First token > 2 seconds

**Check**:
1. OpenRouter API working
2. Network latency
3. Prompt optimization enabled

**Debug**:
```bash
# Check logs for timing
tail -f cove-ai-core/logs/*.log | grep "first_token"
```

---

## 📈 Performance Expectations

### With All Features Enabled

| Metric | Expected Value |
|--------|----------------|
| **First Token** | 200-500ms |
| **Full Response** | 1-3 seconds |
| **Token Reduction** | 70-80% |
| **Streaming UX** | Instant feedback |

### Compared to Before

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Perceived Latency | 5-7s | <1s | **7x faster** |
| Input Tokens | 336/query | 67/query | **80% less** |
| User Experience | "Loading..." | Live typing | **Much better** |

---

## 🎯 Gradual Rollout Strategy

### Phase 1: Internal Testing (Week 1)

1. Enable streaming on agent-dev only
2. Monitor metrics for 1 week
3. Gather team feedback
4. Fix any issues

**Metrics to watch**:
- First token time (p95 should be <2s)
- Error rate (should be <1%)
- User satisfaction

### Phase 2: Beta Users (Week 2)

1. Enable for 10% of users
2. A/B test streaming vs blocking
3. Compare satisfaction scores
4. Monitor cost savings

**Success criteria**:
- No increase in errors
- Positive user feedback
- Token savings as expected

### Phase 3: Full Rollout (Week 3+)

1. Gradually increase to 50%, then 100%
2. Keep old endpoint as fallback
3. Monitor continuously
4. Optimize based on data

---

## 🔒 Safety Features

### Automatic Fallbacks

1. **Streaming fails** → Falls back to blocking
2. **Template missing** → Uses default prompt
3. **MCP fails** → Falls back to direct calls

### Feature Flags

All features can be instantly disabled:

```bash
# Disable streaming
NEXT_PUBLIC_USE_STREAMING=false

# Disable prompt optimization
# Edit data/prompt_config.json: use_optimized_prompts: false

# Disable MCP
USE_MCP_TOOLS=false
```

### Monitoring Alerts

Recommended alerts:
- First token > 3s for 5 minutes → Investigate
- Error rate > 5% → Rollback
- Token count increase → Check config

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Smoke tests completed
- [ ] Browser tests successful
- [ ] Metrics baseline established
- [ ] Rollback plan ready

### Deployment

- [ ] Backup current configuration
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Verify health endpoints
- [ ] Enable feature flags gradually

### Post-Deployment

- [ ] Monitor first-token metrics
- [ ] Check error rates
- [ ] Gather user feedback
- [ ] Review cost savings
- [ ] Document any issues

---

## 🎓 Best Practices

### DO

✅ Start with streaming disabled, enable gradually  
✅ Monitor metrics for 24-48 hours before full rollout  
✅ Keep old endpoints as fallback  
✅ Test with real user queries  
✅ Document any configuration changes  

### DON'T

❌ Enable everything at once in production  
❌ Remove old endpoints immediately  
❌ Skip monitoring during rollout  
❌ Ignore error rate increases  
❌ Hardcode values (use config files)  

---

## 🆘 Emergency Rollback

If anything goes wrong:

### Quick Disable

```bash
# Frontend - disable streaming
echo "NEXT_PUBLIC_USE_STREAMING=false" >> frontend/.env.local

# Backend - comment out streaming router
# Edit cove-ai-core/app/main.py
# Comment: # app.include_router(streaming.router, prefix="/ai")

# Restart services
pm2 restart all  # or your process manager
```

### Full Rollback

```bash
# Restore from backup
git checkout HEAD~1  # or previous stable commit

# Restart all services
./scripts/restart_all.sh
```

---

## 📞 Support

### Logs Location

```bash
# AI Core
tail -f cove-ai-core/logs/app.log

# Frontend (Next.js)
# Check browser console + terminal output

# Backend (Django)
tail -f backend/logs/django.log
```

### Common Issues

1. **"Streaming not working"** → Check env variables, restart frontend
2. **"Slow responses"** → Check OpenRouter API status, verify optimization enabled
3. **"Template not found"** → Verify template files exist, check config
4. **"MCP errors"** → Disable MCP flag, use direct calls

---

**Status**: ✅ Ready for deployment!

**Recommended**: Start with streaming on agent-dev, monitor for 24h, then gradual rollout.
