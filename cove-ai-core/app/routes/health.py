# app/routes/health.py
from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/ai/rag/flags")
def flags():
    def g(k, d=""): return os.getenv(k, d)
    return {
        "DISABLE_RERANK": g("DISABLE_RERANK"),
        "DISABLE_TOOLS_HTTP_FALLBACK": g("DISABLE_TOOLS_HTTP_FALLBACK"),
        "LLM_BYPASS_ON_FAIL": g("LLM_BYPASS_ON_FAIL"),
        "LLM_HARD_TIMEOUT_SECS": g("LLM_HARD_TIMEOUT_SECS"),
    }
