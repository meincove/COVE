# Implementation Plan: Database Storage for Conversation Facts

## Goal
Store extracted conversation facts in `ChatSession.metadata` with production-ready reliability, atomic updates, and proper error handling.

---

## User Review Required

> [!IMPORTANT]
> **Concurrency Strategy**: We'll use Django's `select_for_update()` to prevent race conditions when multiple requests update the same session simultaneously.

> [!WARNING]
> **Performance Trade-off**: Locking adds ~10-50ms latency per update, but ensures data integrity. Since fact extraction runs in background, this won't affect user response time.

---

## Proposed Changes

### 1. Django API Endpoint for Fact Storage

#### [NEW] `backend/ai_profiles/views.py` - Add endpoint

**Purpose**: Provide atomic API to update session facts

```python
@api_view(['POST'])
def update_session_facts(request):
    """
    Atomically update conversation facts for a session.
    
    POST /api/ai_profiles/session/facts/
    Body: {
        "clerk_user_id": "...",  # or guest_session_id
        "guest_session_id": "...",
        "facts": {...}  # The extracted facts
    }
    """
```

**Key Features**:
- **Atomic Updates**: Use `select_for_update()` to lock row during update
- **Merge Strategy**: Merge new facts with existing facts (don't overwrite)
- **Auto-create Session**: Create session if it doesn't exist
- **Error Handling**: Return 200 even if update fails (non-critical)

---

### 2. Fact Storage Service (AI Core)

#### [NEW] `cove-ai-core/app/services/fact_storage.py`

**Purpose**: Handle communication with Django API

```python
async def store_facts(
    clerk_user_id: Optional[str],
    guest_session_id: Optional[str],
    facts: Dict[str, Any]
) -> bool:
    """
    Store facts in Django database via API.
    Returns True if successful, False otherwise.
    """
```

**Features**:
- Async HTTP client (httpx)
- Retry logic (3 attempts with exponential backoff)
- Timeout handling (5s timeout)
- Logging for debugging

---

### 3. Integration into Agent Pipeline

#### [MODIFY] `cove-ai-core/app/routes/agent.py`

**Changes**:
1. Import `fact_storage.store_facts()`
2. Call `store_facts()` after fact extraction in background task
3. Log success/failure

**Code Location**: Line ~1220 (inside `extract_facts_background()`)

---

### 4. Fact Retrieval for LLM Context

#### [NEW] Django API endpoint

```python
@api_view(['GET'])
def get_session_facts(request):
    """
    GET /api/ai_profiles/session/facts/?clerk_user_id=X
    Returns: {"facts": {...}}
    """
```

#### [MODIFY] `cove-ai-core/app/routes/agent.py`

**Changes**:
1. Fetch facts at start of `_agent_query_impl()`
2. Inject facts into system prompt via `_history_to_llm_messages()`
3. Use `fact_extractor.get_context_for_llm()` to format facts

---

## Production Best Practices Applied

### 1. **Atomic Updates** (Prevent Race Conditions)
```python
# Django view
with transaction.atomic():
    session = ChatSession.objects.select_for_update().get(...)
    session.metadata['conversation_facts'] = merge_facts(...)
    session.save()
```

**Why**: Prevents two simultaneous requests from overwriting each other's facts.

### 2. **Graceful Degradation**
- If storage fails → Log warning, continue (don't break user experience)
- If retrieval fails → Use empty facts, continue
- Non-blocking background execution

### 3. **Retry Logic with Exponential Backoff**
```python
for attempt in range(3):
    try:
        await store_facts(...)
        break
    except:
        await asyncio.sleep(2 ** attempt)  # 1s, 2s, 4s
```

**Why**: Handles temporary network issues without failing permanently.

### 4. **Proper Indexing**
- `ChatSession` already has indexes on `clerk_user_id` and `guest_session_id`
- Fast lookups for session retrieval

### 5. **Merge Strategy** (Don't Overwrite)
```python
def merge_facts(existing, new):
    # Product focus: replace current, append to history
    # Preferences: merge (new overrides old)
    # Decisions: append
```

**Why**: Preserves historical context while updating current state.

---

## Verification Plan

### Automated Tests

#### Test 1: Fact Storage Unit Test
**File**: `cove-ai-core/tests/test_fact_storage.py` (NEW)

**Command**: 
```bash
cd cove-ai-core
source .venv/bin/activate
python -m pytest tests/test_fact_storage.py -v
```

**What it tests**:
- Store facts successfully
- Merge facts correctly
- Handle missing session (auto-create)
- Handle network errors (retry logic)

#### Test 2: Django API Test
**File**: `backend/ai_profiles/tests.py` (MODIFY)

**Command**:
```bash
cd backend
python manage.py test ai_profiles.tests.TestSessionFactsAPI
```

**What it tests**:
- POST /api/ai_profiles/session/facts/ works
- GET /api/ai_profiles/session/facts/ works
- Atomic updates (concurrent requests)
- Fact merging logic

#### Test 3: Integration Test
**File**: `cove-ai-core/tests/test_fact_integration_e2e.py` (NEW)

**Command**:
```bash
cd cove-ai-core
source .venv/bin/activate
python tests/test_fact_integration_e2e.py
```

**What it tests**:
- Full flow: Extract → Store → Retrieve → Use in LLM
- Multi-turn conversation with fact persistence
- Verify facts are actually used in responses

---

### Manual Testing

#### Scenario 1: Verify Facts are Stored
**Steps**:
1. Start backend: `cd backend && python manage.py runserver`
2. Start AI core: `cd cove-ai-core && source .venv/bin/activate && uvicorn app.main:app --reload`
3. Open frontend: `http://localhost:3000`
4. Have a 5-turn conversation about products
5. Check database:
   ```bash
   cd backend
   python manage.py shell
   >>> from ai_profiles.models import ChatSession
   >>> session = ChatSession.objects.last()
   >>> print(session.metadata.get('conversation_facts'))
   ```
6. **Expected**: See extracted facts with product details

#### Scenario 2: Verify Facts are Used in Responses
**Steps**:
1. Start conversation: "I prefer size M"
2. Ask 5 unrelated questions
3. Ask: "Show me something in my size"
4. **Expected**: AI remembers size M from turn 1

---

## Rollout Strategy

### Phase 1: Storage Only (This PR)
- ✅ Store facts in database
- ✅ Verify storage works
- ❌ Don't inject into LLM yet (next PR)

**Why**: Test storage reliability before changing LLM behavior.

### Phase 2: Retrieval & Injection (Next PR)
- ✅ Fetch facts before each turn
- ✅ Inject into LLM context
- ✅ Verify AI uses facts

**Why**: Separate concerns, easier to debug.

---

## Success Metrics
- **Storage Success Rate**: > 95% of fact extractions stored successfully
- **Retrieval Latency**: < 50ms to fetch facts
- **No Data Loss**: Facts persist across server restarts
- **No Race Conditions**: Concurrent updates don't corrupt data

---

## Risks & Mitigations

**Risk 1**: Database lock contention under high load
- **Mitigation**: Facts update in background (non-blocking)
- **Mitigation**: Lock held for < 10ms (fast update)

**Risk 2**: Network failures between AI core and Django
- **Mitigation**: Retry logic with exponential backoff
- **Mitigation**: Graceful degradation (continue without facts)

**Risk 3**: Fact data grows too large
- **Mitigation**: Limit product history to 20 items
- **Mitigation**: Limit decisions to 20 items
- **Mitigation**: Monitor `metadata` field size

---

## Files to Create/Modify

### New Files
- `backend/ai_profiles/views.py` - Add `update_session_facts()` and `get_session_facts()`
- `cove-ai-core/app/services/fact_storage.py` - Storage client
- `cove-ai-core/tests/test_fact_storage.py` - Unit tests
- `cove-ai-core/tests/test_fact_integration_e2e.py` - Integration test

### Modified Files
- `backend/ai_profiles/urls.py` - Add API routes
- `cove-ai-core/app/routes/agent.py` - Call storage after extraction
