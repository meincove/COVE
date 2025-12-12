"""
Tool usage tracker for transparency.
STANDALONE module - doesn't modify existing code!

Research-backed: Showing tool use increases understanding
Pattern: Similar to GitHub MCP server tool visibility
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
import time
import logging

log = logging.getLogger("cove.tools")


@dataclass
class ToolUsage:
    """
    Tracks a single tool invocation.
    
    Attributes:
        tool_name: Name of the tool (hybrid_search, size_recommend, etc.)
        started_at: When the tool started
        ended_at: When the tool finished (None if still running)
        inputs: What we sent to the tool (optional)
        outputs: What the tool returned (optional)
        success: Whether the tool succeeded
        error: Error message if failed
    """
    tool_name: str
    started_at: float
    ended_at: Optional[float] = None
    inputs: Optional[Dict] = None
    outputs: Optional[Dict] = None
    success: bool = True
    error: Optional[str] = None
    
    @property
    def duration_ms(self) -> int:
        """Calculate duration in milliseconds"""
        if self.ended_at:
            return int((self.ended_at - self.started_at) * 1000)
        return 0
    
    @property
    def summary(self) -> str:
        """
        Human-readable summary of tool usage.
        
        Examples:
            "hybrid_search (247 items)"
            "size_recommend (M, 94% confidence)"
            "price_optimize (saved €12)"
        """
        if not self.success:
            return f"{self.tool_name} (failed)"
        
        # Generate summary based on tool type
        if self.tool_name == "hybrid_search":
            if self.outputs and "results" in self.outputs:
                item_count = len(self.outputs["results"])
                return f"{self.tool_name} ({item_count} items)"
            return self.tool_name
        
        elif self.tool_name == "size_recommend":
            if self.outputs:
                size = self.outputs.get("size", "?")
                conf = self.outputs.get("confidence", 0)
                return f"{self.tool_name} (size {size}, {conf:.0f}% confidence)"
            return self.tool_name
        
        elif self.tool_name == "price_optimize":
            if self.outputs:
                savings = self.outputs.get("savings", 0)
                return f"{self.tool_name} (saved €{savings:.2f})"
            return self.tool_name
        
        else:
            # Generic summary
            return self.tool_name
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "tool": self.tool_name,
            "duration_ms": self.duration_ms,
            "success": self.success,
            "summary": self.summary,
            "error": self.error
        }


class ToolTracker:
    """
    Tracks tool usage for transparency.
    
    Usage:
        tracker = ToolTracker()
        usage = tracker.start("hybrid_search", inputs={"query": "hoodies"})
        # ... call tool ...
        tracker.complete(usage, outputs={"results": [...]})
        summary = tracker.get_summary()
    """
    
    def __init__(self):
        self.tools_used: List[ToolUsage] = []
    
    def start(
        self, 
        tool_name: str, 
        inputs: Optional[Dict] = None
    ) -> ToolUsage:
        """
        Start tracking a tool call.
        
        Args:
            tool_name: Name of the tool
            inputs: Optional inputs sent to tool
            
        Returns:
            ToolUsage object to pass to complete() later
        """
        usage = ToolUsage(
            tool_name=tool_name,
            started_at=time.time(),
            inputs=inputs
        )
        self.tools_used.append(usage)
        log.debug(f"Tool started: {tool_name}")
        return usage
    
    def complete(
        self, 
        usage: ToolUsage, 
        outputs: Optional[Dict] = None
    ):
        """
        Complete a tool call successfully.
        
        Args:
            usage: The ToolUsage object from start()
            outputs: Optional outputs from the tool
        """
        usage.ended_at = time.time()
        usage.outputs = outputs
        usage.success = True
        log.debug(f"Tool completed: {usage.tool_name} ({usage.duration_ms}ms)")
    
    def error(
        self, 
        usage: ToolUsage, 
        error: str
    ):
        """
        Mark tool call as failed.
        
        Args:
            usage: The ToolUsage object from start()
            error: Error message
        """
        usage.ended_at = time.time()
        usage.success = False
        usage.error = error
        log.warning(f"Tool failed: {usage.tool_name} - {error} ({usage.duration_ms}ms)")
    
    def get_summary(self) -> List[Dict]:
        """Get summary of all tools used"""
        return [tool.to_dict() for tool in self.tools_used]
    
    def get_total_time(self) -> int:
        """Get total time spent in tools (ms)"""
        return sum(tool.duration_ms for tool in self.tools_used)
    
    def get_stats(self) -> Dict:
        """Get detailed statistics"""
        return {
            "total_tools": len(self.tools_used),
            "successful": len([t for t in self.tools_used if t.success]),
            "failed": len([t for t in self.tools_used if not t.success]),
            "total_duration_ms": self.get_total_time(),
            "tools_by_name": self._count_by_name()
        }
    
    def _count_by_name(self) -> Dict[str, int]:
        """Count how many times each tool was used"""
        counts = {}
        for tool in self.tools_used:
            counts[tool.tool_name] = counts.get(tool.tool_name, 0) + 1
        return counts
    
    def clear(self):
        """Clear tracking for new request"""
        self.tools_used = []
