"""
Agent Registry - Dynamic agent discovery and management.

Pattern: GitHub MCP + LangGraph supervisor pattern
Purpose: Zero hardcoding - agents register themselves at startup

Usage:
    from app.core.agent_registry import registry, Agent
    
    # Register agent
    registry.register(Agent(
        name="stylist",
        description="Style expert for outfit recommendations",
        capabilities=["style", "outfit", "fashion"],
        handler=my_handler_function
    ))
    
    # Find capable agents
    agents = registry.find_capable_agents("build an outfit")
"""

from typing import Dict, List, Callable, Optional, Any
from dataclasses import dataclass, field
import logging

log = logging.getLogger("cove.agents.registry")


@dataclass
class Agent:
    """
    Agent definition with capabilities and handler.
    
    Attributes:
        name: Unique agent identifier (e.g., "stylist", "fit")
        description: Human-readable purpose
        capabilities: Keywords that trigger this agent (e.g., ["outfit", "style"])
        handler: Async function that executes agent logic
        priority: Higher priority agents are preferred (default: 0)
        config: Optional configuration dict
    """
    name: str
    description: str
    capabilities: List[str]
    handler: Callable
    priority: int = 0
    config: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate agent definition"""
        if not self.name:
            raise ValueError("Agent name cannot be empty")
        if not self.capabilities:
            raise ValueError(f"Agent '{self.name}' must have at least one capability")
        if not callable(self.handler):
            raise ValueError(f"Agent '{self.name}' handler must be callable")


class AgentRegistry:
    """
    Central registry for all agents in the system.
    
    Features:
    - Dynamic registration (no hardcoded agent list)
    - Capability-based discovery
    - Priority ordering
    - Thread-safe operations
    """
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self._initialized = False
    
    def register(self, agent: Agent) -> None:
        """
        Register a new agent in the system.
        
        Args:
            agent: Agent instance to register
            
        Raises:
            ValueError: If agent with same name already exists
        """
        if agent.name in self.agents:
            log.warning(f"Agent '{agent.name}' already registered, replacing...")
        
        self.agents[agent.name] = agent
        log.info(
            f"✓ Registered agent: {agent.name} | "
            f"{len(agent.capabilities)} capabilities | "
            f"priority={agent.priority}"
        )
    
    def get_agent(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get agent by name.
        
        Args:
            name: Agent name
            
        Returns:
            Agent data as dict, or None if not found
        """
        agent = self.agents.get(name)
        if agent:
            # Convert dataclass to dict for easy access
            return {
                "name": agent.name,
                "description": agent.description,
                "capabilities": agent.capabilities,
                "handler": agent.handler,
                "priority": agent.priority,
                "config": agent.config
            }
        return None
    
    def find_capable_agents(self, task: str) -> List[Agent]:
        """
        Find all agents that can handle the given task.
        
        Matches task text against agent capabilities.
        Returns agents sorted by priority (highest first).
        
        Args:
            task: Task description (e.g., "build an outfit for a date")
            
        Returns:
            List of matching agents, sorted by priority
        """
        task_lower = task.lower()
        matches = [
            agent for agent in self.agents.values()
            if any(cap.lower() in task_lower for cap in agent.capabilities)
        ]
        
        # Sort by priority (highest first)
        return sorted(matches, key=lambda a: a.priority, reverse=True)
    
    def list_all(self) -> List[Dict[str, Any]]:
        """
        Get list of all registered agents (for debugging/monitoring).
        
        Returns:
            List of agent metadata dicts
        """
        return [
            {
                "name": agent.name,
                "description": agent.description,
                "capabilities": agent.capabilities,
                "priority": agent.priority,
                "config_keys": list(agent.config.keys()) if agent.config else []
            }
            for agent in self.agents.values()
        ]
    
    def get_agent_count(self) -> int:
        """Get total number of registered agents"""
        return len(self.agents)
    
    def clear(self) -> None:
        """Clear all registered agents (useful for testing)"""
        self.agents.clear()
        log.info("Cleared all agents from registry")


# Global registry instance
# Agents will register themselves by importing and calling registry.register()
registry = AgentRegistry()
