# app/main.py
from dotenv import load_dotenv
# Forced reload for filter fix
load_dotenv()

# Week 6: Validate configuration on startup
from app.core.config_validator import validate_and_report
try:
    validate_and_report()
except RuntimeError as e:
    import sys
    import logging
    logging.error(f"Configuration error: {e}")
    # Don't exit in development - just warn
    logging.warning("Continuing anyway (development mode)")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.rag import router as rag_router
from app.routes import tools as tools_routes
from app.routes.fit import router as fit_router
from app.routes.health import router as health_router
from app.routes import recs, agent, assistant
# from app.routes import streaming  -> Removed (redundant)
from app.routes import agent_stream  # Week 6: Agent with thinking progress
from app.routes import metrics  # Week 6: Metrics and monitoring
from app.routes import feedback # Week 3 Day 3: Enhanced User Profile
from app.routes import events  # Phase 3: Proactive Agent


app = FastAPI(title="Cove AI Core")
app.include_router(tools_routes.router)
app.include_router(rag_router)
app.include_router(fit_router)
app.include_router(health_router)
app.include_router(recs.router)
app.include_router(agent.router)
app.include_router(assistant.router)
app.include_router(feedback.router, prefix="/ai") # e.g. /ai/feedback
# app.include_router(streaming.router, prefix="/ai") -> Removed (redundant)
app.include_router(agent_stream.router)  # Week 6: Agent progress streaming
# Week 6: Metrics endpoints
app.include_router(metrics.router, prefix="/api", tags=["metrics"])
app.include_router(events.router)  # Phase 3: Proactive Agent


@app.get("/healthz")
async def health():
    return {"ok": True}              # <- no trailing comma
