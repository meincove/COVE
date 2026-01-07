# Celery Integration Implementation Plan

## Goal

Replace broken FastAPI BackgroundTasks with Celery - a production-grade distributed task queue system for reliable, scalable background fact extraction.

## Why Celery?

**Current Problem**: FastAPI BackgroundTasks silently fails - tasks start but don't complete
**Celery Solution**: 
- ✅ Tasks run in separate worker processes
- ✅ Automatic retries on failure
- ✅ Task monitoring and status tracking
- ✅ Persistent task queue (survives crashes)
- ✅ Scalable (multiple workers, multiple servers)

## Architecture

```
┌─────────────────┐
│   FastAPI App   │
│   (Port 8000)   │
│                 │
│  1. Enqueue     │
│     task        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redis Broker   │
│  (Port 6379)    │
│                 │
│  Task Queue     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Celery Worker  │
│  (Separate      │
│   Process)      │
│                 │
│  2. Execute     │
│     fact        │
│     extraction  │
│                 │
│  3. Store in    │
│     Django DB   │
└─────────────────┘
```

## Implementation Steps

### Phase 1: Setup & Configuration

#### 1.1 Install Dependencies
```bash
cd cove-ai-core
source .venv/bin/activate
pip install celery[redis] redis
```

#### 1.2 Start Redis
```bash
# Check if Redis is installed
redis-cli ping

# If not installed:
brew install redis  # macOS
# or
sudo apt-get install redis-server  # Linux

# Start Redis
redis-server
```

#### 1.3 Create Celery App Configuration

**File**: `app/celery_app.py`

```python
from celery import Celery
import os

# Celery configuration
celery_app = Celery(
    'cove_tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

# Configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)
```

### Phase 2: Define Fact Extraction Task

**File**: `app/tasks/fact_extraction.py`

```python
from app.celery_app import celery_app
from app.services.fact_extractor import get_fact_extractor
from app.services.fact_storage import store_facts
import logging

log = logging.getLogger(__name__)

@celery_app.task(
    name='extract_and_store_facts',
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
def extract_and_store_facts_task(
    self,
    user_message: str,
    assistant_response: str,
    items_meta: list,
    intent_kind: str,
    clerk_user_id: str,
    guest_session_id: str
):
    """
    Celery task for fact extraction and storage.
    
    Runs in separate worker process.
    Automatically retries on failure.
    """
    try:
        log.info(f"🔍 [CELERY] Starting fact extraction for session {guest_session_id}")
        
        # Get fact extractor
        fact_extractor = get_fact_extractor()
        
        # Prepare metadata
        agent_metadata = {
            "items": items_meta,
            "intent_kind": intent_kind,
            "kind": "answer"
        }
        
        # Extract facts (this is async, need to handle properly)
        import asyncio
        facts = asyncio.run(fact_extractor.extract_facts(
            user_message=user_message,
            assistant_response=assistant_response,
            agent_metadata=agent_metadata
        ))
        
        log.info(f"📊 [CELERY] Extracted {len(facts.get('product_focus', {}).get('current_products', []))} products")
        
        # Store facts
        stored = asyncio.run(store_facts(
            clerk_user_id=clerk_user_id,
            guest_session_id=guest_session_id,
            facts=facts
        ))
        
        if stored:
            log.info(f"💾 [CELERY] Facts stored successfully for session {guest_session_id}")
            return {"status": "success", "products": len(facts.get('product_focus', {}).get('current_products', []))}
        else:
            log.warning(f"⚠️ [CELERY] Facts storage failed for session {guest_session_id}")
            raise Exception("Facts storage failed")
            
    except Exception as e:
        log.error(f"❌ [CELERY] Fact extraction failed: {e}", exc_info=True)
        # Retry the task
        raise self.retry(exc=e)
```

### Phase 3: Integrate with FastAPI

**File**: `app/routes/agent.py`

