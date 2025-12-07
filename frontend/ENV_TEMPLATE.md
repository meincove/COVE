# ========================================
# CLERK AUTHENTICATION
# ========================================
# Get these from: https://dashboard.clerk.com

# Publishable key (safe to expose in frontend)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# Secret key (NEVER expose in frontend)
CLERK_SECRET_KEY=sk_test_your_secret_here

# Custom Auth Pages (using our custom UI)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# After auth redirects (handled dynamically in code based on localStorage)
# These are fallback URLs if localStorage is empty
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/shop
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/shop

# ========================================
# BACKEND API
# ========================================
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# ========================================
# OPTIONAL: For production
# ========================================
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
# CLERK_SECRET_KEY=sk_live_your_production_secret
# NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
