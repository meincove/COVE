# app/main.py
from fastapi import FastAPI
from app.routes.rag import router as rag_router
from app.routes import tools as tools_routes
# app/main.py (or wherever you include routers)
from app.routes.fit import router as fit_router
from app.routes.health import router as health_router
from app.routes import recs



from dotenv import load_dotenv
load_dotenv() 



app = FastAPI(title="Cove AI Core")  # <- let FastAPI use JSONResponse
app.include_router(tools_routes.router)
app.include_router(rag_router)
app.include_router(fit_router)
app.include_router(health_router)
app.include_router(recs.router)

@app.get("/healthz")
async def health():
    return {"ok": True}              # <- no trailing comma
