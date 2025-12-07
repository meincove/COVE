# app/core/performance.py
"""
Performance measurement and monitoring utilities.

Provides decorators and utilities for tracking execution time
and performance metrics.
"""
import time
import logging
from functools import wraps
from typing import Callable, Any

logger = logging.getLogger("cove.performance")


def measure_time(operation_name: str):
    """
    Decorator to measure and log execution time.
    
    Args:
        operation_name: Name of the operation being measured
        
    Example:
        @measure_time("recommend_products")
        async def recommend_products(...):
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start) * 1000
                
                logger.info(
                    f"{operation_name} completed in {duration_ms:.0f}ms",
                    extra={
                        "operation": operation_name,
                        "duration_ms": duration_ms,
                        "status": "success"
                    }
                )
                
                return result
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                
                logger.error(
                    f"{operation_name} failed after {duration_ms:.0f}ms: {e}",
                    extra={
                        "operation": operation_name,
                        "duration_ms": duration_ms,
                        "status": "error",
                        "error": str(e)
                    }
                )
                
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start) * 1000
                
                logger.info(
                    f"{operation_name} completed in {duration_ms:.0f}ms",
                    extra={
                        "operation": operation_name,
                        "duration_ms": duration_ms,
                        "status": "success"
                    }
                )
                
                return result
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                
                logger.error(
                    f"{operation_name} failed after {duration_ms:.0f}ms: {e}",
                    extra={
                        "operation": operation_name,
                        "duration_ms": duration_ms,
                        "status": "error",
                        "error": str(e)
                    }
                )
                
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class Timer:
    """
    Context manager for timing code blocks.
    
    Example:
        with Timer("database_query") as timer:
            result = await db.query(...)
        print(f"Query took {timer.duration_ms}ms")
    """
    
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.start_time = None
        self.duration_ms = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration_ms = (time.time() - self.start_time) * 1000
        
        if exc_type is None:
            logger.info(
                f"{self.operation_name} completed in {self.duration_ms:.0f}ms",
                extra={
                    "operation": self.operation_name,
                    "duration_ms": self.duration_ms,
                    "status": "success"
                }
            )
        else:
            logger.error(
                f"{self.operation_name} failed after {self.duration_ms:.0f}ms",
                extra={
                    "operation": self.operation_name,
                    "duration_ms": self.duration_ms,
                    "status": "error",
                    "error": str(exc_val)
                }
            )
