
import asyncio
import logging
from app.routes.agent import agent_query, AgentIn
from fastapi import Request
from unittest.mock import MagicMock

# Setup logging
logging.basicConfig(level=logging.DEBUG)

async def main():
    print("--- Testing Cart Add via agent_query ---")
    
    # Mock request/bg_tasks
    mock_req = MagicMock()
    mock_bg = MagicMock()
    
    body = AgentIn(
        message="Add it to my cart",
        guestSessionId="debug-cart-1",
        sessionType="main"
    )
    
    try:
        # We need to mock dependencies too? 
        # agent_query(body, background_tasks, request, db)
        # It's an API handler. Calling it directly is hard due to DB session.
        # But wait, agent_query uses `SessionStateManager` which uses Redis/DB?
        # And `get_conn()` which connects to DB.
        # It should work if DB is accessible.
        
        # We can't easily call agent_query directly because of `db: Session = Depends(...)`
        # But we can import the logic or just run the intent check?
        # The override block is inside agent_query.
        
        # I'll just copy the regex check context from agent.py effectively.
        from app.services.intent import looks_like_cart_add
        q = body.message
        print(f"Message: {q}")
        print(f"looks_like_cart_add(q): {looks_like_cart_add(q)}")
        
        if looks_like_cart_add(q):
            print("Override WOULD trigger.")
        else:
            print("Override would NOT trigger.")
            
    except Exception as e:
        print(f"Crashed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
