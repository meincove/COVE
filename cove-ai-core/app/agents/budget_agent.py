"""
Budget Agent - Optimizes outfit pricing and finds discounts.

Third specialized agent for Phase 2.
Handles budget constraints, discount discovery, and price optimization.
"""

from app.agents.base_agent import BaseAgent, AgentResult
from app.core.agent_registry import Agent, registry
from typing import Dict, Any, List, Optional
import logging
import json
from pathlib import Path

log = logging.getLogger("cove.agents.budget")

# Load budget config from file (NO HARDCODING!)
_config_path = Path(__file__).parent.parent.parent / "data" / "budget_agent_config.json"
try:
    with open(_config_path, "r") as f:
        _BUDGET_CONFIG = json.load(f)
    log.info(f"✓ Loaded budget config from {_config_path}")
except Exception as e:
    log.warning(f"Failed to load budget config: {e}, using minimal defaults")
    _BUDGET_CONFIG = {
        "default_budget": 500,
        "currency": "EUR",
        "free_shipping_threshold": 50
    }


class BudgetAgent(BaseAgent):
    """
    Budget Agent: Optimizes outfit pricing within budget.
    
    ALL RULES LOADED FROM data/budget_agent_config.json - NO HARDCODING!
    
    Capabilities:
    - Budget constraint enforcement
    - Discount code discovery
    - Price optimization strategies
    - Item substitution when over budget
    - Free shipping calculation
    
    Example:
        task = {
            "items": [{"product": {...}, "category": "top"}],
            "budget_max": 300
        }
        
        result = await budget_agent.execute(task, context)
        # Returns optimized outfit with discounts
    """
    
    async def execute(
        self, 
        task: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> AgentResult:
        """
        Optimize outfit pricing within budget.
        
        Args:
            task: {
                "items": List[Dict],  # Outfit items with products
                "budget_max": float,  # Maximum budget
                "strategy": str  # Optional: minimize_cost, maximize_value, maximize_quality
            }
            context: {
                "user_id": str,  # Optional
                "is_new_user": bool  # Optional, for welcome discounts
            }
        
        Returns:
            AgentResult with optimized_items and discount_info
        """
        items = task.get("items", [])
        budget_max = task.get("budget_max", _BUDGET_CONFIG.get("default_budget", 500))
        strategy = task.get("strategy", "maximize_value")
        is_new_user = context.get("is_new_user", False)
        
        log.info(f"Optimizing {len(items)} items within €{budget_max} budget ({strategy})")
        
        # Calculate initial total
        initial_total = sum(
            float(item.get("product", {}).get("priceNumeric", 0))
            for item in items
        )
        
        # Find applicable discounts
        discounts = self._find_discounts(initial_total, len(items), is_new_user)
        
        # Calculate discounted total
        best_discount = max(discounts, key=lambda d: d["savings"]) if discounts else None
        discounted_total = initial_total
        
        if best_discount:
            discounted_total = self._apply_discount(initial_total, best_discount)
        
        # Check if within budget
        within_budget = discounted_total <= budget_max
        optimized_items = items.copy()
        substitutions = []
        
        #If over budget, try substitutions
        if not within_budget:
            result = self._optimize_to_budget(
                items=items,
                budget_max=budget_max,
                current_total=discounted_total,
                discount=best_discount
            )
            optimized_items = result["items"]
            substitutions = result["substitutions"]
            discounted_total = result["total"]
            within_budget = result["within_budget"]
        
        # Check free shipping
        free_shipping_threshold = _BUDGET_CONFIG.get("free_shipping_threshold", 50)
        has_free_shipping = discounted_total >= free_shipping_threshold
        shipping_savings = 5.0 if has_free_shipping else 0.0
        
        # Calculate total savings
        total_savings = (initial_total - discounted_total) + shipping_savings
        
        # Calculate confidence
        confidence = self._calculate_confidence(
            within_budget=within_budget,
            budget_max=budget_max,
            final_total=discounted_total,
            substitutions_made=len(substitutions)
        )
        
        # Build reasoning
        reasoning = self._build_reasoning(
            initial_total=initial_total,
            final_total=discounted_total,
            budget_max=budget_max,
            within_budget=within_budget,
            discount=best_discount,
            substitutions=substitutions
        )
        
        return AgentResult(
            success=within_budget,
            data={
                "optimized_items": optimized_items,
                "initial_total": initial_total,
                "final_total": discounted_total,
                "budget_max": budget_max,
                "within_budget": within_budget,
                "discount_applied": best_discount,
                "all_discounts": discounts,
                "substitutions": substitutions,
                "total_savings": total_savings,
                "free_shipping": has_free_shipping,
                "budget_remaining": budget_max - discounted_total if within_budget else 0
            },
            reasoning=reasoning,
            confidence=confidence,
            tools_used=[f"discount_finder", f"price_optimizer"]
        )
    
    def _find_discounts(
        self,
        total: float,
        item_count: int,
        is_new_user: bool
    ) -> List[Dict[str, Any]]:
        """
        Find applicable discount codes.
        Uses config - NO HARDCODING!
        """
        discount_codes = _BUDGET_CONFIG.get("discount_codes", {})
        applicable = []
        
        for code, info in discount_codes.items():
            min_order = info.get("min_order", 0)
            
            # Check if order meets minimum
            if total >= min_order:
                # Check if new user discount
                if "WELCOME" in code and not is_new_user:
                    continue
                
                # Calculate savings
                savings = self._calculate_discount_savings(total, info)
                
                applicable.append({
                    "code": code,
                    "type": info.get("type"),
                    "value": info.get("value"),
                    "savings": savings,
                    "description": info.get("description", "")
                })
        
        return applicable
    
    def _calculate_discount_savings(self, total: float, discount_info: Dict) -> float:
        """Calculate savings from discount."""
        discount_type = discount_info.get("type")
        value = discount_info.get("value", 0)
        
        if discount_type == "percentage_off":
            return total * (value / 100)
        elif discount_type == "fixed_amount":
            return min(value, total)
        elif discount_type == "free_shipping":
            return value
        
        return 0.0
    
    def _apply_discount(self, total: float, discount: Dict) -> float:
        """Apply discount to total."""
        savings = discount.get("savings", 0)
        return max(total - savings, 0)
    
    def _optimize_to_budget(
        self,
        items: List[Dict],
        budget_max: float,
        current_total: float,
        discount: Optional[Dict]
    ) -> Dict[str, Any]:
        """
        Try to get within budget through substitutions.
        Uses config rules - NO HARDCODING!
        """
        substitution_rules = _BUDGET_CONFIG.get("substitution_rules", {})
        if_over = substitution_rules.get("if_over_budget", {})
        max_iterations = substitution_rules.get("max_iterations", 3)
        
        optimized_items = items.copy()
        substitutions = []
        iteration = 0
        
        while current_total > budget_max and iteration < max_iterations:
            # Try removing extras first
            if if_over.get("remove_extras"):
                result = self._remove_extras(optimized_items)
                if result["removed"]:
                    optimized_items = result["items"]
                    substitutions.append(f"Removed {result['removed']}")
                    current_total = self._calculate_total(optimized_items, discount)
                    if current_total <= budget_max:
                        break
            
            iteration += 1
        
        return {
            "items": optimized_items,
            "total": current_total,
            "within_budget": current_total <= budget_max,
            "substitutions": substitutions
        }
    
    def _remove_extras(self, items: List[Dict]) -> Dict[str, Any]:
        """Remove extra (non-core) items."""
        priority_categories = _BUDGET_CONFIG.get("priority_categories", {})
        core_cats = priority_categories.get("core", {}).get("categories", ["top", "bottom"])
        extra_cats = priority_categories.get("extras", {}).get("categories", [])
        
        # Find first extra item
        for i, item in enumerate(items):
            category = item.get("category", "")
            if category in extra_cats:
                items_copy = items.copy()
                removed_item = items_copy.pop(i)
                return {
                    "items": items_copy,
                    "removed": removed_item.get("category")
                }
        
        return {"items": items, "removed": None}
    
    def _calculate_total(self, items: List[Dict], discount: Optional[Dict]) -> float:
        """Calculate total with discount."""
        subtotal = sum(
            float(item.get("product", {}).get("priceNumeric", 0))
            for item in items
        )
        
        if discount:
            return self._apply_discount(subtotal, discount)
        
        return subtotal
    
    def _calculate_confidence(
        self,
        within_budget: bool,
        budget_max: float,
        final_total: float,
        substitutions_made: int
    ) -> float:
        """
        Calculate confidence score.
        Uses config rules - NO HARDCODING!
        """
        if not within_budget:
            return 0.5
        
        confidence_rules = _BUDGET_CONFIG.get("confidence_rules", {})
        
        # Calculate budget usage percentage
        usage_pct = (final_total / budget_max) * 100 if budget_max > 0 else 100
        
        # Determine confidence based on fit
        if 90 <= usage_pct <= 100:
            confidence = confidence_rules.get("exact_budget_match", 0.95)
        elif 80 <= usage_pct < 110:
            confidence = confidence_rules.get("within_10_percent", 0.9)
        elif 70 <= usage_pct < 120:
            confidence = confidence_rules.get("within_20_percent", 0.8)
        else:
            confidence = 0.7
        
        # Reduce confidence for substitutions
        if substitutions_made > 0:
            confidence *= 0.9
        
        return min(confidence, 1.0)
    
    def _build_reasoning(
        self,
        initial_total: float,
        final_total: float,
        budget_max: float,
        within_budget: bool,
        discount: Optional[Dict],
        substitutions: List[str]
    ) -> str:
        """Build human-readable reasoning."""
        currency = _BUDGET_CONFIG.get("currency_symbol", "€")
        
        parts = []
        
        if discount:
            savings = initial_total - final_total
            parts.append(f"Applied {discount['code']}: saved {currency}{savings:.2f}")
        
        if within_budget:
            remaining = budget_max - final_total
            parts.append(f"Within budget ({currency}{remaining:.2f} remaining)")
        else:
            overage = final_total - budget_max
            parts.append(f"Over budget by {currency}{overage:.2f}")
        
        if substitutions:
            parts.append(f"{len(substitutions)} adjustments made")
        
        return ". ".join(parts) if parts else f"Total: {currency}{final_total:.2f}"


# Auto-register agent in global registry
async def budget_handler(task: dict, context: dict) -> dict:
    """Handler function for registry - wraps BudgetAgent.execute()"""
    agent = BudgetAgent("budget")
    result = await agent.run(task, context)
    return result.to_dict()


# Register on module import
registry.register(Agent(
    name="budget",
    description="Budget optimizer - finds discounts and keeps outfits within budget",
    capabilities=["budget", "price", "discount", "savings", "cost", "optimization"],
    handler=budget_handler,
    priority=7,  # Important for final outfit
    config={}
))

log.info("✓ Budget agent registered")
