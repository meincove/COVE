# Cart Architecture Audit

**Date**: 2025-12-06  
**Scope**: Frontend + Backend cart integration analysis  
**Issue**: Two parallel cart systems with incomplete synchronization

---

## 🔴 CRITICAL FINDING: Two Cart Systems

There are **TWO separate cart implementations** that are NOT fully synchronized:

### 1. **Frontend Cart** (Navbar Display)
**Location**: `/frontend/src/store/cartStore.ts`  
**Technology**: Zustand + SessionStorage  
**Purpose**: UI state management, navbar cart display  

**How it works**:
- **Guest users**: Cart stored in browser `sessionStorage`
- **Logged-in users**: Cart synced to backend via `/api/cart/sync`
- **Display**: Navbar cart button shows `items.length`

### 2. **Backend Cart** (Checkout/Database)
**Location**: `/backend/catalog/models.py` (Cart + CartItem models)  
**Technology**: Django ORM (PostgreSQL)  
**Purpose**: Persistent storage, checkout processing  

**Schema**:
```python
class Cart(models.Model):
    cart_id (PK)
    clerk_user_id (indexed)
    guest_session_id (indexed)
    
class CartItem(models.Model):
    cart (FK)
    variant (FK to ColorGroup)
    size
    quantity
```

---

## 🔍 Current AI Chat Flow

When user confirms cart proposal in chat:

### Step 1: Backend API Call ✅
```typescript
// Line 867: CoveChatWidget.tsx
const cartAddRes = await fetch("/api/agent-dev/cart-add", {
  method: "POST",
  body: JSON.stringify({
    variantId, size, quantity,
    clerkUserId, guestSessionId, email
  })
});
```

This hits `/tools/cart.add` which:
1. Calls `_get_or_create_cart()` → Creates/fetches `Cart` record
2. Creates `CartItem` in database ✅
3. Returns cart data

### Step 2: Frontend Zustand Update ✅
```typescript
// Line 895: CoveChatWidget.tsx
await addItem(cartItem);
```

This updates Zustand store:
1. Adds item to `items` array
2. If logged in → syncs to `/api/cart/sync`
3. Updates navbar cart count

---

## ⚠️ THE DISCONNECT

### Problem 1: `/api/cart/sync` vs `/tools/cart.add`

**Two different endpoints**:
- `/api/cart/sync` - Used by cartStore for general cart operations
- `/tools/cart.add` - Used by AI chat

**They may use different schemas or database tables!**

Let me check:
