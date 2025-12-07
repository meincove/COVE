# app/routes/metrics.py
"""
Metrics and monitoring endpoints for Week 6.

Provides visibility into system performance, caching, and health.
"""
from fastapi import APIRouter
import time
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/metrics/dashboard")
async def get_metrics_dashboard() -> Dict[str, Any]:
    """
    Comprehensive metrics dashboard.
    
    Returns:
        Dict with all system metrics
    """
    from app.core.mcp_client import get_mcp_client
    from app.core.prompt_builder import get_optimization_stats
    from app.core.cache import get_cache_stats
    from app.core.response_cache import get_cache_stats as get_response_cache_stats
    
    try:
        # MCP routing metrics
        mcp_client = get_mcp_client()
        mcp_metrics = mcp_client.get_metrics()
    except Exception as e:
        logger.warning(f"Failed to get MCP metrics: {e}")
        mcp_metrics = {"error": str(e)}
    
    try:
        # Prompt optimization stats
        prompt_stats = get_optimization_stats()
    except Exception as e:
        logger.warning(f"Failed to get prompt stats: {e}")
        prompt_stats = {"error": str(e)}
    
    try:
        # Cache performance (Week 4)
        cache_stats = get_cache_stats()
    except Exception as e:
        logger.warning(f"Failed to get cache stats: {e}")
        cache_stats = {"error": str(e)}
    
    try:
        # Response cache (Week 6)
        response_cache_stats = get_response_cache_stats()
    except Exception as e:
        logger.warning(f"Failed to get response cache stats: {e}")
        response_cache_stats = {"error": str(e)}
    
    return {
        "timestamp": time.time(),
        "mcp": mcp_metrics,
        "prompts": prompt_stats,
        "cache": cache_stats,
        "response_cache": response_cache_stats,
        "status": "healthy"
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Comprehensive health check for monitoring.
    
    Returns:
        Dict with health status and component checks
    """
    health = {
        "status": "healthy",
        "timestamp": time.time(),
        "checks": {}
    }
    
    # Check OpenRouter API
    try:
        from app.providers.llm import LLMClient
        import os
        
        if os.getenv("OPENROUTER_API_KEY"):
            health["checks"]["openrouter_configured"] = "ok"
        else:
            health["checks"]["openrouter_configured"] = "missing_api_key"
            health["status"] = "degraded"
    except Exception as e:
        health["checks"]["openrouter"] = f"error: {str(e)}"
        health["status"] = "degraded"
    
    # Check cache
    try:
        from app.core.cache import get_cache_stats
        stats = get_cache_stats()
        health["checks"]["cache"] = "ok"
        health["checks"]["cache_size"] = stats.get("size", 0)
    except Exception as e:
        health["checks"]["cache"] = f"error: {str(e)}"
    
    # Check MCP client
    try:
        from app.core.mcp_client import get_mcp_client
        client = get_mcp_client()
        health["checks"]["mcp_client"] = "ok"
        health["checks"]["mcp_enabled"] = client.should_use_mcp()
    except Exception as e:
        health["checks"]["mcp_client"] = f"error: {str(e)}"
    
    # Check prompt templates
    try:
        from app.core.prompt_builder import get_optimization_stats
        stats = get_optimization_stats()
        health["checks"]["prompt_templates"] = "ok"
        health["checks"]["templates_count"] = stats.get("total_templates", 0)
    except Exception as e:
        health["checks"]["prompt_templates"] = f"error: {str(e)}"
    
    # Check response cache
    try:
        from app.core.response_cache import get_cache_stats as get_response_stats
        stats = get_response_stats()
        health["checks"]["response_cache"] = "ok"
    except Exception as e:
        health["checks"]["response_cache"] = f"error: {str(e)}"
    
    return health


@router.get("/metrics/streaming")
async def get_streaming_metrics() -> Dict[str, Any]:
    """
    Streaming-specific performance metrics.
    
    Note: This would be enhanced with actual metric tracking.
    For now, returns placeholder structure.
    
    Returns:
        Dict with streaming metrics
    """
    return {
        "note": "Streaming metrics tracking to be implemented",
        "recommendation": "Use structured logging and log aggregation",
        "sample_metrics": {
            "avg_first_token_ms": "Track via logs",
            "avg_total_time_ms": "Track via logs",
            "cache_hit_rate": "Track via logs",
            "request_count": "Track via logs"
        }
    }
