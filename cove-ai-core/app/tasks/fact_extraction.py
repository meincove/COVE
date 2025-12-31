"""
Celery task for fact extraction and storage.

This task runs in a separate worker process, allowing the main FastAPI
application to respond immediately while fact extraction happens in the background.
"""

from app.celery_app import celery_app
from app.services.fact_extractor import get_fact_extractor
from app.services.fact_storage import store_facts
import logging
import asyncio

log = logging.getLogger(__name__)


@celery_app.task(
    name='extract_and_store_facts',
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # Retry after 60 seconds
    autoretry_for=(Exception,),  # Auto-retry on any exception
    retry_backoff=True,  # Exponential backoff
    retry_backoff_max=600,  # Max 10 minutes between retries
    retry_jitter=True  # Add randomness to prevent thundering herd
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
    Extract facts from conversation and store in database.
    
    This task:
    1. Calls LLM to extract structured facts from conversation
    2. Stores facts in Django database via API
    3. Automatically retries on failure
    4. Logs all steps for monitoring
    
    Args:
        self: Celery task instance (injected by bind=True)
        user_message: User's message
        assistant_response: AI's response
        items_meta: List of product items shown
        intent_kind: Type of intent (discover, compare, etc.)
        clerk_user_id: Clerk user ID (if authenticated)
        guest_session_id: Guest session ID
        
    Returns:
        dict: Status and number of products extracted
        
    Raises:
        Exception: On failure (triggers automatic retry)
    """
    try:
        log.info(f"🔍 [CELERY] Task {self.request.id} starting for session {guest_session_id}")
        log.info(f"🔍 [CELERY] Processing {len(items_meta)} items")
        
        # Get fact extractor
        fact_extractor = get_fact_extractor()
        
        # Prepare metadata
        agent_metadata = {
            "items": items_meta,
            "intent_kind": intent_kind,
            "kind": "answer"
        }
        
        # Extract facts (async function, need to run in event loop)
        log.info(f"🔍 [CELERY] Calling LLM to extract facts...")
        facts = asyncio.run(fact_extractor.extract_facts(
            user_message=user_message,
            assistant_response=assistant_response,
            agent_metadata=agent_metadata
        ))
        
        products_count = len(facts.get('product_focus', {}).get('current_products', []))
        log.info(f"📊 [CELERY] Extracted {products_count} products from conversation")
        
        # Store facts in database
        log.info(f"💾 [CELERY] Storing facts in database...")
        stored = asyncio.run(store_facts(
            clerk_user_id=clerk_user_id,
            guest_session_id=guest_session_id,
            facts=facts
        ))
        
        if stored:
            log.info(f"✅ [CELERY] Task {self.request.id} completed successfully for session {guest_session_id}")
            return {
                "status": "success",
                "products": products_count,
                "session_id": guest_session_id,
                "task_id": self.request.id
            }
        else:
            log.warning(f"⚠️ [CELERY] Facts storage returned False for session {guest_session_id}")
            raise Exception("Facts storage failed - will retry")
            
    except Exception as e:
        log.error(f"❌ [CELERY] Task {self.request.id} failed: {e}", exc_info=True)
        # Re-raise to trigger automatic retry
        raise
