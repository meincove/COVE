"""
Stylist Agent - Recommends outfits for occasions and style preferences.

First specialized agent for Phase 2.
Handles outfit building, style coordination, and product selection.
"""

from app.agents.base_agent import BaseAgent, AgentResult
from app.core.agent_registry import Agent, registry
from typing import Dict, Any, List
import logging
import json
from pathlib import Path

log = logging.getLogger("cove.agents.stylist")

# Load stylist config from file (NO HARDCODING!)
_config_path = Path(__file__).parent.parent.parent / "data" / "stylist_config.json"
try:
    with open(_config_path, "r") as f:
        _STYLIST_CONFIG = json.load(f)
    log.info(f"✓ Loaded stylist config from {_config_path}")
except Exception as e:
    log.warning(f"Failed to load stylist config: {e}, using minimal defaults")
    _STYLIST_CONFIG = {
        "occasions": {},
        "styles": {},
        "selection_reasons": {},
        "default_occasion": "casual",
        "default_style": "casual"
    }


class StylistAgent(BaseAgent):
    """
    Stylist Agent: Builds complete outfits based on occasion and style.
    
    ALL RULES LOADED FROM data/stylist_config.json - NO HARDCODING!
    
    Capabilities:
    - Parse occasion/style from natural language
    - Search products by category (tops, bottoms, shoes, accessories)
    - Apply style compatibility rules
    - Budget-aware selection
    
    Example:
        task = {
            "query": "business casual for meeting",
            "budget_max": 300,
            "categories": ["top", "bottom", "shoes"]
        }
        
        result = await stylist.execute(task, context)
        # Returns outfit items with reasoning
    """
    
    async def execute(
        self, 
        task: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> AgentResult:
        """
        Build outfit based on query using real product search.
        
        Args:
            task: {
                "query": str,  # e.g., "date night outfit"
                "budget_max": int,  # optional, from config default
                "categories": List[str]  # optional, from config default
            }
            context: {
                "user_id": str,  # optional, for personalization
                "session_id": str,  # optional
                "guest_session_id": str  # optional
            }
        
        Returns:
            AgentResult with outfit_items list
        """
        query = task.get("query", "")
        budget = task.get("budget_max", _STYLIST_CONFIG.get("default_budget", 500))
        categories = task.get("categories", _STYLIST_CONFIG.get("default_categories", ["top", "bottom"]))
        
        # Parse occasion and style from query (using config)
        occasion, style = self._parse_query(query)
        
        log.info(f"Building outfit for: {occasion} ({style} style), budget: €{budget}")
        
        # Search products per category
        outfit_items = []
        tools_used = []
        errors = []
        total_cost = 0.0
        remaining_budget = budget
        selected_slugs = set()  # Track to avoid duplicates
        
        # Import here to avoid circular dependency
        from app.routes.agent import _call_recs_suggest
        
        for category in categories:
            try:
                # Map outfit category to product types
                category_mapping = _STYLIST_CONFIG.get("category_mapping", {})
                valid_types = category_mapping.get(category, [category])
                
                # Build rich semantic query with SPECIFIC product types
                # Instead of "top for meeting", say "hoodie OR blazer OR shirt for meeting"
                if valid_types and valid_types != [category]:
                    type_str = " OR ".join(valid_types)  # "hoodie OR blazer OR jacket"
                    category_query = f"{style} {type_str} for {occasion}"
                else:
                    category_query = f"{style} {category} for {occasion}"
                
                # Call product recommendation - semantic search
                search_payload = {
                    "query": category_query,
                    "clerkUserId": context.get("user_id"),
                    "guestSessionId": context.get("guest_session_id"),
                    "filters": {
                        "price_max": remaining_budget  # Use full remaining budget, not 60%
                    },
                    "top_k": 20
                }
                
                result = await _call_recs_suggest(search_payload)
                items = result.get("items", [])
                
                if items:
                    # Map outfit category to product types
                    category_mapping = _STYLIST_CONFIG.get("category_mapping", {})
                    valid_types = category_mapping.get(category, [category])
                    
                    # STRICT filter: only valid types, no fallback!
                    category_items = [
                        item for item in items 
                        if item.get("type") in valid_types
                        and item.get("slug") not in selected_slugs  # No duplicates!
                    ]
                    
                    # Select best item that fits budget (if price available)
                    best_item = None
                    for item in category_items:
                        slug = item.get("slug", "")
                        item_price = float(item.get("price", 0) or 0)
                        
                        # Budget check (skip if price not available)
                        if slug and (item_price == 0 or item_price <= remaining_budget):
                            best_item = item
                            break
                        
                    if best_item:
                        slug = best_item.get("slug", "")
                        item_price = float(best_item.get("price", 0) or 0)
                        
                        outfit_items.append({
                            "category": category,
                            "product": best_item,
                            "reason": self._get_selection_reason(category, occasion, style)
                        })
                        
                        selected_slugs.add(slug)  # Track to avoid duplicates
                        total_cost += item_price
                        remaining_budget -= item_price
                        tools_used.append(f"hybrid_search({category})")
                        
                        log.info(f"Selected {slug} (€{item_price}) for {category}, remaining budget: €{remaining_budget}")
                    else:
                        errors.append(f"No {category} found within budget")
                        log.warning(f"No affordable {category} within €{remaining_budget}")
                else:
                    errors.append(f"No {category} found")
                    log.warning(f"No products found for {category}")
                    
            except Exception as e:
                log.error(f"Search failed for {category}: {e}")
                errors.append(f"Search error: {category}")
        
        # Calculate success and confidence
        success = len(outfit_items) >= 2  # Need at least 2 items
        within_budget = total_cost <= budget
        
        # Confidence based on completeness and budget adherence
        confidence = (len(outfit_items) / len(categories)) * 0.9
        if within_budget:
            confidence += 0.1
        
        # Build reasoning
        reasoning_parts = []
        if outfit_items:
            reasoning_parts.append(f"Selected {len(outfit_items)} items for {occasion} ({style} style)")
        if errors:
            reasoning_parts.append(f"Issues: {', '.join(errors[:2])}")  # Show first 2 errors
        
        reasoning = ". ".join(reasoning_parts) if reasoning_parts else "No items found"
        
        return AgentResult(
            success=success,
            data={
                "outfit_items": outfit_items,
                "total": total_cost,
                "within_budget": within_budget,
                "occasion": occasion,
                "style": style,
                "budget_remaining": remaining_budget
            },
            reasoning=reasoning,
            confidence=min(confidence, 1.0),
            tools_used=tools_used,
            errors=errors if errors else []
        )
    
    def _parse_query(self, query: str) -> tuple[str, str]:
        """
        Extract occasion and style from natural language query.
        Uses config file - NO HARDCODING!
        
        Args:
            query: User's outfit request
            
        Returns:
            (occasion, style) tuple
        """
        query_lower = query.lower()
        
        # Load occasion map from config
        occasions = _STYLIST_CONFIG.get("occasions", {})
        default_occasion = _STYLIST_CONFIG.get("default_occasion", "casual")
        
        occasion = default_occasion
        for occ_name, occ_data in occasions.items():
            keywords = occ_data.get("keywords", [])
            if any(kw in query_lower for kw in keywords):
                occasion = occ_name
                break
        
        # Load style map from config
        styles = _STYLIST_CONFIG.get("styles", {})
        
        # Get default style for this occasion
        occasion_data = occasions.get(occasion, {})
        style = occasion_data.get("default_style", _STYLIST_CONFIG.get("default_style", "casual"))
        
        # Override if style explicitly mentioned
        for style_name, style_data in styles.items():
            keywords = style_data.get("keywords", [])
            if any(kw in query_lower for kw in keywords):
                style = style_name
                break
        
        return occasion, style
    
    def _get_selection_reason(self, category: str, occasion: str, style: str) -> str:
        """
        Generate explanation for why this item was selected.
        Uses config file - NO HARDCODING!
        
        Args:
            category: Product category
            occasion: Occasion type
            style: Style preference
            
        Returns:
            Human-readable reason
        """
        reasons = _STYLIST_CONFIG.get("selection_reasons", {})
        template = reasons.get(occasion, f"Matches {style} style")
        return template.format(category=category)


# Auto-register agent in global registry
async def stylist_handler(task: dict, context: dict) -> dict:
    """Handler function for registry - wraps StylistAgent.execute()"""
    agent = StylistAgent("stylist")
    result = await agent.run(task, context)
    return result.to_dict()


# Register on module import
registry.register(Agent(
    name="stylist",
    description="Style expert - recommends outfits for occasions and preferences",
    capabilities=["style", "outfit", "occasion", "fashion", "wardrobe", "look", "wear"],
    handler=stylist_handler,
    priority=10,  # High priority for outfit building
    config={}
))

log.info("✓ Stylist agent registered")
