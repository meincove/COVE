# Cove Production Deployment Guide

**Date:** January 22, 2026  
**Version:** 1.0  
**Status:** ✅ Complete

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        meincove.com                              │
│                     (Frontend - Vercel)                          │
│                                                                  │
│    ┌─────────────────┐      ┌─────────────────────────────┐     │
│    │  Django Backend │      │  Cove AI Core (FastAPI)     │     │
│    │api.meincove.com │◄────►│   ai.meincove.com           │     │
│    │    (Railway)    │      │      (Railway)              │     │
│    └────────┬────────┘      └──────────────┬──────────────┘     │
│             │                              │                     │
│             └──────────────┬───────────────┘                     │
│                            │                                     │
│                 ┌──────────▼──────────┐                          │
│                 │   Neon PostgreSQL   │                          │
│                 │  (Cloud Database)   │                          │
│                 └─────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

| Service | URL | Platform |
|---------|-----|----------|
| **Frontend** | `https://meincove.com` | Vercel |
| **Backend API** | `https://api.meincove.com` | Railway |
| **AI Chatbot** | `https://ai.meincove.com` | Railway |
| **Database** | Neon PostgreSQL | Neon.tech |

---

## Part 1: Frontend Deployment (Vercel)

### Platform
- **Hosting:** Vercel (Hobby tier)
- **Framework:** Next.js 16.1.4
- **Repository:** `meincove/COVE`
- **Root Directory:** `frontend`

### Security Fix Applied
**Issue:** Vercel blocked deployment due to CVE-2025-66478 (critical vulnerability in Next.js 15.x).

**Resolution:**
1. Upgraded `next` from `15.3.2` to `16.1.4`
2. Added `.npmrc` with `legacy-peer-deps=true`
3. Set build command to `next build --webpack`

### Domain Configuration (Namecheap → Vercel)

| Type | Host | Value |
|------|------|-------|
| A Record | `@` | `76.76.21.21` |
| CNAME | `www` | `30addc145c3c65ce.vercel-dns-017.com` |

### Environment Variables (Vercel Dashboard)

```env
NEXT_PUBLIC_API_BASE=https://api.meincove.com
NEXT_PUBLIC_BACKEND_BASE_URL=https://api.meincove.com
DJANGO_BACKEND_URL=https://api.meincove.com
AI_CORE_URL=https://ai.meincove.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Part 2: Backend Deployment (Railway)

### Platform
- **Hosting:** Railway (Hobby tier - $5/month credits)
- **Service Name:** `COVE`
- **Framework:** Django + Gunicorn
- **Root Directory:** `backend`

### Build & Deploy Commands

```bash
# Build Command
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate

# Start Command
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

### Custom Domain Setup

| Type | Host | Value |
|------|------|-------|
| CNAME | `api` | `bqtur08r.up.railway.app` |

### Environment Variables (Railway)

```json
{
  "DJANGO_SECRET_KEY": "[secret]",
  "DATABASE_URL": "postgresql://neondb_owner:...@ep-mute-dream-ag0ojpws-pooler.../neondb?sslmode=require",
  "PGHOST": "ep-mute-dream-ag0ojpws-pooler.c-2.eu-central-1.aws.neon.tech",
  "PGPORT": "5432",
  "PGDATABASE": "neondb",
  "PGUSER": "neondb_owner",
  "PGPASSWORD": "[secret]",
  "PGSSLMODE": "require",
  "USE_RDS": "1",
  "DEBUG": "False",
  "ALLOWED_HOSTS": ".railway.app,.meincove.com,api.meincove.com",
  "CORS_ALLOWED_ORIGINS": "https://meincove.com,https://www.meincove.com",
  "CSRF_TRUSTED_ORIGINS": "https://meincove.com,https://www.meincove.com",
  "CLERK_SECRET_KEY": "[secret]",
  "STRIPE_SECRET_KEY": "[secret]",
  "STRIPE_WEBHOOK_SECRET": "[secret]",
  "STRIPE_SUCCESS_URL": "https://meincove.com/payment/result?session_id={CHECKOUT_SESSION_ID}",
  "STRIPE_CANCEL_URL": "https://meincove.com/checkout",
  "STRIPE_CURRENCY": "eur"
}
```

### Errors Fixed

| Error | Cause | Solution |
|-------|-------|----------|
| Bad Request (400) | `ALLOWED_HOSTS` used `*.railway.app` | Changed to `.railway.app` (leading dot) |
| Products not loading | Vercel pointed to wrong URL | Updated to `api.meincove.com` |

---

## Part 3: AI Core Deployment (Railway)

### Platform
- **Hosting:** Railway (Hobby tier)
- **Service Name:** `COVE-ai-chatbot` (proud-sparkle)
- **Framework:** FastAPI + Uvicorn
- **Root Directory:** `cove-ai-core`

### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Custom Domain Setup

| Type | Host | Value |
|------|------|-------|
| CNAME | `ai` | `jfb87u5n.up.railway.app` |

### Environment Variables (Railway)

```json
{
  "APP_URL": "https://meincove.com",
  "LLM_BACKEND": "openrouter",
  "GEN_MODEL": "openrouter:openai/gpt-4o-mini",
  "ESCALATE_MODEL": "openrouter:anthropic/claude-3.5-sonnet",
  "RERANK_MODEL": "cohere:rerank-3",
  "EMBED_MODEL": "openrouter:openai/text-embedding-3-small",
  "OPENROUTER_API_KEY": "[secret]",
  "OPENAI_API_KEY": "[secret]",
  "COHERE_API_KEY": "[secret]",
  "PG_DSN": "postgresql://neondb_owner:...@.../neondb?sslmode=require",
  "DJANGO_BASE_URL": "https://api.meincove.com",
  "USE_TOOLS_LAYER": "true",
  "USE_LLM_ROUTER": "true",
  "AGENT_MAX_HISTORY_MESSAGES": "6"
}
```

### Error Fixed

| Error | Cause | Solution |
|-------|-------|----------|
| Empty Dockerfile error | Dockerfile was empty | Created proper Python 3.11 Dockerfile with uvicorn |

---

## Part 4: DNS Configuration Summary (Namecheap)

All DNS records for `meincove.com`:

| Type | Host | Value | Purpose |
|------|------|-------|---------|
| A | `@` | `216.198.79.1` | Main domain → Vercel |
| CNAME | `www` | `30addc...vercel-dns-017.com` | www subdomain → Vercel |
| CNAME | `api` | `bqtur08r.up.railway.app` | API subdomain → Railway Backend |
| CNAME | `ai` | `jfb87u5n.up.railway.app` | AI subdomain → Railway Chatbot |

---

## Testing Checklist

- [x] Frontend loads at `meincove.com`
- [x] Products display from `api.meincove.com`
- [x] Clerk authentication works
- [x] Bubbles AI chatbot connects to `ai.meincove.com`
- [ ] Stripe checkout flow (requires live testing)
- [ ] Email notifications

---

## Troubleshooting

### Services "Sleeping"
Railway Hobby plan may sleep services after inactivity. First request takes 15-30 seconds.

### DNS Not Working
DNS propagation can take up to 72 hours, but usually 5-10 minutes. Check with:
```bash
nslookup api.meincove.com
nslookup ai.meincove.com
```

### 500 Errors
Check Railway → Service → Deploy Logs for Python errors.

---

## Future Improvements

1. **Monitoring:** Add Sentry for error tracking
2. **Caching:** Add Redis for session/cache
3. **CDN:** Configure Vercel Edge for static assets
4. **Backups:** Set up Neon database backups
