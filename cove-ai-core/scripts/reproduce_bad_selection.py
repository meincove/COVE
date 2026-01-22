import asyncio
import logging
import os
import sys

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cove.agents.stylist")
logger.setLevel(logging.INFO)

# Ensure app is in path
sys.path.append(os.getcwd())

from app.agents.stylist_agent import StylistAgent
from app.agents.base_agent import AgentResult

def log_result(msg):
    # Print to stdout so we can capture it
    print(msg)

async def run_test():
    log_result("\n--- Running Reproduction Test for Bad Item Selection ---")
    
    agent = StylistAgent("stylist")
    
    # Specific query that caused the issue
    query = "I want a date night formal outfit under 500 euros"
    
    # Context WITHOUT gender to trigger the "unisex" default path
    context = {
        "user_id": "test_user_repro", 
        "chat_history": [] 
    }
    
    log_result(f"Query: {query}")
    
    try:
        # Execute the agent
        task = {"query": query}
        result: AgentResult = await agent.execute(task, context)
        
        # In a real run, the result.data contains 'items' which is a list of selected products
        # We need to inspect this list.
        
        log_result("\n--- Agent Result ---")
        log_result(f"Answer: {result.reasoning}")
        
        candidates = result.data.get("candidates", {})
        log_result(f"Total Categories: {len(candidates)}")
        
        casual_items = []
        formal_items = []
        
        for category, items in candidates.items():
            log_result(f"\n--- Category: {category} ---")
            for item in items:
                title = item.get("title", "Unknown")
                price = item.get("price", "Unknown")
                type_ = item.get("type", "Unknown")
                log_result(f"Candidate: {title} (Type: {type_}, Price: €{price})")
                
                lower_title = title.lower()
                if "tee" in lower_title or "shorts" in lower_title or "hoodie" in lower_title:
                    casual_items.append(title)
                elif "blazer" in lower_title or "trousers" in lower_title or "shirt" in lower_title:
                    formal_items.append(title)
                
        if len(casual_items) > 0:
            log_result(f"\n❌ FAILED: Found CASUAL items in FORMAL request: {casual_items}")
        elif len(formal_items) > 0:
            log_result(f"\n✅ PASSED: Found FORMAL items: {formal_items}")
        else:
            log_result(f"\n⚠️ WARNING: Found no obvious casual OR formal items.")
            
    except Exception as e:
        log_result(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
