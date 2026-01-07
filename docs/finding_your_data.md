# 🔍 Finding Your Real Analytics Data

## The Problem
You're seeing only `test_user_1`, `test_user_2` in Django Admin - those are from my test script!
Your REAL interactions ARE being saved, but you need to find them.

## ✅ Solution: 3 Easy Steps

### Step 1: Find YOUR User ID

1. **Open your website**: http://localhost:3000
2. **Open Browser Console**: Press `F12` → Click "Console" tab
3. **Visit ANY product page**: http://localhost:3000/product/cove-classic-hoodie
4. **Look for**: `📊 Analytics Event: { user_id: "user_xxx" or "anon_xxx", ... }`
5. **Copy that user_id!**

### Step 2: Search in Django Admin

1. **Go to Django Admin**: http://localhost:8001/admin/analytics/userinteraction/
2. **Clear all filters** (click "Clear all filters" on right side)
3. **Use the search box** at top
4. **Paste your user_id** from Step 1
5. **Hit Enter**

### Step 3: See Your Data! 🎉

You should now see YOUR interactions:
- Product views
- Add to cart events
- With YOUR user_id
- With timestamps showing when YOU did them

---

## 🆘 Still Not Working?

### Check 1: Is tracking actually sending?
- Open Network tab (F12 → Network)
- Visit a product page
- Wait 5 seconds
- Look for `track-batch` request
- Status should be **201**

### Check 2: What's your user type?

**If you're logged in** (with Clerk):
- Your user_id = `user_{your-clerk-user-id}`
- Example: `user_36XaVfKiLJicxRYT9c4COuIupUZ`

**If you're NOT logged in**:
- Your user_id = `anon_{session-id}`
- Example: `anon_sess_1733686234_abc123`

### Check 3: Timing
- Events batch every **5 seconds** OR **10 events**
- So after viewing a product, wait **5 seconds**
- Then refresh Django Admin

---

## 🎯 Quick Test

1. **Delete test data** (optional):
   ```sql
   DELETE FROM analytics_userinteraction WHERE user_id LIKE 'test_%';
   ```

2. **Visit product page**:
   - http://localhost:3000/product/cove-classic-hoodie

3. **Add to cart** (select size, qty, click button)

4. **Wait 5 seconds**

5. **Check console for user_id**

6. **Search in Django Admin**

---

## 📊 Debug Command

Run this to see recent NON-TEST data:

```bash
cd backend
.venv/bin/python -c "
from analytics.models import UserInteraction
from django.utils import timezone
from datetime import timedelta

last_hour = timezone.now() - timedelta(hours=1)
recent = UserInteraction.objects.filter(
    timestamp__gte=last_hour
).exclude(
    user_id__startswith='test_'
).order_by('-timestamp')

print('Recent interactions (non-test):')
for i in recent[:10]:
    print(f'{i.user_id} | {i.product_id} | {i.interaction_type} | {i.timestamp}')
"
```

---

**The system IS working!** You just need to find YOUR user_id! 🎯
