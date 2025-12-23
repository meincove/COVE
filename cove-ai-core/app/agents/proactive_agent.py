import json
from pathlib import Path
from typing import Dict, Any, Optional
import logging
log = logging.getLogger("cove.proactive")

class ProactiveAgent:
    def __init__(self):
        self.offers = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        try:
            # Path relative to this file: .../app/agents/proactive_agent.py -> .../data/proactive_offers.json
            path = Path(__file__).parent.parent.parent / "data" / "proactive_offers.json"
            if not path.exists():
                log.warning(f"⚠️ Proactive offers config not found at {path}")
                return {}
            
            with open(path, "r") as f:
                return json.load(f)
        except Exception as e:
            log.error(f"❌ Failed to load proactive config: {e}")
            return {}

    async def handle_signal(self, signal: str, context: Dict[str, Any], user_id: str = None) -> Dict[str, Any]:
        """
        Evaluate signal against rules and return trigger response.
        """
        log.debug(f"🧠 ProactiveAgent thinking... Signal: {signal} Context: {context}")

        response = {
            "triggered": False,
            "message": None,
            "priority": 0,
            "action": None
        }

        # 1. Check Brand Offers
        if signal == "VIEW_BRAND":
            brand = context.get("brand", "").lower()
            visit_count = context.get("visit_count", 1)
            
            brand_rules = self.offers.get("brand_offers", {})
            if brand in brand_rules:
                rule = brand_rules[brand]
                
                # Check conditions
                if rule.get("trigger") == "view_brand" and visit_count >= rule.get("min_visits", 1):
                    # Trigger!
                    log.info(f"✨ Triggered Brand Offer for {brand}")
                    return {
                        "triggered": True,
                        "message": rule["message"],
                        "priority": rule.get("priority", 5),
                        "action": rule.get("action")
                    }

        # 2. Check Product Offers
        if signal == "VIEW_PRODUCT":
            # Example context: { "product_id": "...", "brand": "gucci", "time_on_page": 15 }
            brand = context.get("brand", "").lower()
            time_on_page = context.get("time_on_page", 0)
            
            brand_rules = self.offers.get("brand_offers", {})
            if brand in brand_rules:
                rule = brand_rules[brand]
                 # Specific rule for VIEW_PRODUCT on this brand?
                if rule.get("trigger") == "view_product":
                    if time_on_page >= rule.get("min_time_on_page", 0):
                        return {
                            "triggered": True,
                            "message": rule["message"],
                            "priority": rule.get("priority", 5),
                            "action": rule.get("action")
                        }

        # 3. Check Cart Rules
        if signal == "CART_UPDATE":
            cart_total = float(context.get("cart_total", 0))
            
            cart_rules = self.offers.get("cart_rules", {})
            
            # Near Free Shipping
            fs_rule = cart_rules.get("near_free_shipping")
            if fs_rule:
                if fs_rule["min_total"] <= cart_total < fs_rule["max_total"]:
                    diff = round(fs_rule["max_total"] - cart_total, 2)
                    msg = fs_rule["message"].replace("{diff}", str(diff))
                    return {
                        "triggered": True,
                        "message": msg,
                        "priority": fs_rule.get("priority", 5),
                        "action": fs_rule.get("action")
                    }

        return response

# Singleton instance
proactive_agent = ProactiveAgent()
