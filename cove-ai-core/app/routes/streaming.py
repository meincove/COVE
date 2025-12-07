# app/routes/streaming.py
"""
Streaming endpoint for Week 5 - NEW endpoint, existing agent.py untouched.

Provides SSE (Server-Sent Events) streaming for real-time agent responses.
This is ADDITIVE - existing /ai/agent/query endpoint remains unchanged.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import logging
import time

from app.core.llm_streaming import stream_openai_completion
# Import from existing agent.py - we're NOT modifying it
from app.routes.agent import AgentIn

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/agent/query/stream", tags=["ai", "streaming"])
async def agent_query_stream(body: AgentIn):
    """
    Stream agent response via Server-Sent Events (SSE).
    
    This is a NEW endpoint - existing /ai/agent/query is unchanged.
    
    Returns:
        StreamingResponse with text/event-stream content
        
    Events:
        - intent: Intent classification result
        - stream_start: Beginning of LLM response
        - token: Each text chunk
        - stream_end: Completion
        - error: Error occurred
        
    Example:
        const eventSource = new EventSource('/ai/agent/query/stream');
        eventSource.addEventListener('token', (e) => {
            console.log(e.data); // {"token": "Hello"}
        });
    """
    
    async def event_generator():
        """Generate SSE events."""
        start_time = time.time()
        
        try:
            # 1. Classify intent (fast, should be <100ms)
            logger.info(f"📥 Streaming query: {body.message[:50]}...")
            
            intent_start = time.time()
            intent_kind = "generic"  # Default fallback
            
            try:
                # Try to use existing intent classification
                # This function should exist in agent.py
                intent_kind = classify_intent_simple(body.message)
            except Exception as e:
                logger.warning(f"Intent classification failed, using generic: {e}")
            
            intent_ms = (time.time() - intent_start) * 1000
            
            # Send intent event
            yield f"event: intent\n"
            yield f"data: {json.dumps({'intent': intent_kind, 'time_ms': intent_ms})}\n\n"
            # 2. Check response cache (Week 6 optimization)
            from app.core.response_cache import get_cached_response, cache_response
            
            cached_response = await get_cached_response(intent_kind, body.message)
            if cached_response:
                # Stream cached response token by token
                logger.info(f"💾 Using cached response for {intent_kind}")
                
                yield f"event: stream_start\n"
                yield f"data: {{\"cached\": true}}\n\n"
                
                # Stream cached text word by word for animation
                words = cached_response.split()
                for i, word in enumerate(words):
                    token = word + (" " if i < len(words) - 1 else "")
                    yield f"event: token\n"
                    yield f"data: {json.dumps({'token': token})}\n\n"
                
                yield f"event: stream_end\n"
                yield f"data: {json.dumps({'total_time_ms': 0, 'token_count': len(words), 'cached': True})}\n\n"
                return
            
            # 3. Build optimized messages for LLM
            # Use intent-specific templates (Week 5 Phase 3)
            from app.core.prompt_builder import build_messages_for_intent
            
            messages, prompt_meta = build_messages_for_intent(
                intent_kind=intent_kind,
                user_message=body.message
            )
            
            # Log prompt optimization stats
            logger.info(f"📝 Using template: {prompt_meta['template']}", extra={
                "intent": intent_kind,
                "template": prompt_meta['template'],
                "system_prompt_tokens": prompt_meta['system_prompt_length'] // 4,  # Rough estimate
                "max_tokens": prompt_meta['max_tokens']
            })
            
            # 4. Stream LLM response with template-specific parameters
            yield f"event: stream_start\n"
            yield f"data: {json.dumps({})}\n\n"
            
            token_count = 0
            accumulated_response = ""  # For caching
            async for token in stream_openai_completion(
                messages,
                model="gpt-4o-mini",
                temperature=prompt_meta.get('temperature', 0.7),
                max_tokens=prompt_meta.get('max_tokens', 200)
            ):
                token_count += 1
                accumulated_response += token
                
                # Send each token as SSE event
                yield f"event: token\n"
                yield f"data: {json.dumps({'token': token})}\n\n"
            
            # 5. Cache response for future use (Week 6)
            if accumulated_response:
                await cache_response(intent_kind, body.message, accumulated_response)
            
            # 6. Send completion event
            total_ms = (time.time() - start_time) * 1000
            
            yield f"event: stream_end\n"
            yield f"data: {json.dumps({'total_time_ms': total_ms, 'token_count': token_count})}\n\n"
            
            logger.info(f"✅ Stream complete in {total_ms:.0f}ms ({token_count} tokens)")
            
        except Exception as e:
            logger.error(f"❌ Streaming error: {e}", exc_info=True)
            
            # Send error event
            yield f"event: error\n"
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


def classify_intent_simple(message: str) -> str:
    """
    Fallback intent classifier if we can't import from agent.py.
    
    This is a simplified version - real one in agent.py is better.
    """
    message_lower = message.lower()
    
    # Simple keyword matching
    if any(word in message_lower for word in ["show", "find", "recommend", "hoodie", "tee", "bomber"]):
        return "discover"
    elif any(word in message_lower for word in ["size", "fit", "tall", "cm", "kg"]):
        return "size_fit"
    elif any(word in message_lower for word in ["checkout", "pay", "buy", "purchase"]):
        return "checkout_start"
    elif any(word in message_lower for word in ["order", "history", "bought"]):
        return "order_query"
    elif any(word in message_lower for word in ["shipping", "delivery", "return", "wash"]):
        return "policy"
    else:
        return "generic"
