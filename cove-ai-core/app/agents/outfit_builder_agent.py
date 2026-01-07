
import logging
from typing import Dict, Any, List

from app.agents.base_agent import BaseAgent, AgentResult
from app.vector.store import search_by_outfit_category

log = logging.getLogger("cove.agents.outfit_builder")

# Budget allocation (v2)
BUDGET_ALLOCATION = {
    "shoes": 0.35,
    "bottoms": 0.35,
    "tops": 0.30,
}
CORE_CATEGORIES = ["tops", "bottoms", "shoes"]

class OutfitBuilderAgent(BaseAgent):
    """
    Outfit Builder Agent v2 - Uses category-constrained vector search.
    
    Replaces v1 logic (text search + filtering) with direct DB-level
    category filtering to ensure all core items (shoes!) are always found.
    """
    
    async def execute(self, task: Dict[str, Any], context: Dict[str, Any], stream_callback=None) -> AgentResult:
        # Ignore task['candidates'] from Stylist - we fetch our own!
        
        budget_max = task.get("budget_max", 500)
        gender = task.get("gender")
        style = task.get("style", "casual")
        num_outfits = task.get("num_outfits", 3)
        
        log.info(f"🎨 OutfitBuilder v2: budget={budget_max}, gender={gender}, style={style}, num_outfits={num_outfits}")
        
        if stream_callback:
            await stream_callback({
                "type": "status",
                "message": f"Building {num_outfits} outfits matching your style..."
            })
            
        # Calculate per-category budgets
        category_budgets = {
            cat: budget_max * allocation
            for cat, allocation in BUDGET_ALLOCATION.items()
        }
        
        all_outfit_items = []
        global_used_slugs = set()
        missing_categories = []
        
        for outfit_idx in range(num_outfits):
            outfit_id = f"outfit_{outfit_idx + 1}"
            outfit_items = []
            outfit_total = 0.0
            
            for category in CORE_CATEGORIES:
                budget_for_category = category_budgets[category]
                
                # Fetch candidates
                candidates = await search_by_outfit_category(
                    outfit_category=category,
                    style_query=style,
                    gender=gender,
                    price_max=budget_for_category,
                    exclude_slugs=list(global_used_slugs),
                    top_k=10,
                )
                
                if not candidates:
                    log.warning(f"   ⚠️ No {category} found under €{budget_for_category:.2f}")
                    missing_categories.append((outfit_id, category))
                    
                    # Create notification item
                    item_entry = {
                        "category": category,
                        "product": {
                            "title": f"No {category} found",
                            "price": 0,
                            "type": "notification",
                            "description": f"Could not find {category} under €{budget_for_category:.0f}"
                        },
                        "reason": "Budget/inventory constraint",
                        "is_notification": True,
                        "outfit_id": outfit_id
                    }
                    outfit_items.append(item_entry)
                    all_outfit_items.append(item_entry)
                    continue
                
                # Select best
                selected = candidates[0]
                item_price = float(selected.get("price") or 0)
                
                # Create item entry
                item_entry = {
                    "outfit_id": outfit_id,
                    "category": category,
                    "slug": selected["slug"],
                    "product": selected,  # Full product data for UI
                    "title": selected["title"],
                    "type": selected["type"],
                    "price": item_price,
                    "reason": f"Matches style '{style}'",
                    "imageUrl": selected.get("imageUrl"),
                    "color": selected.get("color"),
                    "url": selected.get("url"),
                }
                
                outfit_items.append(item_entry)
                all_outfit_items.append(item_entry)
                global_used_slugs.add(selected["slug"])
                outfit_total += item_price
                
                if stream_callback:
                    await stream_callback({
                        "event_type": "item_selected",
                        "category": category,
                        "selected_item": selected,
                        "outfit_id": outfit_id
                    })
            
            log.info(f"   ✅ {outfit_id} complete: €{outfit_total:.2f}")

        return AgentResult(
            success=True,
            data={
                "outfit_items": all_outfit_items,
                "num_outfits": num_outfits,
                "is_outfit": True,
                "is_multi_outfit": True,
                "budget_max": budget_max
            },
            reasoning=f"Generated {num_outfits} outfits using category-aware search.",
            confidence=0.9 if not missing_categories else 0.7,
            tools_used=["category_search_v2"]
        )

# Handler wrapper
async def outfit_builder_handler(task: dict, context: dict, stream_callback=None) -> dict:
    agent = OutfitBuilderAgent("outfit_builder")
    result = await agent.execute(task, context, stream_callback=stream_callback)
    return result.to_dict()

# Register
from app.core.agent_registry import registry, Agent

registry.register(Agent(
    name="outfit_builder",
    description="Assembles outfits from candidate products",
    capabilities=["outfit", "assembly", "budget"],
    handler=outfit_builder_handler,
    priority=10,
    config={}
))
