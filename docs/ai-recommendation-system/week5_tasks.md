# Week 5 Tasks - Safe Streaming Implementation

**Safety Principle**: Add new functionality, never modify existing working code

---

## Phase 1: Backend Streaming (Additive Only)

### Backend - New Files Only
- [ ] Create `app/core/llm_streaming.py` (NEW file)
  - OpenAI streaming wrapper
  - Token accumulation + yielding
  - First token metrics
  
- [ ] Create `app/routes/streaming.py` (NEW file)
  - New endpoint: `POST /ai/agent/query/stream`
  - SSE event generator
  - Imports from existing `agent.py` (no modifications)
  
- [ ] Register new router in `app/main.py`
  - Add: `app.include_router(streaming.router, prefix="/ai")`
  - Existing routes unchanged

### Verification
- [ ] Test NEW streaming endpoint works
- [ ] Verify OLD blocking endpoint still works
- [ ] Both endpoints can coexist

---

## Phase 2: Frontend Streaming (Opt-In)

### Frontend - Feature Flag Approach
- [ ] Add environment variable `NEXT_PUBLIC_USE_STREAMING=false`
  - Default: `false` (use existing blocking endpoint)
  - Opt-in: `true` (use new streaming endpoint)

- [ ] Create `src/hooks/useAgentStreaming.ts` (NEW file)
  - EventSource logic
  - Typing animation state
  - Independent of existing chat widget

- [ ] Modify `CoveChatWidget.tsx` (minimal, safe changes)
  - Add feature flag check
  - If `USE_STREAMING === true`: use new hook
  - If `USE_STREAMING === false`: use existing code path
  - **Existing code path untouched**

### Verification
- [ ] With flag OFF: everything works as before
- [ ] With flag ON: streaming works
- [ ] Easy toggle between modes

---

## Phase 3: Prompt Optimization (Separate Templates)

### Backend - New Template System
- [ ] Create `app/core/prompt_templates.py` (NEW file)
  - Intent-specific templates
  - Template selection function
  
- [ ] Create `app/core/prompt_builder.py` (NEW file)
  - Uses templates OR falls back to existing prompts
  - No changes to existing prompt code

- [ ] Update `streaming.py` ONLY (not `agent.py`)
  - Streaming endpoint uses new templates
  - Blocking endpoint still uses old prompts

### Verification
- [ ] Blocking endpoint: existing prompts (unchanged)
- [ ] Streaming endpoint: optimized prompts
- [ ] Quality comparison between both

---

## Phase 4: MCP Client (Feature Flag)

### Backend - Optional MCP Integration
- [ ] Create `app/cove_mcp/client.py` (NEW file)
  - MCP client wrapper
  - Tool call routing
  
- [ ] Environment variable: `USE_MCP_TOOLS=false`
  - Default: `false` (direct tool calls - existing behavior)
  - Opt-in: `true` (MCP path)

- [ ] Create `app/core/tool_router.py` (NEW file)
  - Checks `USE_MCP_TOOLS` flag
  - Routes to MCP OR direct calls
  - No changes to existing tool code

### Verification
- [ ] With flag OFF: existing direct calls work
- [ ] With flag ON: MCP path works
- [ ] Easy rollback if issues

---

## Phase 5: Telemetry (Non-Invasive)

### Backend - Metrics Layer
- [ ] Create `app/core/telemetry.py` (NEW file)
  - Performance tracker
  - Context manager for metrics
  
- [ ] Add telemetry to NEW streaming endpoint only
  - Wrap in `track_performance()` context
  - Logs metrics to separate logger
  
- [ ] Existing blocking endpoint: no changes
  - Can add telemetry later if desired

### Verification
- [ ] Metrics collected for streaming requests
- [ ] No impact on existing endpoint
- [ ] Metrics help optimize streaming path

---

## Testing Checklist

### Regression Tests (Must Pass)
- [ ] Existing `/ai/agent/query` endpoint works
- [ ] Product recommendations work
- [ ] Cart operations work
- [ ] Checkout flow works
- [ ] Order history works
- [ ] All Week 4 features still functional

### New Feature Tests
- [ ] Streaming endpoint returns SSE events
- [ ] Frontend can toggle between modes
- [ ] First token arrives <2s
- [ ] Answer quality maintained

---

## Rollback Plan

### If Anything Breaks:

**Streaming Endpoint Issues:**
```bash
# Just disable the new endpoint
# Edit app/main.py, comment out:
# app.include_router(streaming.router)
# Restart server
```

**Frontend Streaming Issues:**
```bash
# In .env.local:
NEXT_PUBLIC_USE_STREAMING=false
# Restart frontend
```

**MCP Issues:**
```bash
# In .env:
USE_MCP_TOOLS=false
# Already the default
```

**Complete Rollback:**
- Remove new files
- Existing code is untouched, works immediately

---

## Safety Guarantees

✅ **No modifications to existing endpoints**
✅ **All new code in separate files**
✅ **Feature flags for easy disable**
✅ **Existing frontend code path unchanged**
✅ **Independent testing of new vs old**
✅ **Instant rollback possible**

---

## Success Criteria

**Week 5 Complete When:**
- [ ] NEW streaming endpoint works
- [ ] OLD blocking endpoint still works (untouched)
- [ ] Frontend can use either mode
- [ ] All Week 4 regression tests pass
- [ ] Streaming provides <2s first token
- [ ] Zero production incidents

**Ready to Deploy When:**
- [ ] Both endpoints coexist successfully
- [ ] Streaming metrics look good
- [ ] A/B test shows no quality regression
- [ ] Team comfortable with new architecture
