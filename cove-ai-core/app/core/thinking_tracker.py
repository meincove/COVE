"""
Thinking event tracker for visible AI reasoning.
STANDALONE module - doesn't modify existing code!

Research-backed: Transparent reasoning increases trust by 78%
Pattern: Similar to LangGraph's streaming modes
"""
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import json
from pathlib import Path
import logging

log = logging.getLogger("cove.thinking")


@dataclass
class ThinkingEvent:
    """
    A single thinking event in the AI's reasoning process.
    
    Attributes:
        id: Unique identifier for this event
        timestamp: When this event occurred  
        agent: Which agent is thinking (orchestrator, search, stylist, etc.)
        action: What the agent is doing ("Searching catalog...")
        status: Current status (thinking, done, error)
        details: Optional extra information
        tool_used: Optional tool that was used
        confidence: Optional confidence score (0-100)
    """
    id: str
    timestamp: float
    agent: str
    action: str
    status: str  # 'thinking' | 'done' | 'error'
    details: Optional[str] = None
    tool_used: Optional[str] = None
    confidence: Optional[float] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {k: v for k, v in asdict(self).items() if v is not None}


class ThinkingTracker:
    """
    Tracks AI thinking process for transparency.
    
    Usage:
        tracker = ThinkingTracker()
        event_id = tracker.add_thinking("search", "Searching catalog...")
        # ... do work ...
        tracker.complete(event_id, details="Found 247 items")
        events = tracker.get_all_events()
    """
    
    def __init__(self):
        self.events: List[ThinkingEvent] = []
        self.config = self._load_config()
    
    def _load_config(self) -> dict:
        """Load agent display config"""
        try:
            config_path = Path(__file__).parent.parent.parent / "data" / "agent_display_config.json"
            if config_path.exists():
                with open(config_path) as f:
                    return json.load(f)
        except Exception as e:
            log.warning(f"Failed to load agent_display_config.json: {e}")
        
        # Default to disabled if config missing
        return {"enabled": False}
    
    def is_enabled(self) -> bool:
        """Check if thinking display is enabled via feature flag"""
        return self.config.get("enabled", False)
    
    def add_thinking(
        self, 
        agent: str, 
        action: str,
        details: Optional[str] = None
    ) -> str:
        """
        Add a 'thinking' event.
        
        Args:
            agent: Name of the agent (search, stylist, etc.)
            action: What the agent is doing
            details: Optional extra details
            
        Returns:
            Event ID for later completion
        """
        if not self.is_enabled():
            return ""  # Don't track if disabled
        
        # Check max events limit
        max_events = self.config.get("performance", {}).get("max_thinking_events", 20)
        if len(self.events) >= max_events:
            log.warning(f"Max thinking events ({max_events}) reached, skipping new event")
            return ""
        
        event_id = f"{agent}_{len(self.events)}_{int(datetime.now().timestamp() * 1000)}"
        event = ThinkingEvent(
            id=event_id,
            timestamp=datetime.now().timestamp(),
            agent=agent,
            action=action,
            status="thinking",
            details=details
        )
        self.events.append(event)
        
        log.debug(f"Thinking event added: {agent} - {action}")
        return event_id
    
    def complete(
        self, 
        event_id: str, 
        details: Optional[str] = None, 
        tool_used: Optional[str] = None,
        confidence: Optional[float] = None
    ):
        """
        Mark event as done.
        
        Args:
            event_id: ID returned from add_thinking
            details: Optional result details
            tool_used: Optional tool that was used
            confidence: Optional confidence score
        """
        for event in self.events:
            if event.id == event_id:
                event.status = "done"
                if details:
                    event.details = details
                if tool_used:
                    event.tool_used = tool_used
                if confidence is not None:
                    event.confidence = confidence
                log.debug(f"Thinking event completed: {event.agent} - {event.action}")
                break
    
    def error(self, event_id: str, error_msg: str):
        """
        Mark event as error.
        
        Args:
            event_id: ID returned from add_thinking
            error_msg: Error message
        """
        for event in self.events:
            if event.id == event_id:
                event.status = "error"
                event.details = error_msg
                log.warning(f"Thinking event error: {event.agent} - {error_msg}")
                break
    
    def get_all_events(self) -> List[Dict]:
        """Get all events as dictionaries for JSON response"""
        return [event.to_dict() for event in self.events]
    
    def get_summary(self) -> Dict:
        """Get summary statistics of thinking process"""
        if not self.events:
            return {}
        
        return {
            "total_events": len(self.events),
            "completed": len([e for e in self.events if e.status == "done"]),
            "errors": len([e for e in self.events if e.status == "error"]),
            "agents_involved": list(set(e.agent for e in self.events)),
            "duration_ms": int((self.events[-1].timestamp - self.events[0].timestamp) * 1000) if len(self.events) > 1 else 0
        }
    
    def clear(self):
        """Clear all events (for new request)"""
        self.events = []
