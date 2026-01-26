"""
Agents module - Specialized AI agents for COVE.

Importing agents here triggers their auto-registration with the AgentRegistry.
"""

# Import all agents to trigger registration
from app.agents.stylist_agent import StylistAgent
from app.agents.fit_agent import FitAgent
from app.agents.budget_agent import BudgetAgent
from app.agents.budget_agent import BudgetAgent
from app.agents.outfit_builder_agent import OutfitBuilderAgent
from app.agents.vision_agent import VisionAgent
from app.agents.fashion_analyzer import FashionAnalyzerAgent

# Import orchestrator
from app.agents.multi_agent_orchestrator import orchestrator

__all__ = ["StylistAgent", "FitAgent", "BudgetAgent", "OutfitBuilderAgent", "VisionAgent", "FashionAnalyzerAgent", "orchestrator"]
