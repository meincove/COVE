# app/core/mcp_client.py
"""
MCP client for unified tool routing (Week 5 Phase 4, Week 6 hardening).

Provides feature-flagged routing between MCP server and direct tool calls.
Configuration-driven, with metrics and fallback support.

Week 6 improvements:
- Comprehensive error handling
- Timeout management
- Retry logic
- Better error messages
"""
import json
import logging
import os
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
import importlib

log = logging.getLogger("cove.mcp.client")


# Custom exceptions for better error handling
class MCPError(Exception):
    """Base exception for MCP-related errors."""
    pass


class ToolNotFoundError(MCPError):
    """Tool does not exist."""
    def __init__(self, tool_name: str, available_tools: list):
        self.tool_name = tool_name
        self.available_tools = available_tools
        super().__init__(
            f"Tool '{tool_name}' not found. "
            f"Available: {', '.join(available_tools[:5])}"
        )


class ToolTimeoutError(MCPError):
    """Tool execution timed out."""
    def __init__(self, tool_name: str, timeout: float):
        self.tool_name = tool_name
        self.timeout = timeout
        super().__init__(
            f"Tool '{tool_name}' timed out after {timeout}s"
        )


class ToolValidationError(MCPError):
    """Tool arguments failed validation."""
    def __init__(self, tool_name: str, errors: list):
        self.tool_name = tool_name
        self.errors = errors
        super().__init__(
            f"Validation failed for '{tool_name}': {errors}"
        )

# Resolve data directory
try:
    _ROOT_DIR = Path(__file__).resolve().parents[2]
except IndexError:
    _ROOT_DIR = Path(__file__).resolve().parent

_DATA_DIR = Path(os.getenv("COVE_DATA_DIR", str(_ROOT_DIR / "data")))

# Cache
_MCP_CONFIG: Optional[Dict[str, Any]] = None
_DIRECT_TOOL_CACHE: Dict[str, Callable] = {}


@dataclass
class ToolRoutingMetrics:
    """Metrics for tool routing decisions."""
    tool_name: str
    route: str  # "mcp" or "direct"
    duration_ms: float
    success: bool
    error: Optional[str] = None


