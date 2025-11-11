# app/main.py
from fastapi import FastAPI
from app.routes.rag import router as rag_router
from app.routes import tools as tools_routes


app = FastAPI(title="Cove AI Core")  # <- let FastAPI use JSONResponse
app.include_router(tools_routes.router)
app.include_router(rag_router)

@app.get("/healthz")
async def health():
    return {"ok": True}              # <- no trailing comma
