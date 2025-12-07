# Auth Flow Implementation - Complete Guide
**Date: 7th December 2025**

## ✅ Frontend Changes (DONE)

### 1. Navbar Updated
**File:** `frontend/src/components/Navbar/NavbarComponents/FullModeNavbar/FullNavbar.tsx`

**Changes:**
- ✅ Removed `openSignIn()` and `openSignUp()` (Clerk modals)
- ✅ Now uses `router.push('/sign-in')` and `router.push('/sign-up')`
- ✅ All auth buttons now navigate to custom pages

### 2. Sign-In Page Enhanced
**File:** `frontend/src/app/sign-in/page.tsx`

**Features:**
- ✅ Uses Clerk's `<SignIn>` component
- ✅ Smart redirect after sign-in:
  - If `localStorage.cove_selected_path === 'platform'` → `/partner-onboarding`
  - Otherwise → `/shop`

### 3. Sign-Up Page Enhanced
**File:** `frontend/src/app/sign-up/page.tsx`

**Features:**
- ✅ Uses Clerk's `<SignUp>` component
- ✅ Syncs user to backend after registration
- ✅ Smart redirect based on selected path
- ✅ Error handling if backend sync fails

---

## 🔧 Setup Required

### Step 1: Update `.env.local`

**File:** `frontend/.env.local`

Add these variables (see `ENV_TEMPLATE.md` for full template):

```bash
# Your existing keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# NEW: Custom auth pages
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/shop
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/shop

# NEW: Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Step 2: Configure Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **Paths** section
4. Set:
   - **Sign-in page path**: `/sign-in`
   - **Sign-up page path**: `/sign-up`
   - **After sign-in URL**: `/shop`
   - **After sign-up URL**: `/shop`

---

## 🔴 Backend Fixes Required

### Fix 1: Update UserProfile Model

**File:** `backend/api/models.py`

**Current (WRONG):**
```python
class UserProfile(models.Model):
    clerk_id = models.CharField(max_length=255, unique=True)  # ❌
```

**Change to:**
```python
class UserProfile(models.Model):
    clerk_user_id = models.CharField(max_length=255, unique=True, db_index=True)  # ✅
```

**Run migration:**
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Fix 2: Add Sync Endpoint

**File:** `backend/api/views.py`

Add the sync_user function from `SYNC_USER_ENDPOINT.py`

**File:** `backend/api/urls.py`

Add route:
```python
from django.urls import path
from . import views

urlpatterns = [
    # ... existing routes ...
    path('sync-user/', views.sync_user, name='sync_user'),
]
```

### Fix 3: Enable CORS (if not already done)

**File:** `backend/settings.py`

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3002",
]
```

---

## 🧪 Testing

### Test 1: Shop User Flow

1. **Start fresh:**
   - Clear browser localStorage
   - Sign out from Clerk

2. **Visit welcome page:**
   ```
   http://localhost:3000
   ```

3. **Click "COVE SHOP" card**
   - Should set `localStorage.cove_selected_path = 'shop'`

4. **Click "Sign Up" (top-right pill)**
   - Should navigate to `/sign-up`
   - Complete sign-up with email or OAuth

5. **After sign-up:**
   - Should sync to backend
   - Should redirect to `/shop`

6. **Check backend:**
   - User should exist in database
   - UserProfile should have `clerk_user_id`

### Test 2: Platform User Flow

1. **Clear localStorage and sign out**

2. **Visit welcome page**

3. **Click "COVE PLATFORM" card**
   - Should set `localStorage.cove_selected_path = 'platform'`

4. **Click "Sign Up"**
   - Complete sign-up

5. **After sign-up:**
   - Should redirect to `/partner-onboarding`

### Test 3: Navbar Auth Buttons

1. **Sign out**

2. **Visit any page** (e.g., `/shop`)

3. **Click "Sign in" in navbar**
   - Should navigate to `/sign-in`
   - Complete sign-in

4. **After sign-in:**
   - Should redirect to `/shop` (default)
   - Navbar should show "Dashboard" button

### Test 4: Session Persistence

1. **Sign in**

2. **Close browser completely**

3. **Reopen and visit site**
   - Should still be signed in (Clerk session)
   - Should show "Dashboard" in navbar

4. **Check backend:**
   - User data should persist

---

## 🐛 Troubleshooting

### Issue: "clerk_id field not found"

**Cause:** UserProfile model still uses `clerk_id` instead of `clerk_user_id`

**Fix:**
1. Update model to use `clerk_user_id`
2. Run migrations
3. Update sync endpoint to use `clerk_user_id`

### Issue: Redirect not working

**Cause:** localStorage not set or Clerk config wrong

**Fix:**
1. Check browser console for `cove_selected_path`
2. Verify Clerk dashboard paths are set correctly
3. Check `.env.local` has correct URLs

### Issue: Backend sync fails

**Cause:** CORS or endpoint not found

**Fix:**
1. Check backend is running on port 8000
2. Verify CORS is enabled
3. Check `/api/sync-user/` route exists
4. Look at browser network tab for error

### Issue: "Sign In/Sign Up" buttons don't work

**Cause:** Navbar still using old `openSignIn()` method

**Fix:**
- Already fixed! Navbar now uses `router.push()`

---

## 📊 Data Flow Summary

### Sign-Up Flow

```
User clicks "Sign Up"
  ↓
Navigate to /sign-up
  ↓
Clerk handles registration
  ↓
useEffect detects user
  ↓
Sync to backend (POST /api/sync-user/)
  ↓
Backend creates User + UserProfile
  ↓
Redirect based on localStorage.cove_selected_path
  ↓
User lands on /shop or /partner-onboarding
```

### Sign-In Flow

```
User clicks "Sign In"
  ↓
Navigate to /sign-in
  ↓
Clerk handles authentication
  ↓
Redirect based on localStorage.cove_selected_path
  ↓
User lands on /shop or /partner-onboarding
```

### Session Persistence

```
User closes browser
  ↓
Clerk session cookie persists (7 days)
  ↓
User reopens browser
  ↓
Clerk auto-signs in
  ↓
Backend recognizes clerk_user_id
  ↓
All data restored (cart, orders, preferences)
```

---

## 🎯 Next Steps

### Immediate (Required)
- [ ] Update `.env.local` with Clerk variables
- [ ] Configure Clerk dashboard paths
- [ ] Fix backend UserProfile model
- [ ] Add sync_user endpoint
- [ ] Test complete flow

### Future Enhancements
- [ ] Add user_type field (shopper/brand)
- [ ] Add signup_source tracking
- [ ] Sync preferences to backend
- [ ] Add user metadata
- [ ] Implement webhooks for real-time sync

---

**All frontend code is ready!** Just need to:
1. Add environment variables
2. Fix backend model
3. Add sync endpoint
4. Test!
