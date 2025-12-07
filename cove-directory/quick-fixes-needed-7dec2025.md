# Quick Fixes Needed
**Date: 7th December 2025**

## ✅ What I Just Fixed

1. **Added Sign Out button** to navbar ✅
   - Now shows both "Dashboard" and "Sign Out" when signed in

## 🔧 What YOU Need to Do

### Add These Lines to Your `.env.local`

Open `frontend/.env.local` and add these lines at the end:

```bash
# Clerk Custom Pages Configuration
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

**Why these are needed:**
- Tells Clerk to use your custom pages at `/sign-in` and `/sign-up`
- After auth, redirects to `/` (welcome page) instead of `/shop`

### Your Complete `.env.local` Should Look Like:

```bash
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
NEXT_PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:8000
DJANGO_BACKEND_URL=http://127.0.0.1:8000

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cHJldHR5LWNvbHQtMS5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_ygKCuHBmduuZDRDOHCZhsPdgbHMzO7SzVjSMd2tVOV

# ADD THESE NEW LINES:
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RiGQxPvEqNq4PmbGfxBB0oIUZiR2SujacZCP9UewhywxlszCjT0fBVX2mWxld3xphW9b90XdeyALWqXPuB3JCDm00s2nlQ3xs
```

### After Adding, Restart Dev Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 🎯 What This Will Fix

1. ✅ **Sign in/up from welcome page** → Returns to welcome page (not /shop)
2. ✅ **Clerk routing error** → Fixed with catch-all routes
3. ✅ **Sign out button** → Now visible in navbar

---

## 🚧 Still TODO (From Your Requirements)

These need more work and we should discuss:

1. **Welcome page personalized greeting**
   - Show "Hey {FirstName}!" when signed in
   - Need to update welcome page component

2. **Auth prompt after curation**
   - Add sign-in prompt on last question
   - Redirect based on selected card

3. **Hide navbar on welcome page**
   - Currently navbar shows everywhere
   - Need to hide it on `/` route

**Should I implement these next?**
