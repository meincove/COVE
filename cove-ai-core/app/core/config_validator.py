# app/core/config_validator.py
"""
Configuration validation for Week 6 production readiness.

Validates environment variables and configuration on startup.
"""
import os
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger("cove.config")

# Required environment variables
REQUIRED_VARS: Dict[str, str] = {
    "OPENROUTER_API_KEY": "OpenRouter API key for LLM calls",
    "GEN_MODEL": "Default LLM model to use",
}

# Optional environment variables with defaults
OPTIONAL_VARS: Dict[str, Tuple[str, str]] = {
    "USE_MCP_TOOLS": ("Enable MCP tool routing", "false"),
    "NEXT_PUBLIC_USE_STREAMING": ("Enable streaming responses", "false"),
    "REDIS_HOST": ("Redis host for cache", "localhost"),
    "LOG_LEVEL": ("Logging level", "INFO"),
    "USE_REDIS_CACHE": ("Use Redis for cache", "false"),
    "ENABLE_RESPONSE_CACHE": ("Enable response caching", "true"),
}


def validate_config() -> Tuple[bool, List[str], List[str]]:
    """
    Validate all configuration.
    
    Returns:
        Tuple of (is_valid, errors, warnings)
    """
    errors = []
    warnings = []
    
    # Check required vars
    for var, description in REQUIRED_VARS.items():
        value = os.getenv(var)
        if not value:
            errors.append(f"Missing required env var: {var} ({description})")
        elif value and value.strip():
            logger.debug(f"✓ {var} is set")
    
    # Check optional vars
    for var, (description, default) in OPTIONAL_VARS.items():
        value = os.getenv(var)
        if not value:
            warnings.append(f"Optional env var not set: {var} ({description}) - using default: {default}")
        else:
            logger.debug(f"✓ {var} = {value}")
    
    # Validate model format
    model = os.getenv("GEN_MODEL", "")
    if model and ":" not in model:
        warnings.append(
            f"GEN_MODEL '{model}' doesn't follow 'provider:model' format. "
            "Expected format: 'openrouter:openai/gpt-4o-mini'"
        )
    
    return len(errors) == 0, errors, warnings


def validate_and_report() -> None:
    """
    Validate configuration and log results.
    
    Raises:
        RuntimeError: If required configuration is missing
    """
    logger.info("🔍 Validating configuration...")
    
    is_valid, errors, warnings = validate_config()
    
    # Log warnings
    if warnings:
        logger.warning("⚠️  Configuration warnings:")
        for warning in warnings:
            logger.warning(f"  - {warning}")
    
    # Log errors
    if errors:
        logger.error("❌ Configuration validation failed:")
        for error in errors:
            logger.error(f"  - {error}")
        raise RuntimeError(
            "Invalid configuration. Please check environment variables."
        )
    
    logger.info("✅ Configuration validated successfully")
    
    # Log feature flags
    logger.info("🚩 Feature flags:")
    logger.info(f"  - MCP Tools: {os.getenv('USE_MCP_TOOLS', 'false')}")
    logger.info(f"  - Streaming: {os.getenv('NEXT_PUBLIC_USE_STREAMING', 'false')}")
    logger.info(f"  - Response Cache: {os.getenv('ENABLE_RESPONSE_CACHE', 'true')}")
    logger.info(f"  - Redis Cache: {os.getenv('USE_REDIS_CACHE', 'false')}")
