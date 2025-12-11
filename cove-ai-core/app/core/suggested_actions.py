"""
Suggested Actions Engine - Context-aware query suggestions
Reads from suggestions_config.json for fully configurable behavior
"""
import json
import os
from typing import List, Dict, Optional, Any
from pathlib import Path


class SuggestedActionsEngine:
    """Generate context-aware suggested queries based on configuration rules"""
    
    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            # Default to data/suggestions_config.json at COVE root
            # From cove-ai-core/app/core/suggested_actions.py -> go up 4 levels to COVE root
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            config_path = base_dir / "data" / "suggestions_config.json"
            print(f"[SUGGESTIONS] Loading config from: {config_path}")
        
        self.config = self._load_config(config_path)
        self.rules = self.config.get("suggestion_rules", {})
        self.global_config = self.config.get("suggestion_config", {})
        self.max_suggestions = self.global_config.get("max_suggestions", 4)
    
    def _load_config(self, config_path: Path) -> Dict:
        """Load suggestion configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading suggestions config: {e}")
            return {"suggestion_rules": {}, "suggestion_config": {}}
    
    def generate(
        self,
        intent: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """
        Generate suggested actions based on intent and context
        
        Args:
            intent: The agent's response intent (recommendations, cart_proposal, etc.)
            context: Dictionary containing contextual data:
                - items: List of recommended items
                - cart_payload: Cart proposal data
                - checkout_data: Checkout information
                - user_has_size: Boolean if user has size preference
                - user_has_orders: Boolean if user has order history
                - has_color_variants: Boolean if product has color options
        
        Returns:
            List of suggestion dictionaries with text, query, type, icon
        """
        if context is None:
            context = {}
        
        # Get rules for this intent, fallback to default
        rule_key = intent if intent in self.rules else "default"
        rules = self.rules.get(rule_key, self.rules.get("default", {}))
        
        if not rules:
            return []
        
        # Check if intent-level conditions are met
        if not self._check_conditions(rules.get("conditions", {}), context):
            return []
        
        suggestions = rules.get("suggestions", [])
        valid_suggestions = []
        
        for suggestion in suggestions:
            # Check suggestion-specific conditions
            if not self._check_conditions(suggestion.get("conditions", {}), context):
                continue
            
            # Build suggestion with template variables
            built_suggestion = self._build_suggestion(suggestion, context)
            if built_suggestion:
                valid_suggestions.append(built_suggestion)
        
        # Sort by priority and limit to max
        valid_suggestions.sort(key=lambda x: x.get("priority", 999))
        return valid_suggestions[:self.max_suggestions]
    
    def _check_conditions(self, conditions: Dict, context: Dict) -> bool:
        """Check if all conditions are met"""
        if not conditions:
            return True
        
        # Check 'requires' conditions
        requires = conditions.get("requires", [])
        for condition in requires:
            if not self._evaluate_condition(condition, context):
                return False
        
        # Check 'not_requires' conditions
        not_requires = conditions.get("not_requires", [])
        for condition in not_requires:
            if self._evaluate_condition(condition, context):
                return False
        
        return True
    
    def _evaluate_condition(self, condition: str, context: Dict) -> bool:
        """Evaluate a single condition"""
        condition_map = {
            "has_items": lambda ctx: bool(ctx.get("items")) and len(ctx.get("items", [])) > 0,
            "has_cart_payload": lambda ctx: bool(ctx.get("cart_payload")),
            "has_checkout_data": lambda ctx: bool(ctx.get("checkout_data")),
            "has_orders": lambda ctx: bool(ctx.get("orders")) and len(ctx.get("orders", [])) > 0,
            "user_has_size": lambda ctx: bool(ctx.get("user_has_size")),
            "user_has_orders": lambda ctx: bool(ctx.get("user_has_orders")),
            "has_color_variants": lambda ctx: bool(ctx.get("has_color_variants")),
        }
        
        evaluator = condition_map.get(condition)
        if evaluator:
            return evaluator(context)
        
        # Default to False for unknown conditions
        return False
    
    def _build_suggestion(self, suggestion: Dict, context: Dict) -> Optional[Dict]:
        """Build a suggestion by replacing template variables"""
        try:
            # Get template or use static query
            text_template = suggestion.get("template", "")
            query_template = suggestion.get("query_template")
            static_query = suggestion.get("query")
            
            # Build display text
            text = self._replace_variables(text_template, context)
            
            # Build query
            if query_template:
                query = self._replace_variables(query_template, context)
            elif static_query:
                query = static_query
            else:
                query = text.lower()  # Fallback to lowercased text
            
            return {
                "id": suggestion.get("id", ""),
                "text": text,
                "query": query,
                "type": suggestion.get("type", "navigation"),
                "icon": suggestion.get("icon", ""),
                "priority": suggestion.get("priority", 999)
            }
        except Exception as e:
            print(f"Error building suggestion: {e}")
            return None
    
    def _replace_variables(self, template: str, context: Dict) -> str:
        """Replace template variables with context values"""
        result = template
        
        # Extract first item if available
        items = context.get("items", [])
        first_item = items[0] if items else {}
        
        # Get item title using helper
        item_title = self._get_item_title(first_item)
        
        # Get variantId (try both camelCase and snake_case)
        variant_id = (
            first_item.get("variantId") or 
            first_item.get("variant_id") or 
            first_item.get("slug") or 
            ""
        )
        
        # Variable replacements - map config names to actual values
        replacements = {
            "{item_title}": item_title,
            "{variant_id}": variant_id,  # Config uses snake_case
            "{variantId}": variant_id,   # Also support camelCase
            "{default_size}": context.get("user_size", "M"),
            "{item_type}": first_item.get("type", "item"),
            "{item_color}": first_item.get("color", ""),
        }
        
        for placeholder, value in replacements.items():
            if placeholder in result:
                result = result.replace(placeholder, str(value))
        
        return result
    
    def _get_item_title(self, item: Dict) -> str:
        """Extract item title with fallback - handles AgentItem dict structure"""
        # Try all possible title keys
        title = (
            item.get("title") or 
            item.get("name") or 
            item.get("productName") or
            ""
        )
        
        # If still empty, build from slug
        if not title:
            slug = item.get("slug", "")
            if slug:
                # "nordic-tee-black" -> "Nordic Tee Black"
                title = slug.replace("-", " ").replace("_", " ").title()
        
        # Final fallback
        return title or "this item"


# Singleton instance
_engine = None

def get_suggestions_engine() -> SuggestedActionsEngine:
    """Get or create singleton suggestions engine"""
    global _engine
    if _engine is None:
        _engine = SuggestedActionsEngine()
    return _engine
