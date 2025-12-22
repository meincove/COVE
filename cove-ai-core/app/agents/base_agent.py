"""
Base Agent - Abstract base class for all agents.

Provides standard interface and common functionality.
All specialized agents (stylist, fit, budget) inherit from this.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import logging

log = logging.getLogger("cove.agents.base")


@dataclass
class AgentResult:
    """
    Standard result format returned by all agents.
    
    Attributes:
        success: Whether agent execution succeeded
        data: Agent-specific result data
        reasoning: Human-readable explanation of what agent did
        confidence: Confidence score 0.0-1.0
        tools_used: List of tool names used
        errors: List of error messages (if any)
        execution_time_ms: How long agent took to execute
    """
    success: bool
    data: Dict[str, Any]
    reasoning: str
    confidence: float  # 0.0 to 1.0
    tools_used: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    execution_time_ms: Optional[float] = None
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate result"""
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"Confidence must be 0.0-1.0, got {self.confidence}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "success": self.success,
            "data": self.data,
            "reasoning": self.reasoning,
            "confidence": self.confidence,
            "tools_used": self.tools_used,
            "errors": self.errors,
            "execution_time_ms": self.execution_time_ms,
            "timestamp": self.timestamp.isoformat()
        }


class BaseAgent(ABC):
    """
    Abstract base class for all agents.
    
    Provides:
    - Standard execute() interface
    - Input validation
    - Execution logging
    - Error handling
    
    Subclasses must implement:
    - execute(): Core agent logic
    - validate_input(): Input validation (optional override)
    """
    
    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        """
        Initialize agent.
        
        Args:
            name: Agent name (e.g., "stylist")
            config: Optional configuration dict
        """
        self.name = name
        self.config = config or {}
        self.execution_count = 0
        log.info(f"Initialized {self.name} agent")
    
    @abstractmethod
    async def execute(
        self, 
        task: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> AgentResult:
        """
        Execute agent-specific logic.
        
        Must be implemented by each agent subclass.
        
        Args:
            task: Task-specific parameters
                  e.g., {"query": "business casual outfit", "budget_max": 300}
            context: Shared context from orchestrator
                     e.g., {"user_profile": {...}, "size_history": {...}}
        
        Returns:
            AgentResult with success, data, reasoning, etc.
        """
        pass
    
    def validate_input(self, task: Dict[str, Any]) -> bool:
        """
        Validate input before execution.
        
        Override in subclass for custom validation.
        
        Args:
            task: Task parameters to validate
            
        Returns:
            True if valid, False otherwise
        """
        return isinstance(task, dict)
    
    def log_execution(self, result: AgentResult) -> None:
        """
        Log agent execution result.
        
        Args:
            result: Execution result to log
        """
        status = "✓" if result.success else "✗"
        confidence_pct = f"{result.confidence:.0%}"
        
        log.info(
            f"{status} {self.name}: {result.reasoning} "
            f"(confidence: {confidence_pct}, "
            f"tools: {len(result.tools_used)})"
        )
        
        if result.errors:
            for error in result.errors:
                log.error(f"  Error in {self.name}: {error}")
    
    async def run(
        self, 
        task: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> AgentResult:
        """
        Run agent with validation and logging.
        
        Wrapper around execute() that adds:
        - Input validation
        - Execution timing
        - Logging
        - Error handling
        
        Args:
            task: Task parameters
            context: Execution context
            
        Returns:
            AgentResult
        """
        from time import time
        
        # Validate input
        if not self.validate_input(task):
            return AgentResult(
                success=False,
                data={},
                reasoning=f"Invalid input for {self.name}",
                confidence=0.0,
                errors=["Input validation failed"]
            )
        
        # Execute with timing
        start = time()
        try:
            result = await self.execute(task, context)
            result.execution_time_ms = (time() - start) * 1000
            self.execution_count += 1
        except Exception as e:
            log.exception(f"Error in {self.name} execution")
            result = AgentResult(
                success=False,
                data={},
                reasoning=f"Execution failed: {str(e)}",
                confidence=0.0,
                errors=[str(e)],
                execution_time_ms=(time() - start) * 1000
            )
        
        # Log result
        self.log_execution(result)
        
        return result
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent execution statistics"""
        return {
            "name": self.name,
            "execution_count": self.execution_count,
            "config": self.config
        }
