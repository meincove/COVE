# Week 4 Code Hardcoding Audit

**Date**: 2025-12-06  
**Scope**: Frontend integration, cart add flow, size collection, UI components

---

## 🔴 HIGH PRIORITY - Must Fix Before Production

### 1. **Hardcoded Price = 0 in Cart Add**
**Location**: `frontend/src/components/cove-ai/CoveChatWidget.tsx:908`

```typescript
const cartItem: CartItem = {
  // ...
  price: firstItem.price ?? 0,  // ❌ Defaults to 0 if no price!
  imageUrl: "/clothing-images/placeholder.png",  // ❌ Hardcoded placeholder
  material: "",  // ❌ Empty string
};
```

**Issue**: If `firstItem.price` is undefined, cart shows price as €0.00  
**Fix**: Either require price from backend OR fetch from catalog API  
**Risk**: Users see free items, payment mismatch

---

### 2. **Hardcoded Image Placeholder**
**Location**: Same file, line 909

```typescript
imageUrl: "/clothing-images/placeholder.png",
```

**Issue**: All cart items show placeholder image  
**Fix**: Use `firstItem.image` or fetch from catalog  
**Risk**: Poor UX, looks broken

---

### 3. **Empty Material Field**
**Location**: Same file, line 910

```typescript
material: "",
```

**Issue**: Material info lost  
**Fix**: Pass through from agent response or mark as N/A  
**Risk**: Missing product information

---

## 🟡 MEDIUM PRIORITY - Configuration Issues

### 4. **Localhost URLs in Logs**
**Location**: Multiple files in `cove-ai-core/app`

- `app/cove_ai_tools/config.py` - Uses `DJANGO_BACKEND_URL` env var ✅
- Log statements show `127.0.0.1:8001` (from actual requests) ✅ OK

**Status**: Actually properly configured via environment variables  
**No action needed** - env vars are being used correctly

---

### 5. **Hardcoded Toast Duration**
**Location**: `frontend/src/components/cove-ai/Toast.tsx:19`

```typescript
duration = 3000  // ❌ Hardcoded 3 seconds
```

**Issue**: Not configurable  
**Fix**: Make configurable via props or constant  
**Risk**: Low - reasonable default

---

### 6. **Hardcoded Size Options Text**
**Location**: `cove-ai-core/app/routes/agent.py:1041`

```python
answer=f"Great choice! What size would you like for the {product_desc}? (S, M, L, XL)"
```

**Issue**: Size options hardcoded in prompt  
**Fix**: Get available sizes from product data  
**Risk**: Medium - might show unavailable sizes

---

### 7. **Size Regex Pattern**
**Location**: `cove-ai-core/app/routes/agent.py:1003`

```python
if re.search(r'\b(?:size\s+)?([smlxSMLX]{1,3})\b', q):
```

**Issue**: Limited to S/M/L/XL pattern, no numeric sizes  
**Fix**: Support numeric sizes (28, 30, 32) if needed  
**Risk**: Low for clothing, might need for shoes

---

## 🟢 LOW PRIORITY - Polish/Improvements

### 8. **Hardcoded Request Timeout**
**Location**: `frontend/src/components/cove-ai/CoveChatWidget.tsx:682`

```typescript
const timeoutId = setTimeout(() => controller.abort(), 30000);  // 30s
```

**Status**: Reasonable default ✅  
**Recommendation**: Make configurable via env var for production tuning

---

### 9. **Hardcoded Error Messages**
**Locations**: Multiple files

```typescript
"Sorry, something went wrong talking to Cove AI. Please try again."
"Failed to add to cart. Please try again..."
```

**Status**: User-friendly, appropriate ✅  
**Recommendation**: Consider i18n in future for internationalization

---

### 10. **Magic Strings in Type Guards**
**Location**: `frontend/src/components/cove-ai/CoveChatWidget.tsx:456+`

```typescript
return meta?.kind === "cart_proposal";
return meta?.kind === "checkout_ready";
```

**Status**: Type-safe with TypeScript enums ✅  
**Recommendation**: Already using proper TypeScript types

---

## 📋 Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 HIGH | 3 | **MUST FIX** |
| 🟡 MEDIUM | 4 | Recommended |
| 🟢 LOW | 3 | Optional |

---

## ✅ What's Actually Good

1. **Environment Variables**: All URLs properly use `process.env.*` ✅
2. **Type Safety**: TypeScript types properly defined ✅
3. **Error Handling**: Proper try-catch with user-friendly messages ✅
4. **No API Keys Hardcoded**: All in env vars ✅

---

## 🎯 Action Items

**Before Production**:
1. ✅ Wire real prices: Use `firstItem.price` from backend
2. ✅ Wire real images: Use `firstItem.image` or fetch from catalog
3. ✅ Wire material: Pass through from product data
4. ⚠️ Fetch available sizes per product (not just assume S/M/L/XL)

**Nice to Have**:
5. Make toast duration configurable
6. Support numeric sizes in regex
7. Make timeout configurable via env

---

## 🔍 Verification Commands

```bash
# Check for hardcoded prices
grep -r "price.*0" frontend/src/components/cove-ai/

# Check for placeholder images  
grep -r "placeholder" frontend/src/components/

# Check for localhost URLs (should all be env vars)
grep -r "127.0.0.1" cove-ai-core/app/cove_ai_tools/
```
