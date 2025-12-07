# Week 6 Monitoring & Troubleshooting Guide

## Monitoring Your COVE AI System

### Health Checks

**Quick Health Check**:
```bash
curl http://localhost:8000/api/health | jq
```

**Expected Response**:
```json
{
  "status": "healthy",
  "checks": {
    "openrouter_configured": "ok",
    "cache": "ok",
    "mcp_client": "ok",
    "prompt_templates": "ok",
    "response_cache": "ok"
  }
}
```

**Status Meanings**:
- `healthy` - All systems operational
- `degraded` - Some components have issues but system functional
- `unhealthy` - Critical issues, system may not work properly

---

### Metrics Dashboard

**View All Metrics**:
```bash
curl http://localhost:8000/api/metrics/dashboard | jq
```

**Key Metrics**:

1. **MCP Routing**:
   ```json
   "mcp": {
     "total_calls": 150,
     "success_rate": 0.98,
     "mcp_calls": 0,
     "direct_calls": 150,
     "avg_duration_ms": 234
   }
   ```

2. **Prompt Optimization**:
   ```json
   "prompts": {
     "total_templates": 9,
     "estimated_reduction": 0.78
   }
   ```

3. **Response Cache**:
   ```json
   "response_cache": {
     "cacheable_intents": ["greeting", "generic", "policy", "small_talk"],
     "enabled": true
   }
   ```

---

### Logging

**Check Logs**:
```bash
# AI Core logs
tail -f cove-ai-core/logs/app.log

# Filter for specific events
tail -f cove-ai-core/logs/app.log | grep "first_token"
tail -f cove-ai-core/logs/app.log | grep "Cache hit"
tail -f cove-ai-core/logs/app.log | grep "ERROR"
```

**Important Log Patterns**:

**Streaming Performance**:
```
🚀 First token in 273ms
✅ Streaming complete
```

**Cache Hits**:
```
💾 Using cached response for greeting
Cache hit for generic: what is cove...
```

**Errors**:
```
❌ Tool 'cart_add' failed: All connection attempts failed
❌ Tool 'recommend_products' timed out after 30s
```

---

## Common Issues & Solutions

### Issue 1: Slow Response Times

**Symptoms**: First token >2 seconds, users waiting too long

**Diagnosis**:
```bash
# Check logs
tail -f logs/app.log | grep "first_token"

# Look for: "🚀 First token in XXXms"
# If >2000ms, investigate
```

**Solutions**:
1. **Enable caching**:
   ```bash
   export ENABLE_RESPONSE_CACHE=true
   ```

2. **Check OpenRouter status**:
   - Visit https://status.openrouter.ai/
   - Try different model if issues

3. **Verify prompt optimization enabled**:
   ```bash
   curl http://localhost:8000/api/health | jq '.checks.prompt_templates'
   # Should be "ok" with templates_count: 9
   ```

---

### Issue 2: Cache Not Working

**Symptoms**: Same query takes same time every request

**Diagnosis**:
```bash
# Check cache stats
curl http://localhost:8000/api/metrics/dashboard | jq '.response_cache'

# Should show enabled: true
```

**Solutions**:
1. **Verify cache enabled**:
   ```python
   # Check data/prompt_config.json
   cat data/prompt_config.json | jq '.features.use_optimized_prompts'
   ```

2. **Check logs for cache hits**:
   ```bash
   tail -f logs/app.log | grep "Cache hit"
   # Should see hits for repeated queries
   ```

3. **Verify intent classification**:
   ```bash
   # Test with greeting
   curl -X POST http://localhost:8000/ai/agent/query/stream \
     -d '{"message": "hi"}'
   
   # Check logs for: "💾 Using cached response for greeting"
   ```

---

### Issue 3: MCP Errors

**Symptoms**: Tools failing, errors about tool routing

**Diagnosis**:
```bash
# Check MCP status
curl http://localhost:8000/api/health | jq '.checks.mcp_client'

# Check routing
python3 test_mcp_routing.py
```

**Solutions**:
1. **Disable MCP if issues** (fallback to direct):
   ```bash
   export USE_MCP_TOOLS=false
   # Restart server
   ```

2. **Check tool configuration**:
   ```bash
   cat data/mcp_config.json | jq '.tools'
   ```

3. **Review error logs**:
   ```bash
   tail -f logs/app.log | grep "MCP"
   ```

---

### Issue 4: OpenRouter API Errors

**Symptoms**: "quota exceeded", "invalid API key", "model not found"

**Diagnosis**:
```bash
# Check API key configured
env | grep OPENROUTER_API_KEY

# Check model configured
env | grep GEN_MODEL
```

**Solutions**:
1. **Verify API key**:
   ```bash
   # Test manually
   curl https://openrouter.ai/api/v1/models \
     -H "Authorization: Bearer $OPENROUTER_API_KEY"
   ```

2. **Check quota**:
   - Visit OpenRouter dashboard
   - Check remaining credits

3. **Try different model**:
   ```bash
   export GEN_MODEL="openrouter:openai/gpt-3.5-turbo"
   # Restart server
   ```

---

## Performance Optimization

### Target Metrics

| Metric | Target | Good | Needs Improvement |
|--------|--------|------|-------------------|
| **First Token** | <500ms | <1s | >2s |
| **Total Response** | <2s | <3s | >5s |
| **Cache Hit Rate** | 30-40% | >20% | <10% |
| **Error Rate** | <0.5% | <1% | >2% |

### Optimization Checklist

- [ ] Prompt optimization enabled (9 templates)
- [ ] Response caching enabled
- [ ] Cache TTLs appropriate (1-24 hours)
- [ ] Using fast model (gpt-4o-mini, not gpt-4)
- [ ] Timeouts configured (30s default)
- [ ] Error handling with fallbacks

---

## Alerts & Monitoring

### Recommended Alerts

**Critical** (page on-call):
- Health check failing for >5 minutes
- Error rate >5% for >5 minutes
- All OpenRouter API calls failing

**Warning** (notify team):
- First token time >3s for >10 minutes
- Cache hit rate <10% for >30 minutes
- Disk space >80%

**Info**:
- New deployment
- Configuration changes
- Weekly metric summary

---

## Production Checklist

Before deploying to production:

### Configuration
- [ ] `OPENROUTER_API_KEY` set
- [ ] `GEN_MODEL` configured
- [ ] Feature flags reviewed
- [ ] Cache TTLs appropriate
- [ ] Timeouts configured

### Monitoring
- [ ] Health check endpoint working
- [ ] Metrics dashboard accessible
- [ ] Logging configured
- [ ] Alerts set up

### Testing
- [ ] Smoke tests passing
- [ ] Cache working
- [ ] Streaming working
- [ ] Error handling tested

### Documentation
- [ ] Runbook updated
- [ ] On-call guide ready
- [ ] Rollback procedure documented

---

## Getting Help

**Check First**:
1. Health check: `curl http://localhost:8000/api/health`
2. Logs: `tail -f logs/app.log`
3. This guide's troubleshooting section

**Still Stuck?**:
1. Check deployment guide: `DEPLOYMENT_CACHE.md`
2. Review Week 5/6 walkthroughs
3. Test scripts: `test_prompt_optimization.py`, `test_mcp_routing.py`

---

**Last Updated**: Week 6 (December 2025)  
**Maintainer**: AI Core Team
