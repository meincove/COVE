import asyncio
import logging
import sys
import os
from unittest.mock import patch, MagicMock

# Set up path
sys.path.append(os.getcwd())

from app.agents.outfit_builder_agent import OutfitBuilderAgent
from app.schemas.agent import AgentItem

# Setup logging
logging.basicConfig(level=logging.ERROR)

async def test_notification_structure():
    print("🧪 Starting test_notification_structure...")
    
    # Mock the dependencies
    with patch("app.agents.outfit_builder_agent.search_by_outfit_category") as mock_search:
        # Force strict search to return nothing (simulating no items found)
        mock_search.return_value = []
        
        # Mock LLM planning to return a basic plan
        with patch("app.agents.outfit_builder_agent.OutfitBuilderAgent._plan_outfit") as mock_plan:
            mock_plan.return_value = {
                "categories": ["tops"],
                "search_queries": {"tops": "shirt"},
                "banned_terms": {}
            }
            
            agent = OutfitBuilderAgent("test_builder")
            
            # Task that will trigger the mock returning empty results
            task = {
                "budget_max": 500,
                "gender": "male",
                "style": "casual",
                "occasion": "test",
                "num_outfits": 1
            }
            
            context = {}
            
            print("▶️ Running agent execution...")
            try:
                result = await agent.execute(task, context)
                print("✅ Agent execution finished.")
                
                items = result.data.get("outfit_items", [])
                print(f"📦 Got {len(items)} items.")
                
                for i, item in enumerate(items):
                    print(f"--- Item {i} ---")
                    print(f"Title: {item.get('title')}")
                    print(f"Type: {item.get('type')}")
                    
                    # Validate against AgentItem schema
                    try:
                        # Pydantic validation
                        obj = AgentItem(**item)
                        print(f"✅ Pydantic Validation Passed for Item {i}")
                    except Exception as e:
                        print(f"❌ Pydantic Validation FAILED for Item {i}: {e}")
                        # Print generic check
                        missing = [k for k in ["title", "slug", "url"] if k not in item]
                        if missing:
                            print(f"   Missing keys: {missing}")

            except Exception as e:
                print(f"❌ Execution failed: {e}")
                import traceback
                traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_notification_structure())
