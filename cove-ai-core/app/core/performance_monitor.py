"""
Performance monitoring and SLA enforcement for COVE agents.
Ensures we maintain <2s response time even with complex multi-agent workflows.

Research-backed: 1 second delay = 7% engagement drop
Goal: P95 < 2s, P99 < 3s
"""
import time
import logging
from functools import wraps
from typing import Dict, List, Optional, Callable
from datetime import datetime
import json
from pathlib import Path

log = logging.getLogger("cove.performance")


class PerformanceMonitor:
    """
    Track and enforce performance SLAs.
    Alert if response time exceeds budgets.
    
    Usage:
        perf = PerformanceMonitor()
        
        @perf.track_performance("product_search")
        async def search_products(query: str):
            # ... search logic
            pass
    """
    
    # Performance budgets (milliseconds)
    # Research-backed: Total should be < 2000ms
    DEFAULT_BUDGETS = {
        "intent_classification": 200,
        "product_search": 500,
        "agent_execution": 1500,  # For parallel agents!
        "total_response": 2000
    }
    
    def __init__(self):
        self.budgets = self._load_budgets()
        self.metrics: List[Dict] = []
        self.violations: List[Dict] = []
    
    def _load_budgets(self) -> Dict[str, int]:
        """Load performance budgets from config or use defaults"""
        try:
            config_path = Path(__file__).parent.parent.parent / "data" / "performance_budgets.json"
            if config_path.exists():
                with open(config_path) as f:
                    return json.load(f)
        except Exception as e:
            log.warning(f"Failed to load performance_budgets.json: {e}")
        
        return self.DEFAULT_BUDGETS.copy()
    
    def track_performance(self, operation: str, budget_override: Optional[int] = None):
        """
        Decorator to track operation performance.
        
        Args:
            operation: Name of the operation (e.g., "product_search")
            budget_override: Optional budget in ms to override config
        """
        def decorator(func: Callable):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                start = time.time()
                error = None
                result = None
                
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    error = str(e)
                    raise
                finally:
                    duration_ms = (time.time() - start) * 1000
                    budget = budget_override or self.budgets.get(operation, 5000)
                    
                    # Record metric
                    metric = {
                        "operation": operation,
                        "duration_ms": duration_ms,
                        "budget_ms": budget,
                        "timestamp": datetime.now().isoformat(),
                        "success": error is None
                    }
                    self.metrics.append(metric)
                    
                    # Check budget violation
                    if duration_ms > budget:
                        violation = {
                            **metric,
                            "violation_pct": ((duration_ms / budget) - 1) * 100
                        }
                        self.violations.append(violation)
                        
                        log.warning(
                            f"⚠️  PERFORMANCE VIOLATION: {operation} took {duration_ms:.0f}ms (budget: {budget}ms, +{violation['violation_pct']:.0f}%)",
                            extra=violation
                        )
                    else:
                        log.info(
                            f"✅ {operation}: {duration_ms:.0f}ms (within budget: {budget}ms)",
                            extra=metric
                        )
            
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                start = time.time()
                error = None
                result = None
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    error = str(e)
                    raise
                finally:
                    duration_ms = (time.time() - start) * 1000
                    budget = budget_override or self.budgets.get(operation, 5000)
                    
                    metric = {
                        "operation": operation,
                        "duration_ms": duration_ms,
                        "budget_ms": budget,
                        "timestamp": datetime.now().isoformat(),
                        "success": error is None
                    }
                    self.metrics.append(metric)
                    
                    if duration_ms > budget:
                        violation = {
                            **metric,
                            "violation_pct": ((duration_ms / budget) - 1) * 100
                        }
                        self.violations.append(violation)
                        log.warning(f"⚠️  PERFORMANCE VIOLATION: {operation} took {duration_ms:.0f}ms (budget: {budget}ms)")
                    else:
                        log.info(f"✅ {operation}: {duration_ms:.0f}ms")
            
            # Return async or sync wrapper based on function type
            import inspect
            if inspect.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator
    
    def get_stats(self) -> Dict:
        """Get performance statistics"""
        if not self.metrics:
            return {}
        
        durations = [m["duration_ms"] for m in self.metrics]
        durations.sort()
        
        n = len(durations)
        return {
            "total_operations": n,
            "p50_ms": durations[int(n * 0.5)] if n > 0 else 0,
            "p95_ms": durations[int(n * 0.95)] if n > 1 else durations[-1] if n > 0 else 0,
            "p99_ms": durations[int(n * 0.99)] if n > 2 else durations[-1] if n > 0 else 0,
            "violations": len(self.violations),
            "violation_rate": len(self.violations) / n if n > 0 else 0,
            "avg_ms": sum(durations) / n if n > 0 else 0
        }
    
    def get_violations(self) -> List[Dict]:
        """Get all performance violations"""
        return self.violations
    
    def clear(self):
        """Clear metrics (for testing)"""
        self.metrics = []
        self.violations = []


# Global instance
_monitor = PerformanceMonitor()


def get_monitor() -> PerformanceMonitor:
    """Get global performance monitor"""
    return _monitor
