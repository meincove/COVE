import logging
import json
from typing import Dict, Any, List
from app.core.agent_registry import registry, Agent

log = logging.getLogger("cove.agents.support")

class SupportAgent:
    """
    Handles support requests like returns, shipping, and order status.
    (Mock implementation for now)
    """
    
    async def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute support intent.
        """
        query = task.get("query", "").lower()
        log.info(f"🛠️ SupportAgent handling: {query}")
        
        response = ""
        
        # Simple rule-based logic for demo purposes
        if "return" in query:
            response = "We offer free returns within 30 days! Just go to your Order History and click 'Return Item'. A generated label will be emailed to you."
        
        elif "shipping" in query or "delivery" in query:
            response = "Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available for €15."
            
        elif "order" in query and "status" in query:
            response = "You can check your order status in the 'My Orders' section of your profile."
            
        else:
            # Fallback generic support message
            response = "I can help with returns, shipping, and order status. For other issues, please contact support@cove.com."
            
        return {
            "success": True,
            "agent": "support",
            "data": {},
            "reasoning": response
        }

# Register self
agent = SupportAgent()

registry.register(Agent(
    name="support",
    description="Handles customer support, returns, and shipping inquiries",
    capabilities=["return", "shipping", "delivery", "order status", "refund", "support"],
    handler=agent.execute,
    priority=1
))
