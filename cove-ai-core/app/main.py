# cove-ai-core/app/main.py
from fastapi import FastAPI

app = FastAPI(title="Cove AI Core", version="0.1.0")

@app.get("/health/")
def ok():
    return {"ok": True}