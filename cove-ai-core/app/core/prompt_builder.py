# app/core/prompt_builder.py
"""
Dynamic prompt template system for intent-based optimization.

Selects and formats prompts based on intent, reducing token count while
maintaining quality. Configuration-driven, not hardcoded.
"""
import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass

log = logging.getLogger("cove.core.prompt_builder")

# Resolve data directory
try:
    _ROOT_DIR = Path(__file__).resolve().parents[2]
except IndexError:
    _ROOT_DIR = Path(__file__).resolve().parent

_DATA_DIR = Path(os.getenv("COVE_DATA_DIR", str(_ROOT_DIR / "data")))

# Cache
_PROMPT_CONFIG: Optional[Dict[str, Any]] = None
_TEMPLATE_CACHE: Dict[str, str] = {}


@dataclass
class PromptTemplate:
    """Represents a loaded prompt template with metadata."""
    content: str
    max_tokens: int
    temperature: float
    description: str
    intent: str


def _load_prompt_config() -> Dict[str, Any]:
    """Load prompt configuration from data/prompt_config.json."""
    global _PROMPT_CONFIG
    
    if _PROMPT_CONFIG is not None:
        return _PROMPT_CONFIG
    
    config_path = _DATA_DIR / "prompt_config.json"
    
    if not config_path.exists():
        log.warning(f"Prompt config not found: {config_path}, using defaults")
        return {
            "templates": {},
            "default_template": "agent_chat.txt",
            "features": {"use_optimized_prompts": False}
        }
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            _PROMPT_CONFIG = json.load(f)
        
        log.info(f"Loaded prompt config with {len(_PROMPT_CONFIG.get('templates', {}))} templates")
        return _PROMPT_CONFIG
        
    except Exception as e:
        log.error(f"Failed to load prompt config: {e}")
        return {
            "templates": {},
            "default_template": "agent_chat.txt",
            "features": {"use_optimized_prompts": False}
        }


def _load_template_file(filename: str) -> str:
    """Load template content from data/prompts/ directory."""
    # Check cache first
    if filename in _TEMPLATE_CACHE:
        return _TEMPLATE_CACHE[filename]
    
    template_path = _DATA_DIR / "prompts" / filename
    
    if not template_path.exists():
        log.warning(f"Template file not found: {template_path}")
        return ""
    
    try:
        content = template_path.read_text(encoding='utf-8').strip()
        _TEMPLATE_CACHE[filename] = content
        return content
        
    except Exception as e:
        log.error(f"Failed to load template {filename}: {e}")
        return ""


def get_template_for_intent(intent_kind: str) -> PromptTemplate:
    """
    Get optimized prompt template for given intent.
    
    Args:
        intent_kind: Intent classification (e.g. "greeting", "discover", "size_fit")
        
    Returns:
        PromptTemplate with content, max_tokens, temperature, etc.
    """
    config = _load_prompt_config()
    
    # Check if optimization is enabled
    if not config.get("features", {}).get("use_optimized_prompts", True):
        # Fall back to default template
        default_file = config.get("default_template", "agent_chat.txt")
        content = _load_template_file(default_file)
        
        return PromptTemplate(
            content=content,
            max_tokens=300,
            temperature=0.7,
            description="Default full prompt",
            intent="default"
        )
    
    # Get template config for this intent
    templates = config.get("templates", {})
    template_config = templates.get(intent_kind)
    
    if not template_config:
        # No specific template for this intent, use default
        log.debug(f"No template for intent '{intent_kind}', using default")
        default_file = config.get("default_template", "agent_chat.txt")
        content = _load_template_file(default_file)
        
        return PromptTemplate(
            content=content,
            max_tokens=300,
            temperature=0.7,
            description="Default fallback",
            intent=intent_kind
        )
    
    # Load the intent-specific template
    template_file = template_config["template_file"]
    content = _load_template_file(template_file)
    
    if not content:
        # Fallback if template file failed to load
        log.warning(f"Template file empty for {intent_kind}, using default")
        default_file = config.get("defaulttemplate", "agent_chat.txt")
        content = _load_template_file(default_file)
    
    return PromptTemplate(
        content=content,
        max_tokens=template_config.get("max_tokens", 200),
        temperature=template_config.get("temperature", 0.7),
        description=template_config.get("description", ""),
        intent=intent_kind
    )


def format_prompt(template: PromptTemplate, message: str, **context) -> str:
    """
    Format template with user message and optional context.
    
    Args:
        template: PromptTemplate to format
        message: User's message
        **context: Additional context variables (history, products, etc.)
        
    Returns:
        Formatted prompt string
    """
    try:
        # Basic formatting with message
        formatted = template.content.replace("{message}", message)
        
        # Replace any other context variables
        for key, value in context.items():
            placeholder = f"{{{key}}}"
            if placeholder in formatted:
                formatted = formatted.replace(placeholder, str(value))
        
        return formatted
        
    except Exception as e:
        log.error(f"Failed to format prompt: {e}")
        return template.content


def build_messages_for_intent(
    intent_kind: str,
    user_message: str,
    history: Optional[list] = None,
    **context
) -> Tuple[list, Dict[str, Any]]:
    """
    Build LLM messages array for given intent.
    
    Args:
        intent_kind: Intent classification
        user_message: User's message
        history: Optional conversation history
        **context: Additional context (products, filters, etc.)
        
    Returns:
        Tuple of (messages array, metadata dict)
        
    Example:
        messages, meta = build_messages_for_intent("greeting", "hi there")
        # messages = [{"role": "system", "content": "..."}, ...]
        # meta = {"template": "greeting", "max_tokens": 100, ...}
    """
    # Get template for this intent
    template = get_template_for_intent(intent_kind)
    
    # Format system prompt
    system_prompt = format_prompt(template, user_message, **context)
    
    # Build messages array
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    # Add history if provided (for context-aware responses)
    if history:
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
    
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    # Return messages and metadata
    metadata = {
        "template": template.intent,
        "max_tokens": template.max_tokens,
        "temperature": template.temperature,
        "description": template.description,
        "system_prompt_length": len(system_prompt),
        "total_messages": len(messages)
    }
    
    return messages, metadata


def get_optimization_stats() -> Dict[str, Any]:
    """
    Get statistics about prompt optimization.
    
    Returns:
        Dict with template counts, token savings estimates, etc.
    """
    config = _load_prompt_config()
    
    templates = config.get("templates", {})
    default_file = config.get("default_template", "agent_chat.txt")
    default_content = _load_template_file(default_file)
    default_tokens = len(default_content.split())  # Rough estimate
    
    stats = {
        "enabled": config.get("features", {}).get("use_optimized_prompts", True),
        "total_templates": len(templates),
        "intents_covered": list(templates.keys()),
        "default_tokens_estimate": default_tokens,
        "optimized_tokens_avg": 0,
        "estimated_reduction": 0.0
    }
    
    # Calculate average optimized template size
    if templates:
        total_optimized = 0
        for template_config in templates.values():
            template_file = template_config["template_file"]
            content = _load_template_file(template_file)
            total_optimized += len(content.split())
        
        avg_optimized = total_optimized / len(templates)
        stats["optimized_tokens_avg"] = int(avg_optimized)
        
        if default_tokens > 0:
            reduction = (default_tokens - avg_optimized) / default_tokens
            stats["estimated_reduction"] = round(reduction, 2)
    
    return stats


def reload_templates():
    """Clear caches to force reload from disk."""
    global _PROMPT_CONFIG, _TEMPLATE_CACHE
    _PROMPT_CONFIG = None
    _TEMPLATE_CACHE.clear()
    log.info("Prompt templates reloaded")
