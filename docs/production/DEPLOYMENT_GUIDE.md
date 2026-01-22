# Cove Deployment Guide
**Date:** January 22, 2026
**Author:** Antigravity AI Assistant

---

## Overview

This document details the complete deployment process for Cove - an AI-powered fashion marketplace.

| Component | Platform | URL |
|-----------|----------|-----|
| **Frontend** | Vercel | `https://meincove.com` |
| **Backend (Django)** | Railway | `https://cove-production-af3a.up.railway.app` |
| **Database** | Neon PostgreSQL | `ep-mute-dream-ag0ojpws-pooler.c-2.eu-central-1.aws.neon.tech` |
| **Auth** | Clerk | Clerk-hosted |

---

## Part 1: Frontend Deployment (Vercel)

### 1.1 Initial Setup
- **Platform:** Vercel (Free tier)
- **Repository:** `meincove/COVE`
- **Root Directory:** `frontend`
- **Framework:** Next.js 16.1.4

### 1.2 Security Fix (CVE-2025-66478)
**Problem:** Vercel blocked deployment due to critical vulnerability in Next.js 15.3.2.

**Solution:**
1. Upgraded `next` package to `16.1.4` in `package.json`
2. Added `.npmrc` with `legacy-peer-deps=true` to resolve Clerk conflict
3. Forced Webpack in build: `"build": "next build --webpack"`

### 1.3 Domain Configuration (Namecheap → Vercel)
**Domains:** `meincove.com`, `meincove.de`

**DNS Records Added in Namecheap:**
| Type | Host | Value |
|------|------|-------|
| A Record | `@` | `76.76.21.21` |
| CNAME | `www` | `30addc145c3c65ca.vercel-dns-017.com` |

**Issue Fixed:** Initial generic CNAME (`cname.vercel-dns.com`) failed SSL generation. Had to use Vercel's specific CNAME value from the dashboard.

### 1.4 Environment Variables (Vercel Dashboard)
```
NEXT_PUBLIC_API_BASE=https://cove-production-af3a.up.railway.app
NEXT_PUBLIC_BACKEND_BASE_URL=https://cove-production-af3a.up.railway.app
DJANGO_BACKEND_URL=https://cove-production-af3a.up.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Part 2: Backend Deployment (Railway)

### 2.1 Platform Choice
- **Selected:** Railway (Free tier with $5/month credits)
- **Alternatives Considered:** Render.com (no free Redis), AWS (too complex)

### 2.2 Service Configuration
**Root Directory:** `backend`
**Builder:** Railpack (auto-detected Python)

**Build Command:**
```bash
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
```

**Start Command:**
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

### 2.3 Environment Variables (Railway)
```json
{
  "DJANGO_SECRET_KEY": "...",
  "DATABASE_URL": "postgresql://neondb_owner:...@ep-mute-dream-ag0ojpws-pooler.../neondb?sslmode=require",
  "PGHOST": "ep-mute-dream-ag0ojpws-pooler.c-2.eu-central-1.aws.neon.tech",
  "PGPORT": "5432",
  "PGDATABASE": "neondb",
  "PGUSER": "neondb_owner",
  "PGPASSWORD": "...",
  "PGSSLMODE": "require",
  "USE_RDS": "1",
  "DEBUG": "False",
  "ALLOWED_HOSTS": ".railway.app,.meincove.com",
  "CORS_ALLOWED_ORIGINS": "https://meincove.com,https://www.meincove.com",
  "CSRF_TRUSTED_ORIGINS": "https://meincove.com,https://www.meincove.com",
  "CLERK_SECRET_KEY": "...",
  "STRIPE_SECRET_KEY": "...",
  "STRIPE_WEBHOOK_SECRET": "...",
  "STRIPE_SUCCESS_URL": "https://meincove.com/payment/result?session_id={CHECKOUT_SESSION_ID}",
  "STRIPE_CANCEL_URL": "https://meincove.com/checkout",
  "STRIPE_CURRENCY": "eur"
}
```

### 2.4 Errors Fixed

#### Error 1: Bad Request (400)
**Cause:** Django's `ALLOWED_HOSTS` used `*.railway.app` which doesn't work.
**Fix:** Changed to `.railway.app` (leading dot for subdomain matching).

#### Error 2: Products Not Loading
**Cause:** Vercel environment variables pointed to `api.meincove.com` which wasn't configured.
**Fix:** Updated to Railway URL `cove-production-af3a.up.railway.app`.

---

## Part 3: Database (Neon PostgreSQL)

**Already configured** - both frontend and backend use the existing Neon database.
- **Connection:** Via `DATABASE_URL` environment variable
- **SSL Mode:** `require`
- **No Migration Needed:** Railway runs `python manage.py migrate` on each deploy.

---

## Part 4: Authentication (Clerk)

Clerk works **independently** of the backend. Authentication data is stored on Clerk's servers.

**Frontend:** Uses `@clerk/nextjs` SDK
**Backend:** Uses `clerk-sdk-python` for JWT verification only

---

## Current Status

| Service | Status |
|---------|--------|
| Frontend (Vercel) | ✅ Live |
| Backend (Railway) | ✅ Live |
| Domain (meincove.com) | ✅ Connected |
| Products/Images | ✅ Loading |
| Bubbles AI Chatbot | ⏸️ Requires `cove-ai-core` (needs Railway Hobby plan) |

---

## Next Steps

1. **Upgrade to Railway Hobby ($5/mo)** to deploy `cove-ai-core` for AI chatbot
2. **Configure custom domain** `api.meincove.com` on Railway (requires Hobby)
3. **Test full checkout flow** with Stripe
4. **Set up monitoring** (Sentry, Railway Observability)
