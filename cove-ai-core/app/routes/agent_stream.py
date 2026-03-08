# app/routes/agent_stream.py
"""
Professional streaming agent endpoint.
Emits real-time events as agent works - NO FAKE DELAYS!
Handles ALL agent response types - NO HARDCODING!
"""
import json
import asyncio
import os
from typing import AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.routes.agent import AgentIn, _agent_query_impl, log
from app.core.events import set_event_emitter, clear_event_emitter
from app.core.suggested_actions import get_suggestions_engine

router = APIRouter(prefix="/ai/agent", tags=["agent"])


async def stream_agent_with_events(body: AgentIn) -> AsyncGenerator[str, None]:
    """
    Stream agent response with REAL-TIME event emission.
    Handles ALL agent response types - no hardcoding!
    """
    
    # Buffer for events emitted by agent
    max_queue = int(os.getenv("AGENT_STREAM_MAX_QUEUE", "200"))
    events_queue = asyncio.Queue(maxsize=max_queue)
    
    def event_handler(event_type: str, data: dict):
        """Capture events emitted by agent during work"""
        try:
            events_queue.put_nowait((event_type, data))
        except asyncio.QueueFull:
            log.warning(f"Event queue full, dropping event: {event_type}")
    
    # Phase 1: Create trackers
    from app.core.thinking_tracker import ThinkingTracker
    from app.core.tool_tracker import ToolTracker
    
    thinking_tracker = ThinkingTracker()
    tool_tracker = ToolTracker()
    
    try:
        # Set event emitter for this request context
        set_event_emitter(event_handler)
        
        # Call implementation with trackers
        agent_task = asyncio.create_task(_agent_query_impl(body, thinking_tracker, tool_tracker))
        
        # Stream events as they arrive
        while not agent_task.done():
            try:
                event_type, data = await asyncio.wait_for(
                    events_queue.get(),
                    timeout=0.1
                )
                yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
            except asyncio.TimeoutError:
                continue
        
        # Get agent result
        result = await agent_task
        
        # Stream any remaining buffered events
        while not events_queue.empty():
            event_type, data = events_queue.get_nowait()
            yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
        
        # === HANDLE ALL RESPONSE TYPES ===
        
        # 1. Recommendations (product search)
        if result.kind == "recommendations":
            if result.answer:
                yield f"event: intro\ndata: {json.dumps({'text': result.answer})}\n\n"
            
            if result.items:
                batch_size = 2
                total_batches = (len(result.items) + batch_size - 1) // batch_size
                
                for i in range(0, len(result.items), batch_size):
                    batch = result.items[i:i + batch_size]
                    items_data = [item.dict() for item in batch]
                    batch_num = i // batch_size + 1
                    
                    yield f"event: items:batch\ndata: {json.dumps({'items': items_data, 'batch': batch_num, 'total_batches': total_batches})}\n\n"
        
        # 2. Cart Proposal (add to cart requests)
        elif result.kind == "cart_proposal":
            cart_data = {
                'answer': result.answer,
                'cart_payload': result.cart_payload,
                'items': [item.dict() for item in result.items] if result.items else []
            }
            yield f"event: cart_proposal\ndata: {json.dumps(cart_data)}\n\n"
        
        # 3. Checkout Ready (checkout requests)
        elif result.kind == "checkout_ready":
            checkout_data = result.checkout if result.checkout else {}
            checkout_payload = {
                'answer': result.answer,
                'paymentUrl': checkout_data.get('paymentUrl'),
                'checkoutPageUrl': checkout_data.get('checkoutPageUrl') or '/checkoutpage',
                'total': checkout_data.get('total') or 0,
                'currency': checkout_data.get('currency') or 'EUR'
            }
            yield f"event: checkout\ndata: {json.dumps(checkout_payload)}\n\n"
        
        # 4. Plain Answer (questions, general chat)
        else:  # kind == "answer" or anything else
            answer_data = {
                'text': result.answer,
                'citations': result.citations if result.citations else []
            }
            # Include question_options for interactive conversation flow UI
            if hasattr(result, 'question_options') and result.question_options:
                answer_data['question_options'] = result.question_options
            yield f"event: answer\ndata: {json.dumps(answer_data)}\n\n"

        
        # === GENERATE SUGGESTED ACTIONS ===
        # PREFER Verifier suggestions (context-aware) over engine suggestions
        suggested_actions = None
        
        # Check if Verifier provided suggestions
        if hasattr(result, 'suggestions') and result.suggestions:
            # Convert Verifier's string suggestions to UI format
            suggested_actions = [
                {"id": f"verifier_{i}", "text": s, "query": s, "type": "question", "icon": "sparkles", "priority": i+1}
                for i, s in enumerate(result.suggestions)
            ]
            log.debug("[SUGGESTIONS] Using %s verifier suggestions: %s", len(suggested_actions), result.suggestions)
        else:
            # Fallback to engine-generated suggestions
            suggestions_context = {
                "items": [item.dict() for item in result.items] if result.items else [],
                "cart_payload": result.cart_payload if hasattr(result, 'cart_payload') else None,
                "checkout_data": result.checkout if hasattr(result, 'checkout') else None,
                "orders": result.orders if hasattr(result, 'orders') else [],
                "user_has_size": bool(body.userPreferences and body.userPreferences.get('size')) if hasattr(body, 'userPreferences') else False,
                "user_has_orders": False,
                "has_color_variants": False,
            }
            
            suggestions_engine = get_suggestions_engine()
            suggested_actions = suggestions_engine.generate(
                intent=result.kind,
                context=suggestions_context
            )
            log.debug("[SUGGESTIONS] Using %s engine suggestions", len(suggested_actions) if suggested_actions else 0)
        
        # Emit suggestions if any were generated
        if suggested_actions:
            yield f"event: suggestions\ndata: {json.dumps({'suggestions': suggested_actions})}\n\n"
        
        # Final event: done
        done_data = {
            'kind': result.kind,
            'answer': result.answer if hasattr(result, 'answer') else None,
        }
        
        # Add items if they exist in the result
        if hasattr(result, 'items') and result.items:
            done_data['items'] = [item.dict() for item in result.items]
            log.debug("[STREAMING] Added %s items to done_data", len(result.items))
        else:
            log.debug("[STREAMING] No items in result to add")
        
        # Phase 1: Serialize thinking_events and tools_used from trackers
        try:
            # Use correct methods: get_all_events() and get_summary()
            thinking_events = thinking_tracker.get_all_events() if thinking_tracker else []
            tools_used = tool_tracker.get_summary() if tool_tracker else []
            
            log.debug("[STREAMING] thinking_events count: %s", len(thinking_events))
            log.debug("[STREAMING] tools_used count: %s", len(tools_used))
            
            if thinking_events:
                done_data['thinking_events'] = thinking_events
                log.debug("[STREAMING] Added %s thinking_events to done_data", len(thinking_events))
            
            if tools_used:
                done_data['tools_used'] = tools_used
                log.debug("[STREAMING] Added %s tools_used to done_data", len(tools_used))
        except Exception as e:
            log.debug("[STREAMING] Error serializing trackers: %s", e)
        
        log.debug("[STREAMING] Final done_data keys: %s", list(done_data.keys()))
        yield f"event: done\ndata: {json.dumps(done_data)}\n\n"
        
    except Exception as e:
        log.exception("agent_stream error")
        yield f"event: error\ndata: {json.dumps({'error': str(e), 'message': 'Something went wrong'})}\n\n"
        
    finally:
        clear_event_emitter()


@router.post("/query-stream")
async def agent_query_stream(body: AgentIn):
    """
    Professional SSE streaming endpoint.
    Handles ALL agent response types - no hardcoding!
    """
    return StreamingResponse(
        stream_agent_with_events(body),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
