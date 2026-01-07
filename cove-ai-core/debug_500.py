
import asyncio
import logging
from app.services.product import get_available_colors
from app.routes.agent import agent_query, AgentIn

# Setup logging
logging.basicConfig(level=logging.DEBUG)

async def main():
    print("--- Testing get_available_colors ---")
    try:
        colors = get_available_colors("pg-hoodie-corebasics-119") # Example slug
        print(f"Colors for hoodie: {colors}")
    except Exception as e:
        print(f"get_available_colors crashed: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Testing agent_query (blue tees) ---")
    try:
        body = AgentIn(message="Show me blue tees", guestSessionId="debug-500", sessionType="main")
        # agent_query is an endpoint handler, calls it async?
        # It takes (body, background_tasks, request) usually?
        # Let's check signature
        # def agent_query(body: AgentIn, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db)):
        # Ah, it needs Depedencies.
        # But maybe I can import the logic inside it?
        pass 
    except Exception as e:
        print(f"agent_query crashed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
