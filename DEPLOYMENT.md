# COVE Deployment Guide

## Quick Start

For a fresh deployment of COVE, run the automated setup script:

```bash
./scripts/setup.sh
```

This will:
- ✅ Check environment files
- ✅ Install Python & Node dependencies  
- ✅ Run Django migrations
- ✅ Seed Neo4j with product data
- ✅ Initialize vector embeddings
- ✅ Verify all connections

## Manual Setup

If you prefer step-by-step setup:

### 1. Environment Configuration

Copy environment templates:
```bash
cp cove-ai-core/.env.example cove-ai-core/.env
cp backend/.env.example backend/.env
```

Configure required variables:
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
- `CLERK_SECRET_KEY`
- Database credentials

### 2. Install Dependencies

**Python (FastAPI + Django):**
```bash
cd cove-ai-core && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
cd ../backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

**Node (Next.js):**
```bash
cd frontend && npm install
```

### 3. Database Setup

**Django migrations:**
```bash
cd backend
python manage.py migrate
python manage.py createsuperuser  # Optional
```

**Neo4j seeding:**
```bash
cd cove-ai-core
python scripts/seed_products.py
```

**Vector embeddings:**
```bash
cd cove-ai-core
python scripts/setup_vectors.py
```

### 4. Start Services

**Terminal 1 - FastAPI:**
```bash
cd cove-ai-core
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Django:**
```bash
cd backend
python manage.py runserver 8001
```

**Terminal 3 - Next.js:**
```bash
cd frontend
npm run dev
```

## What Gets Deployed

### Code (Git)
These files are version-controlled and deployed automatically:
- ✅ All Python/TypeScript code
- ✅ Config JSONs (`intent_classification_config.json`, `suggestions_config.json`, etc.)
- ✅ Prompts (`data/prompts/`)
- ✅ Documentation

### Data (Database)
These require manual seeding on fresh deployments:
- 📦 Product catalog → Neo4j
- 👤 User data → Postgres  
- 🔢 Vector embeddings → Vector store

## Verifying Deployment

After setup, verify everything works:

```bash
# Test FastAPI
curl http://localhost:8000/health

# Test Django
curl http://localhost:8001/api/health/

# Test frontend
open http://localhost:3000
```

**Test AI features:**
1. Open chat widget
2. Try: "show me hoodies"
3. Should see product recommendations

## Troubleshooting

**Neo4j connection fails:**
- Check `NEO4J_URI` in `.env`
- Ensure Neo4j is running: `docker ps` or check your cloud console

**Missing products:**
- Run: `python cove-ai-core/scripts/seed_products.py`

**Intent classification errors:**
- Check `OPENROUTER_API_KEY` or `OPENAI_API_KEY` in `.env`
- Verify API key has access to required models

**Vector embeddings fail:**
- Ensure products are seeded first
- Check embedding model API access

## Production Deployment

For production (e.g., Vercel, Railway, DigitalOcean):

1. **Set environment variables** on your platform
2. **Run migrations** via deployment hooks
3. **Seed databases** once on first deploy:
   ```bash
   python cove-ai-core/scripts/seed_products.py
   python cove-ai-core/scripts/setup_vectors.py
   ```
4. **Monitor logs** for `[INTENT_MONITOR]` and `[RECOMMENDER_MONITOR]`

## Next Steps

- Review [Intent Classification Architecture](docs/week5-6-documentation/llm_intent_classification_architecture.md)
- Read [Multi-Agent MCP Architecture](docs/week5-6-documentation/multi_agent_mcp_architecture.md)
- Check [Phase 2 Implementation Plan](.gemini/antigravity/brain/*/phase2_implementation_plan.md)
