import os
from dotenv import load_dotenv
load_dotenv()

APP_URL = os.getenv("APP_URL", "http://localhost")
PORT = int(os.getenv("PORT", "8080"))

LLM_BACKEND = os.getenv("LLM_BACKEND", "openrouter")
GEN_MODEL = os.getenv("GEN_MODEL", "openrouter:gpt-4o-mini")
ESCALATE_MODEL = os.getenv("ESCALATE_MODEL", "openrouter:anthropic/claude-3.5-sonnet")
RERANK_MODEL = os.getenv("RERANK_MODEL", "cohere:rerank-3")
EMBED_MODEL = os.getenv("EMBED_MODEL", "openai:text-embedding-3-small")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

PG_DSN = os.getenv("PG_DSN")
