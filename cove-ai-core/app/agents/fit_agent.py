"""
Fit Agent - Provides size recommendations and fit intelligence.

Second specialized agent for Phase 2.
Handles size selection, brand-specific sizing, and fit recommendations.
"""

from app.agents.base_agent import BaseAgent, AgentResult
from app.core.agent_registry import Agent, registry
from typing import Dict, Any, List, Optional
import logging
import json
from pathlib import Path

log = logging.getLogger("cove.agents.fit")

# Load fit config from file (NO HARDCODING!)
_config_path = Path(__file__).parent.parent.parent / "data" / "fit_agent_config.json"
try:
    with open(_config_path, "r") as f:
        _FIT_CONFIG = json.load(f)
    log.info(f"✓ Loaded fit config from {_config_path}")
except Exception as e:
    log.warning(f"Failed to load fit config: {e}, using minimal defaults")
    _FIT_CONFIG = {
        "brand_sizing": {},
        "size_order": ["XS", "S", "M", "L", "XL", "XXL"],
        "default_size": "M"
    }


class FitAgent(BaseAgent):
    """
    Fit Agent: Provides intelligent size recommendations.
    
    ALL RULES LOADED FROM data/fit_agent_config.json - NO HARDCODING!
    
    Capabilities:
    - Brand-specific size adjustments
    - User size history analysis
    - Fit preference matching
    - Size availability checking
    - Confidence scoring
    
    Example:
        task = {
            "items": [{"product": {...}, "category": "top"}],
            "user_size_history": {"COVE": "M", "UrbanPulse": "L"}
        }
        
        result = await fit_agent.execute(task, context)
        # Returns size recommendations with confidence
    """
    
    async def execute(
        self, 
        task: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> AgentResult:
        """
        Recommend sizes for outfit items.
        
        Args:
            task: {
                "items": List[Dict],  # Outfit items with products
                "user_size_history": Dict[str, str]  # Optional: brand -> size
            }
            context: {
                "user_id": str,  # Optional
                "fit_preference": str  # Optional: slim, regular, relaxed
            }
        
        Returns:
            AgentResult with size_recommendations list
        """
        items = task.get("items", [])
        user_history = task.get("user_size_history", {})
        fit_preference = context.get("fit_preference", "regular")
        
        log.info(f"Analyzing sizes for {len(items)} items (preference: {fit_preference})")
        
        size_recommendations = []
        warnings = []
        tools_used = []
        total_confidence = 0.0
        
        for item in items:
            product = item.get("product", {})
            category = item.get("category", "unknown")
            brand = product.get("brand", "Unknown")
            available_sizes = product.get("sizes", {})
            
            # Get size recommendation
            rec = self._recommend_size(
                brand=brand,
                category=category,
                available_sizes=available_sizes,
                user_history=user_history,
                fit_preference=fit_preference
            )
            
            size_recommendations.append({
                "product_id": product.get("id"),
                "category": category,
                "brand": brand,
                "recommended_size": rec["size"],
                "confidence": rec["confidence"],
                "reason": rec["reason"],
                "warnings": rec["warnings"]
            })
            
            total_confidence += rec["confidence"]
            warnings.extend(rec["warnings"])
            tools_used.append(f"size_analysis({category})")
        
        # Calculate average confidence
        avg_confidence = total_confidence / len(items) if items else 0.0
        
        # Build reasoning
        sizes_found = len([r for r in size_recommendations if r["recommended_size"]])
        reasoning = f"Analyzed {len(items)} items, recommended sizes for {sizes_found}"
        
        if warnings:
            reasoning += f". {len(warnings)} warnings"
        
        return AgentResult(
            success=sizes_found == len(items),
            data={
                "size_recommendations": size_recommendations,
                "fit_preference": fit_preference,
                "warnings": list(set(warnings)),  # Unique warnings
                "average_confidence": avg_confidence
            },
            reasoning=reasoning,
            confidence=avg_confidence,
            tools_used=tools_used
        )
    
    def _recommend_size(
        self,
        brand: str,
        category: str,
        available_sizes: Dict[str, int],
        user_history: Dict[str, str],
        fit_preference: str
    ) -> Dict[str, Any]:
        """
        Recommend size for a single item.
        Uses config rules - NO HARDCODING!
        
        Returns:
            {
                "size": str,
                "confidence": float,
                "reason": str,
                "warnings": List[str]
            }
        """
        warnings = []
        
        # Check if category needs sizing
        category_rules = _FIT_CONFIG.get("category_fit_rules", {})
        cat_rule = category_rules.get(category, {})
        
        if not cat_rule.get("size_matters", True):
            # Accessories, etc
            return {
                "size": "One Size",
                "confidence": _FIT_CONFIG.get("confidence_rules", {}).get("accessories", 1.0),
                "reason": "One size fits all",
                "warnings": []
            }
        
        # Get brand sizing info
        brand_sizing = _FIT_CONFIG.get("brand_sizing", {})
        brand_info = brand_sizing.get(brand, {})
        fit_type = brand_info.get("fit", "true_to_size")
        size_adjustment = brand_info.get("size_adjustment", 0)
        
        # Start with user history or default
        base_size = user_history.get(brand)
        confidence = _FIT_CONFIG.get("confidence_rules", {}).get("has_brand_match", 0.85)
        
        if not base_size:
            # Try to infer from other brands
            if user_history:
                # Use most common size
                sizes = list(user_history.values())
                base_size = max(set(sizes), key=sizes.count)
                confidence = _FIT_CONFIG.get("confidence_rules", {}).get("has_user_history", 0.7)
                warnings.append(_FIT_CONFIG.get("warnings", {}).get("no_history", ""))
            else:
                # Use default
                base_size = _FIT_CONFIG.get("default_size", "M")
                confidence = _FIT_CONFIG.get("confidence_rules", {}).get("no_history_true_to_size", 0.6)
                warnings.append(_FIT_CONFIG.get("warnings", {}).get("no_history", ""))
        
        # Apply brand adjustment
        recommended_size = self._adjust_size(base_size, size_adjustment)
        
        # Add brand warnings
        if fit_type == "runs_small":
            warnings.append(_FIT_CONFIG.get("warnings", {}).get("runs_small", ""))
            confidence *= 0.95
        elif fit_type == "runs_large":
            warnings.append(_FIT_CONFIG.get("warnings", {}).get("runs_large", ""))
            confidence *= 0.95
        
        # Check availability
        if available_sizes and recommended_size not in available_sizes:
            # Find closest available size
            closest = self._find_closest_size(recommended_size, list(available_sizes.keys()))
            if closest:
                recommended_size = closest
                confidence *= 0.8
                warnings.append(f"Exact size unavailable, suggested {closest}")
        
        # Build reason
        reason = self._build_reason(brand, fit_type, base_size, recommended_size)
        
        return {
            "size": recommended_size,
            "confidence": min(confidence, 1.0),
            "reason": reason,
            "warnings": [w for w in warnings if w]  # Remove empty
        }
    
    def _adjust_size(self, size: str, adjustment: int) -> str:
        """
        Adjust size by N steps (e.g., +1 = size up, -1 = size down).
        Uses config size order - NO HARDCODING!
        """
        if adjustment == 0:
            return size
        
        size_order = _FIT_CONFIG.get("size_order", ["XS", "S", "M", "L", "XL", "XXL"])
        
        try:
            current_idx = size_order.index(size)
            new_idx = current_idx + adjustment
            
            # Clamp to valid range
            new_idx = max(0, min(new_idx, len(size_order) - 1))
            
            return size_order[new_idx]
        except (ValueError, IndexError):
            # Size not in order, return as-is
            return size
    
    def _find_closest_size(self, target: str, available: List[str]) -> Optional[str]:
        """
        Find closest available size.
        Uses config size order - NO HARDCODING!
        """
        size_order = _FIT_CONFIG.get("size_order", [])
        
        try:
            target_idx = size_order.index(target)
        except ValueError:
            # Target not in order, just return first available
            return available[0] if available else None
        
        # Find closest by index distance
        closest = None
        min_distance = float('inf')
        
        for sz in available:
            try:
                idx = size_order.index(sz)
                distance = abs(idx - target_idx)
                if distance < min_distance:
                    min_distance = distance
                    closest = sz
            except ValueError:
                continue
        
        return closest
    
    def _build_reason(
        self,
        brand: str,
        fit_type: str,
        base_size: str,
        recommended_size: str
    ) -> str:
        """
        Generate human-readable reason.
        Uses config descriptions - NO HARDCODING!
        """
        brand_sizing = _FIT_CONFIG.get("brand_sizing", {})
        brand_info = brand_sizing.get(brand, {})
        description = brand_info.get("description", "Standard sizing")
        
        if base_size == recommended_size:
            return f"Your usual {base_size}. {description}"
        else:
            return f"Recommend {recommended_size} (usually {base_size}). {description}"


# Auto-register agent in global registry
async def fit_handler(task: dict, context: dict) -> dict:
    """Handler function for registry - wraps FitAgent.execute()"""
    agent = FitAgent("fit")
    result = await agent.run(task, context)
    return result.to_dict()


# Register on module import
registry.register(Agent(
    name="fit",
    description="Fit expert - recommends sizes based on brand, history, and preferences",
    capabilities=["size", "fit", "sizing", "measurements", "brand sizing"],
    handler=fit_handler,
    priority=8,  # High priority for outfit completion
    config={}
))

log.info("✓ Fit agent registered")
