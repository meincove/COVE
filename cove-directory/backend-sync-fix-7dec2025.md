# Backend Sync Error Fix
**Date: 7th December 2025**

## The Error You're Seeing

```
⚠️ Failed to sync AiUserProfile: Cannot resolve keyword 'clerk_id' into field. 
Choices are: clerk_user_id, created_at, disliked_colors, extra, id, preferred_colors...
```

## The Problem

Your backend code is trying to use `clerk_id` but your database field is named `clerk_user_id`.

## The Fix

You need to update your backend sync endpoint:

**File:** `backend/api/views.py` (or wherever your sync_user function is)

**Find this line:**
```python
profile, profile_created = UserProfile.objects.get_or_create(
    clerk_id=clerk_user_id,  # ❌ WRONG - field doesn't exist
    defaults={'user': user}
)
```

**Change to:**
```python
profile, profile_created = UserProfile.objects.get_or_create(
    clerk_user_id=clerk_user_id,  # ✅ CORRECT - matches your database field
    defaults={'user': user}
)
```

## How to Find the Code

1. Search your backend for `clerk_id=`
2. Replace all occurrences with `clerk_user_id=`

**Command to search:**
```bash
cd backend
grep -r "clerk_id=" .
```

## After the Fix

The sync will work and you'll see:
```
✅ User synced successfully
```

Instead of the error.

---

**Note:** This is just a field name mismatch. No security issues, no data loss. Just need to use the correct field name that matches your database schema.