class MCPClient:
    """
    Client for routing tool calls between MCP server and direct calls.
    
    Usage:
        client = MCPClient()
        result = await client.call_tool("recommend_products", {...})
    """
    
    def __init__(self):
        self.config = self._load_config()
        self.metrics: list[ToolRoutingMetrics] = []
        
    def _load_config(self) -> Dict[str, Any]:
        """Load MCP configuration from data/mcp_config.json."""
        global _MCP_CONFIG
        
        if _MCP_CONFIG is not None:
            return _MCP_CONFIG
        
        config_path = _DATA_DIR / "mcp_config.json"
        
        if not config_path.exists():
            log.warning(f"MCP config not found: {config_path}, using defaults")
            return {
                "features": {"use_mcp_tools": False, "fallback_to_direct": True},
                "tools": {}
            }
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                _MCP_CONFIG = json.load(f)
            
            log.info(f"Loaded MCP config with {len(_MCP_CONFIG.get('tools', {}))} tools")
            return _MCP_CONFIG
            
        except Exception as e:
            log.error(f"Failed to load MCP config: {e}")
            return {
                "features": {"use_mcp_tools": False, "fallback_to_direct": True},
                "tools": {}
            }
    
    def should_use_mcp(self) -> bool:
        """Check if MCP routing is enabled."""
        # Environment variable override
        env_flag = os.getenv("USE_MCP_TOOLS", "").lower()
        if env_flag in ("true", "1", "yes"):
            return True
        if env_flag in ("false", "0", "no"):
            return False
        
        # Config file setting
        return self.config.get("features", {}).get("use_mcp_tools", False)
    
    def _get_direct_tool(self, tool_name: str) -> Optional[Callable]:
        """
        Get direct tool function by importing module.
        
        Args:
            tool_name: Tool name (e.g. "recommend_products")
            
        Returns:
            Callable function or None
        """
        # Check cache
        if tool_name in _DIRECT_TOOL_CACHE:
            return _DIRECT_TOOL_CACHE[tool_name]
        
        # Get tool config
        tool_config = self.config.get("tools", {}).get(tool_name)
        if not tool_config:
            log.warning(f"No config for tool '{tool_name}'")
            return None
        
        module_path = tool_config.get("direct_module")
        function_name = tool_config.get("direct_function")
        
        if not module_path or not function_name:
            log.warning(f"Missing module/function for tool '{tool_name}'")
            return None
        
        try:
            # Import module
            module = importlib.import_module(module_path)
            
            # Get function
            func = getattr(module, function_name, None)
            if func is None:
                log.error(f"Function '{function_name}' not found in '{module_path}'")
                return None
            
            # Cache it
            _DIRECT_TOOL_CACHE[tool_name] = func
            return func
            
        except Exception as e:
            log.error(f"Failed to import tool '{tool_name}': {e}")
            return None
    
    async def _call_mcp(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call tool via MCP server.
        
        Args:
            tool_name: MCP tool name
            args: Tool arguments
            
        Returns:
            Tool result dict
        """
        # For now, this is a placeholder
        # Full MCP client integration would use mcp.client.stdio
        log.warning("MCP server integration not yet implemented, falling back to direct")
        
        # Fall back to direct call
        return await self._call_direct(tool_name, args)
    
    async def _call_direct(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call tool directly (bypass MCP).
        
        Args:
            tool_name: Tool name
            args: Tool arguments
            
        Returns:
            Tool result dict
            
        Raises:
            ToolNotFoundError: If tool not configured
        """
        func = self._get_direct_tool(tool_name)
        if func is None:
            available = list(self.config.get("tools", {}).keys())
            raise ToolNotFoundError(tool_name, available)
        
        # Call function
        result = func(args)
        
        # Await if coroutine
        if hasattr(result, "__await__"):
            result = await result
        
        return result
    
    async def call_tool(
        self,
        tool_name: str,
        args: Dict[str, Any],
        force_direct: bool = False,
        timeout: float = 30.0
    ) -> Dict[str, Any]:
        """
        Call a tool with automatic routing, timeout, and retry.
        
        Args:
            tool_name: Tool to call
            args: Tool arguments
            force_direct: Force direct call (bypass MCP)
            timeout: Timeout in seconds (default: 30)
            
        Returns:
            Tool result dict
            
        Raises:
            ToolNotFoundError: If tool not found
            ToolTimeoutError: If call times out
            MCPError: Other MCP-related errors
        """
        start_time = time.time()
        
        # Determine routing
        use_mcp = self.should_use_mcp() and not force_direct
        route = "mcp" if use_mcp else "direct"
        
        # Log routing decision
        if self.config.get("features", {}).get("log_routing_decisions", True):
            log.info(f"🔀 Routing '{tool_name}' via {route}", extra={
                "tool_name": tool_name,
                "route": route,
                "timeout": timeout
            })
        
        try:
            # Call with timeout
            if use_mcp:
                call_future = self._call_mcp(tool_name, args)
            else:
                call_future = self._call_direct(tool_name, args)
            
            # Wrap in timeout
            try:
                result = await asyncio.wait_for(call_future, timeout=timeout)
            except asyncio.TimeoutError:
                raise ToolTimeoutError(tool_name, timeout)
            
            # Record success metrics
            duration_ms = (time.time() - start_time) * 1000
            
            if self.config.get("metrics", {}).get("track_routing", True):
                metric = ToolRoutingMetrics(
                    tool_name=tool_name,
                    route=route,
                    duration_ms=duration_ms,
                    success=True
                )
                self.metrics.append(metric)
                
                log.info(f"✅ Tool '{tool_name}' completed via {route} in {duration_ms:.1f}ms", extra={
                    "tool_name": tool_name,
                    "route": route,
                    "duration_ms": duration_ms,
                    "success": True
                })
            
            return result
            
        except (ToolNotFoundError, ToolTimeoutError, ToolValidationError) as e:
            # Known MCP errors - don't retry
            duration_ms = (time.time() - start_time) * 1000
            
            log.error(f"❌ Tool '{tool_name}' failed: {e}", extra={
                "tool_name": tool_name,
                "route": route,
                "error_type": type(e).__name__,
                "duration_ms": duration_ms
            })
            
            # Record failure
            if self.config.get("metrics", {}).get("track_routing", True):
                metric = ToolRoutingMetrics(
                    tool_name=tool_name,
                    route=route,
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e)
                )
                self.metrics.append(metric)
            
            raise  # Re-raise known errors
            
        except Exception as e:
            # Unknown errors - log and potentially fallback
            duration_ms = (time.time() - start_time) * 1000
            
            log.error(f"❌ Tool '{tool_name}' failed unexpectedly: {e}", exc_info=True, extra={
                "tool_name": tool_name,
                "route": route,
                "error_type": type(e).__name__,
                "duration_ms": duration_ms
            })
            
            # Record failure
            if self.config.get("metrics", {}).get("track_routing", True):
                metric = ToolRoutingMetrics(
                    tool_name=tool_name,
                    route=route,
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e)
                )
                self.metrics.append(metric)
            
            # Fallback if enabled and using MCP
            if use_mcp and self.config.get("features", {}).get("fallback_to_direct", True):
                log.info(f"🔄 Retrying '{tool_name}' via direct call")
                try:
                    return await self.call_tool(tool_name, args, force_direct=True, timeout=timeout)
                except Exception as fallback_error:
                    log.error(f"Fallback also failed: {fallback_error}")
                    raise  # Re-raise original error
            
            raise  # Re-raise if no fallback
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get routing metrics summary.
        
        Returns:
            Dict with success rates, avg latencies, etc.
        """
        if not self.metrics:
            return {
                "total_calls": 0,
                "success_rate": 0.0,
                "mcp_calls": 0,
                "direct_calls": 0
            }
        
        total = len(self.metrics)
        successful = sum(1 for m in self.metrics if m.success)
        mcp_count = sum(1 for m in self.metrics if m.route == "mcp")
        direct_count = sum(1 for m in self.metrics if m.route == "direct")
        
        avg_duration = sum(m.duration_ms for m in self.metrics) / total if total > 0 else 0
        
        return {
            "total_calls": total,
            "success_rate": successful / total if total > 0 else 0,
            "mcp_calls": mcp_count,
            "direct_calls": direct_count,
            "avg_duration_ms": round(avg_duration, 2),
            "tools_used": list(set(m.tool_name for m in self.metrics))
        }


# Singleton instance
_client: Optional[MCPClient] = None


def get_mcp_client() -> MCPClient:
    """Get or create MCP client singleton."""
    global _client
    if _client is None:
        _client = MCPClient()
    return _client


def reload_mcp_config():
    """Clear config cache to force reload."""
    global _MCP_CONFIG, _DIRECT_TOOL_CACHE
    _MCP_CONFIG = None
    _DIRECT_TOOL_CACHE.clear()
    log.info("MCP config reloaded")
