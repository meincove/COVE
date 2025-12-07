# app/config.py
from __future__ import annotations

import os

# Base URL for the FastAPI "AI core" (this repo)
# Exposes /ai/recs/suggest, /ai/fit/recommend, /ai/agent, etc.
COVE_CORE_BASE_URL: str = os.getenv("COVE_CORE_BASE_URL", "http://127.0.0.1:8000")

# Base URL for the Django backend (orders, cart, users, etc.)
DJANGO_BASE_URL: str = os.getenv("DJANGO_BASE_URL", "http://127.0.0.1:8001")
