import logging
import asyncio
from typing import Dict, Any, List

from app.agents.base_agent import BaseAgent, AgentResult

log = logging.getLogger("cove.agents.outfit_builder")

class OutfitBuilderAgent(BaseAgent):
    """
    Outfit Builder Agent - Assembles final outfits from candidate products.
    
    Responsibilities:
    - Receives candidate lists from StylistAgent (Retrieval)
    - Applies 'Smart Flexible Budget' logic
    - Selects the best compatible item for each category
    - Generates 'Notification' items for failures (User Idea)
    - Validates visual harmony (Placeholder)
    """
    
    async def execute(self, task: Dict[str, Any], context: Dict[str, Any], stream_callback=None) -> AgentResult:
        candidates = task.get("candidates", {})
        budget_max = task.get("budget_max", 500)
        user_preferences = task.get("user_preferences", {})
        
        log.info(f"🏗️ Building outfit from {len(candidates)} categories with budget €{budget_max}")
        
        outfit_items = []
        selected_slugs = set()
        tools_used = ["smart_budget", "compatibility_check"]
        errors = []
        
        # Calculate flexible budget (simplified from original StylistAgent logic)
        remaining_budget = float(budget_max)
        total_cost = 0.0
        
        # Order categories (logic: Shoes -> Bottoms -> Tops usually? Or order provided)
        # We rely on the order in candidates dict or specific precedence
        # Precedence: Shoes (expensive foundation) -> Bottoms -> Tops -> Accessories
        precedence = ["shoes", "bottoms", "tops", "accessories"]
        ordered_categories = sorted(candidates.keys(), key=lambda c: precedence.index(c.lower()) if c.lower() in precedence else 99)
        
        for idx, category in enumerate(ordered_categories):
            cat_candidates = candidates[category]
            
            # Smart Budgeting
            remaining_cats = len(ordered_categories) - idx
            per_cat_budget = remaining_budget / remaining_cats if remaining_cats > 0 else remaining_budget
            flexible_cap = max(per_cat_budget, remaining_budget * 0.6)
            flexible_budget = min(flexible_cap, remaining_budget)
            
            if flexible_budget < 10 and remaining_budget > 10:
                flexible_budget = remaining_budget
                
            log.info(f"   Category: {category}, Candidates: {len(cat_candidates)}, Budget: €{flexible_budget:.2f}")
            
            best_item = None
            
            # Vet candidates using Compatibility Engine
            scored_candidates = []
            
            for item in cat_candidates:
                price = item.get("price", 0)
                
                # Hard Constraint: Budget
                if price > flexible_budget:
                    continue
                    
                # Soft Constraint: Compatibility Score
                score, reason = self._calculate_compatibility(item, outfit_items, flexible_budget)
                scored_candidates.append({
                    "item": item, 
                    "score": score, 
                    "reason": reason
                })
            
            # Select Best (Highest Score)
            scored_candidates.sort(key=lambda x: x["score"], reverse=True)
            
            if scored_candidates:
                best = scored_candidates[0]
                best_item = best["item"]
                # Store the reason for later
                best_reason = best["reason"]
            else:
                best_item = None
                best_reason = "No suitable item found"
    

            
            if best_item:
                slug = best_item.get("slug", "unknown")
                price = best_item.get("price", 0)
                
                outfit_items.append({
                    "category": category,
                    "product": best_item,
                    "reason": best_reason
                })
                selected_slugs.add(slug)
                total_cost += price
                remaining_budget -= price
                
                if stream_callback:
                    await stream_callback({
                        "event_type": "item_selected",
                        "category": category,
                        "selected_item": best_item,
                        "remaining_budget": remaining_budget,
                        "status": f"Selected {best_item.get('title')} for {category}"
                    })
            else:
                # FAILURE HANDLING (User Idea)
                if not cat_candidates:
                    msg = f"No {category} candidates provided by Stylist."
                else:
                    msg = f"Found {len(cat_candidates)} {category} candidates but all exceeded budget of €{flexible_budget:.0f}."
                
                log.warning(msg)
                
                # Add Notification Item
                outfit_items.append({
                    "category": category,
                    "product": {
                        "title": f"Missing {category}",
                        "price": 0,
                        "type": "notification",
                        "description": msg
                    },
                    "reason": msg,
                    "is_notification": True
                })
                
                if stream_callback:
                    await stream_callback({
                        "event_type": "notification",
                        "category": category,
                        "message": msg,
                        "status": "failed"
                    })
        
        return AgentResult(
            success=True,
            data={"outfit_items": outfit_items, "total_cost": total_cost},
            reasoning=f"Built outfit with {len(outfit_items)} items (Cost: €{total_cost:.2f})",
            confidence=0.9,
            tools_used=tools_used
        )


    def _calculate_compatibility(self, item: Dict[str, Any], current_outfit: List[Dict[str, Any]], budget_cap: float) -> (float, str):
        """
        Calculates a compatibility score (0-100) for an item against the current outfit.
        Uses heuristic rules for Color Harmony and Formality.
        """
        score = 50.0  # Base score
        reasons = []
        
        # 1. Budget Efficiency (0-10 pts)
        price = item.get("price", 0)
        # Prefer items that use most of the allocated budget (quality) but don't break it
        if price > 0 and budget_cap > 0:
            ratio = price / budget_cap
            if 0.5 <= ratio <= 1.0:
                score += 10
                reasons.append("optimal price point")
            elif ratio < 0.3:
                score -= 5 # suspicious quality or too cheap?
        
        # 2. Color Harmony (-20 to +30 pts)
        # Simplified Color Knowledge Base
        NEUTRALS = ["black", "white", "grey", "beige", "navy", "denim", "charcoal", "cream", "ivory", "khaki"]
        EARTH = ["brown", "olive", "rust", "tan", "mustard", "sage", "terracotta"]
        COOL = ["blue", "green", "teal", "purple", "lavender", "cyan", "mint"]
        WARM = ["red", "orange", "yellow", "pink", "coral", "burgundy", "peach"]
        
        item_color = (item.get("color") or "").lower()
        
        # Analyze against existing items
        for outfit_item in current_outfit:
            # Skip notifications
            if outfit_item.get("is_notification"):
                continue
                
            other_prod = outfit_item.get("product", {})
            other_color = (other_prod.get("color") or "").lower()
            other_title = other_prod.get("title", "Item")
            
            if not item_color or not other_color:
                continue
                
            # Rule: Neutrals match everything
            if item_color in NEUTRALS or other_color in NEUTRALS:
                score += 5
                reasons.append(f"neutral match with {other_title}")
                continue
            
            # Rule: Monochrome (Direct Match)
            if item_color == other_color or item_color in other_color or other_color in item_color:
                score += 15
                reasons.append(f"monochrome match with {other_title}")
                continue
                
            # Rule: Family Match
            families = [EARTH, COOL, WARM]
            same_family = False
            for family in families:
                if item_color in family and other_color in family:
                    score += 10
                    reasons.append(f"tonal match with {other_title}")
                    same_family = True
                    break
            
            if same_family:
                continue
                
            # Rule: Clash Detection (Simplified)
            # e.g. Green + Red (Christmas), Orange + Purple?
            # For now, allow mixing families if not clashing.
            # Assuming mixed families is Neutral (0 change).
            
        if not current_outfit:
            reasons.append("foundation item")
            
        return score, ", ".join(reasons)

log.info("✓ OutfitBuilder agent registered")

# Handler
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
