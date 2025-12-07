# app/core/llm_streaming.py
"""
LLM streaming wrapper for Week 5 performance improvements.

Uses OpenRouter for streaming (compatible with existing LLMClient config).
"""
from typing import AsyncGenerator, Dict, Any, Optional
import time
import logging
import os
import httpx

logger = logging.getLogger(__name__)

# OpenRouter configuration (from existing setup)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
GEN_MODEL = os.getenv("GEN_MODEL", "openrouter:openai/gpt-4o-mini")


async def stream_openai_completion(
    messages: list,
    model: str = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None
) -> AsyncGenerator[str, None]:
    """
    Stream tokens from OpenRouter and track performance metrics.
    
    Uses OpenRouter API (compatible with existing config).
    
    Args:
        messages: Chat messages
        model: Model name (default: from GEN_MODEL env)
        temperature: Randomness (default: 0.7)
        max_tokens: Maximum tokens to generate
        
    Yields:
        str: Each token chunk as it arrives
        
    Also tracks first-token metrics and logs completion stats.
    """
    # Use configured model if not specified
    if not model:
        model = GEN_MODEL
    
    # Strip "openrouter:" prefix if present
    if model.startswith("openrouter:"):
        model_name = model.split("openrouter:", 1)[1]
    else:
        model_name = model
    
    # Validate API key
    if not OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not set")
        yield "Error: OpenRouter API key not configured"
        return
    
    start_time = time.time()
    first_token_time = None
    accumulated_text = ""
    token_count = 0
    
    try:
        # OpenRouter streaming request
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "stream": True  # Enable streaming
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
        
        # Create streaming request
        async with httpx.AsyncClient(timeout=30) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                response.raise_for_status()
                
                # Process SSE stream
                async for line in response.aiter_lines():
                    # SSE format: "data: {...}"
                    if not line.strip():
                        continue
                        
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        
                        # Handle "[DONE]" marker
                        if data_str.strip() == "[DONE]":
                            break
                        
                        try:
                            import json
                            chunk = json.loads(data_str)
                            
                            # Extract token from chunk
                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                delta = chunk["choices"][0].get("delta", {})
                                token = delta.get("content")
                                
                                if token:
                                    token_count += 1
                                    
                                    # Track first token time (critical metric!)
                                    if first_token_time is None:
                                        first_token_time = time.time()
                                        first_token_ms = (first_token_time - start_time) * 1000
                                        
                                        logger.info(f"🚀 First token in {first_token_ms:.0f}ms", extra={
                                            "first_token_ms": first_token_ms,
                                            "model": model_name
                                        })
                                    
                                    # Accumulate for logging
                                    accumulated_text += token
                                    
                                    # Yield to caller (for SSE)
                                    yield token
                                    
                        except json.JSONDecodeError:
                            continue
        
        # Log completion metrics
        total_time = time.time() - start_time
        tokens_per_second = token_count / total_time if total_time > 0 else 0
        
        logger.info("✅ Streaming complete", extra={
            "total_time_ms": total_time * 1000,
            "first_token_ms": (first_token_time - start_time) * 1000 if first_token_time else None,
            "token_count": token_count,
            "tokens_per_second": tokens_per_second,
            "response_length": len(accumulated_text)
        })
        
    except Exception as e:
        logger.error(f"❌ Streaming error: {e}", exc_info=True)
        yield f"\n\n[Error: {str(e)}]"


async def stream_with_fallback(
    messages: list,
    model: str = None,
    temperature: float = 0.7
) -> AsyncGenerator[str, None]:
    """
    Stream with fallback to blocking if streaming fails.
    
    This ensures we never break existing functionality.
    """
    try:
        async for token in stream_openai_completion(messages, model, temperature):
            yield token
    except Exception as e:
        logger.error(f"Streaming failed, using fallback: {e}")
        
        # Fallback to existing LLMClient
        try:
            from app.providers.llm import LLMClient
            client = LLMClient(model=model)
            text = await client.generate(messages)
            yield text
            
        except Exception as fallback_error:
            logger.error(f"Fallback also failed: {fallback_error}")
            yield "I'm having trouble processing your request. Please try again."
