
import asyncio
import logging
from app.agents.stylist_agent import StylistAgent

# Setup logging
logging.basicConfig(level=logging.INFO)

async def mock_stream(event):
    print(f"🌊 STREAM: {event.get('event_type')} - {event.get('status') or event.get('message')}")

async def test():
    agent = StylistAgent(name="agent_stylist")
    print("🚀 Starting Stylist Agent Test...")
    
    # Mock context
    messages = [{"role": "user", "content": "outfit for hiking"}]
    
    try:
        result = await agent.execute(
            task={"query": "outfit for hiking"}, 
            context={"budget_max": 500}, 
            stream_callback=mock_stream
        )
        print("✅ Result:", result)
    except Exception as e:
        print("❌ CRASH:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
