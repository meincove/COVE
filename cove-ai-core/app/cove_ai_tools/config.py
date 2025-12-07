# cove_ai_tools/config.py
"""
Configuration for AI tools layer.

Centralized configuration to avoid hardcoding and enable easy environment-specific changes.
"""
import os
from typing import Optional


class ToolsConfig:
    """Configuration container for AI tools layer."""
    
    # Django Backend URLs
    DJANGO_BASE_URL: str = os.getenv("DJANGO_BASE_URL", "http://127.0.0.1:8001")
    
    # API Endpoints
    PAYMENTS_CHECKOUT_URL: str = f"{DJANGO_BASE_URL}/api/payments/create-checkout-session/"
    ORDERS_MINE_URL: str = f"{DJANGO_BASE_URL}/api/orders/mine/"
    ORDERS_SEND_RECEIPT_URL: str = f"{DJANGO_BASE_URL}/api/orders/send-receipt/"
    
    # Timeouts (in seconds)
    HTTP_TIMEOUT: int = int(os.getenv("AI_TOOLS_HTTP_TIMEOUT", "30"))
    
    # Retry configuration
    MAX_RETRIES: int = int(os.getenv("AI_TOOLS_MAX_RETRIES", "3"))
    RETRY_BACKOFF: float = float(os.getenv("AI_TOOLS_RETRY_BACKOFF", "1.0"))
    
    # Cache configuration
    CACHE_TTL_SECONDS: int = int(os.getenv("AI_TOOLS_CACHE_TTL", "600"))  # 10 minutes default
    CACHE_MAX_SIZE: int = int(os.getenv("AI_TOOLS_CACHE_MAX_SIZE", "1000"))
    
    # Logging
    LOG_LEVEL: str = os.getenv("AI_TOOLS_LOG_LEVEL", "INFO")
    
    @classmethod
    def validate(cls) -> None:
        """Validate configuration on startup."""
        assert cls.DJANGO_BASE_URL, "DJANGO_BASE_URL must be set"
        assert cls.HTTP_TIMEOUT > 0, "HTTP_TIMEOUT must be positive"
        assert cls.MAX_RETRIES >= 0, "MAX_RETRIES must be non-negative"


# Validate on module import
ToolsConfig.validate()