```python
# Remove old background task code
# Replace with Celery task enqueue

from app.tasks.fact_extraction import extract_and_store_facts_task

# In agent_query_impl, replace:
# background_tasks.add_task(_trigger_fact_extraction_background, body, out)

# With:
if hasattr(out, "items") and out.items:
    try:
        items_meta = [item.dict() for item in out.items]
    except Exception:
        items_meta = [dict(item) for item in out.items]
    
    debug_plan = getattr(out, "debug_plan", {}) or {}
    
    # Enqueue Celery task (non-blocking, instant)
    extract_and_store_facts_task.delay(
        user_message=body.message,
        assistant_response=getattr(out, "answer", ""),
        items_meta=items_meta,
        intent_kind=debug_plan.get("intent_kind", "unknown"),
        clerk_user_id=body.clerkUserId or "",
        guest_session_id=body.guestSessionId or ""
    )
    
    log.info(f"📤 [CELERY] Fact extraction task enqueued for session {body.guestSessionId}")
```

### Phase 4: Worker Deployment

#### 4.1 Start Celery Worker

```bash
# Development
celery -A app.celery_app worker --loglevel=info

# Production (with autoscaling)
celery -A app.celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --max-tasks-per-child=1000 \
    --time-limit=300
```

#### 4.2 Process Management (Production)

Use **Supervisor** or **systemd** to manage worker process:

**File**: `/etc/supervisor/conf.d/celery_worker.conf`

```ini
[program:celery_worker]
command=/path/to/venv/bin/celery -A app.celery_app worker --loglevel=info
directory=/path/to/cove-ai-core
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/celery/worker.err.log
stdout_logfile=/var/log/celery/worker.out.log
```

### Phase 5: Monitoring

#### 5.1 Flower (Celery Monitoring Tool)

```bash
pip install flower

# Start Flower dashboard
celery -A app.celery_app flower --port=5555
```

Access at: `http://localhost:5555`

#### 5.2 Task Status Checking

```python
# Check task status
from app.tasks.fact_extraction import extract_and_store_facts_task

result = extract_and_store_facts_task.delay(...)
task_id = result.id

# Later, check status
from celery.result import AsyncResult
task_result = AsyncResult(task_id, app=celery_app)

print(task_result.state)  # PENDING, STARTED, SUCCESS, FAILURE
print(task_result.info)   # Result or error info
```

## Testing Strategy

### Test 1: Basic Functionality
```python
# Enqueue task
result = extract_and_store_facts_task.delay(
    user_message="show me tees",
    assistant_response="Here are some tees...",
    items_meta=[...],
    intent_kind="discover",
    clerk_user_id="",
    guest_session_id="test_session"
)

# Wait for completion
result.get(timeout=30)

# Verify facts stored
# Check Django API for facts
```

### Test 2: Retry on Failure
```python
# Simulate failure (e.g., Django API down)
# Verify task retries 3 times
# Check Flower dashboard for retry attempts
```

### Test 3: Load Testing
```python
# Enqueue 100 tasks simultaneously
# Verify all complete successfully
# Check worker performance
```

## Configuration Files

### requirements.txt
```
celery[redis]==5.3.4
redis==5.0.1
flower==2.0.1  # Optional, for monitoring
```

### .env
```
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

## Deployment Checklist

- [ ] Install Redis
- [ ] Install Celery dependencies
- [ ] Create `app/celery_app.py`
- [ ] Create `app/tasks/fact_extraction.py`
- [ ] Update `app/routes/agent.py`
- [ ] Start Redis server
- [ ] Start Celery worker
- [ ] Test task execution
- [ ] Set up Flower monitoring
- [ ] Configure process manager (Supervisor/systemd)
- [ ] Update deployment documentation

## Benefits Over FastAPI BackgroundTasks

| Feature | FastAPI BG | Celery |
|---------|------------|--------|
| Reliability | ❌ Tasks can fail silently | ✅ Persistent queue |
| Retries | ❌ No automatic retries | ✅ Configurable retries |
| Monitoring | ❌ No visibility | ✅ Flower dashboard |
| Scalability | ❌ Single process | ✅ Multiple workers |
| Crash Recovery | ❌ Tasks lost | ✅ Tasks persist |
| Status Tracking | ❌ No status | ✅ Full task lifecycle |

## Next Steps

1. Install dependencies
2. Start Redis
3. Create Celery configuration
4. Define fact extraction task
5. Update agent.py
6. Start worker
7. Test thoroughly
8. Deploy to production

---

**Estimated Time**: 2-3 hours for full implementation and testing
**Complexity**: Medium (requires Redis setup and worker management)
**Production Ready**: Yes, this is the industry-standard approach
