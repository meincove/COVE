"""
Fact Storage Client

Handles communication with Django API to store and retrieve conversation facts.
Includes retry logic, timeout handling, and graceful degradation.
"""

import logging
import httpx
import asyncio
from typing import Dict, Any, Optional

log = logging.getLogger("cove.fact_storage")

# Django API base URL
DJANGO_BASE_URL = "http://localhost:8001"  # Django runs on 8001


async def store_facts(
    clerk_user_id: Optional[str],
    guest_session_id: Optional[str],
    facts: Dict[str, Any],
    max_retries: int = 3
) -> bool:
    """
    Store facts in Django database via API.
    
    Args:
        clerk_user_id: Clerk user ID (optional)
        guest_session_id: Guest session ID (optional)
        facts: The extracted facts to store
        max_retries: Number of retry attempts
        
    Returns:
        True if successful, False otherwise
    """
    if not clerk_user_id and not guest_session_id:
        log.warning("Cannot store facts: no user/session ID provided")
        return False
    
    url = f"{DJANGO_BASE_URL}/ai_profiles/session/facts/"
    payload = {
        "clerk_user_id": clerk_user_id or "",
        "guest_session_id": guest_session_id or "",
        "facts": facts
    }
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("facts_stored"):
                        log.info(f"✅ Facts stored successfully (session_id: {data.get('session_id')})")
                        return True
                    else:
                        log.warning(f"⚠️ Facts storage failed: {data.get('error', 'unknown error')}")
                        return False
                else:
                    log.warning(f"⚠️ Facts storage HTTP {response.status_code}: {response.text}")
                    
        except httpx.TimeoutException:
            log.warning(f"⏱️ Facts storage timeout (attempt {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
                
        except Exception as e:
            log.warning(f"❌ Facts storage error (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
    
    log.error(f"❌ Facts storage failed after {max_retries} attempts")
    return False


async def get_facts(
    clerk_user_id: Optional[str],
    guest_session_id: Optional[str]
) -> Dict[str, Any]:
    """
    Retrieve facts from Django database via API.
    
    Args:
        clerk_user_id: Clerk user ID (optional)
        guest_session_id: Guest session ID (optional)
        
    Returns:
        Facts dictionary (empty dict if not found or error)
    """
    if not clerk_user_id and not guest_session_id:
        log.warning("Cannot retrieve facts: no user/session ID provided")
        return {}
    
    url = f"{DJANGO_BASE_URL}/ai_profiles/session/facts/get/"
    params = {}
    if clerk_user_id:
        params["clerk_user_id"] = clerk_user_id
    if guest_session_id:
        params["guest_session_id"] = guest_session_id
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                facts = data.get("facts", {})
                log.info(f"📥 Retrieved facts (session_id: {data.get('session_id')})")
                return facts
            else:
                log.warning(f"⚠️ Facts retrieval HTTP {response.status_code}: {response.text}")
                return {}
                
    except httpx.TimeoutException:
        log.warning("⏱️ Facts retrieval timeout")
        return {}
        
    except Exception as e:
        log.warning(f"❌ Facts retrieval error: {e}")
        return {}
