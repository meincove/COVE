# app/providers/embedding.py
from __future__ import annotations

import logging
import httpx
from typing import List

from app.core.config import (
    EMBED_MODEL,
    OPENAI_API_KEY,
    OPENROUTER_API_KEY,
    COHERE_API_KEY,
)

log = logging.getLogger("cove.embedding")

async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts using the configured provider.
    Async-native implementation.
    """
    if not texts:
        return []

    model = EMBED_MODEL or ""
    
    # 1. OpenRouter
    if model.startswith("openrouter:"):
        m = model.split("openrouter:", 1)[1]
        url = "https://openrouter.ai/api/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"model": m, "input": texts}
        
        async with httpx.AsyncClient(timeout=30) as cx:
            r = await cx.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            # OpenRouter returns OpenAI-shape
            return [d["embedding"] for d in data["data"]]

    # 2. Cohere
    elif model.startswith("cohere:"):
        m = model.split("cohere:", 1)[1]
        url = "https://api.cohere.ai/v1/embed"
        headers = {
            "Authorization": f"Bearer {COHERE_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"model": m, "texts": texts}
        
        async with httpx.AsyncClient(timeout=30) as cx:
            r = await cx.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["embeddings"]

    # 3. OpenAI (Direct)
    else:
        m = model.split("openai:", 1)[1] if model.startswith("openai:") else (model or "text-embedding-3-small")
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"model": m, "input": texts}
        
        async with httpx.AsyncClient(timeout=30) as cx:
            r = await cx.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return [d["embedding"] for d in data["data"]]


async def embed_query(query: str) -> List[float]:
    """
    Helper for single query embedding.
    """
    embeddings = await embed_texts([query])
    return embeddings[0] if embeddings else []
