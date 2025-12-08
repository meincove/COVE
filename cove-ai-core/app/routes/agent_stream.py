# app/routes/agent_stream.py
"""
Professional streaming agent endpoint.
Emits real-time events as agent works - NO FAKE DELAYS!
Handles ALL agent response types - NO HARDCODING!
"""
import json
import asyncio
from typing import AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.routes.agent import AgentIn, _agent_query_impl, log
from app.core.events import set_event_emitter, clear_event_emitter

router = APIRouter(prefix="/ai/agent", tags=["agent"])


async def stream_agent_with_events(body: AgentIn) -> AsyncGenerator[str, None]:
    """
    Stream agent response with REAL-TIME event emission.
    Handles ALL agent response types - no hardcoding!
    """
    
    # Buffer for events emitted by agent
    events_queue = asyncio.Queue()
    
    def event_handler(event_type: str, data: dict):
        """Capture events emitted by agent during work"""
        try:
            events_queue.put_nowait((event_type, data))
        except asyncio.QueueFull:
            log.warning(f"Event queue full, dropping event: {event_type}")
    
    try:
        # Set event emitter for this request context
        set_event_emitter(event_handler)
        
        # Create task to run agent (it will emit events as it works)
        agent_task = asyncio.create_task(_agent_query_impl(body))
        
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
            yield f"event: answer\ndata: {json.dumps(answer_data)}\n\n"

        
        # Always send done event
        yield f"event: done\ndata: {json.dumps({'kind': result.kind})}\n\n"
        
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
