# Critical Fixes - Chat History & Page Refresh

## 🎯 Two Issues to Fix

### Issue 1: Chat History Lost on Refresh ❌
**Problem**: All chat messages disappear when page refreshes
**Root Cause**: Messages only stored in React state, never saved to DB
**Impact**: Bad UX, lost data, can't analyze user behavior

### Issue 2: Page Refreshes on Cart Add ❌
**Problem**: Entire page reloads when adding to cart
**Root Cause**: Likely checkout redirect or form submission
**Impact**: Loses chat context, bad UX

---

## ✅ Solution 1: Persistent Chat History

### Backend (Already Exists!) ✓
```
GET  /ai_profiles/history/ 
     ?clerkUserId=...&guestSessionId=...&limit=20

POST /ai_profiles/history/log/
     {
       "clerk_user_id": "...",
       "guest_session_id": "...",
       "role": "user" | "assistant",
       "content": "...",
       "kind": "recommendations" | "cart_proposal" | ...",
       "meta": {...}
     }
```

### Frontend Implementation

#### Step 1: Create History Hook
**File**: `frontend/src/hooks/useChatHistory.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
  kind?: string;
  meta?: any;
  created_at?: string;
};

export function useChatHistory(guestSessionId: string) {
  const { isSignedIn, user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<HistoryMessage[]>([]);

  // Load history on mount
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('guestSessionId', guestSessionId);
      if (isSignedIn && user) {
        params.set('clerkUserId', user.id);
      }
      params.set('limit', '50'); // Last 50 messages

      const res = await fetch(`/api/history/load?${params}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [guestSessionId, isSignedIn, user]);

  // Save message to history
  const saveMessage = useCallback(async (message: HistoryMessage) => {
    try {
      await fetch('/api/history/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_session_id: guestSessionId,
          clerk_user_id: isSignedIn && user ? user.id : undefined,
          ...message,
        }),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }, [guestSessionId, isSignedIn, user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return { history, isLoading, saveMessage, loadHistory };
}
```

#### Step 2: Create History API Routes

**File**: `frontend/src/app/api/history/load/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

const DJANGO_BASE = process.env.DJANGO_BASE_URL || 'http://127.0.0.1:8001';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  try {
    const url = `${DJANGO_BASE}/ai_profiles/history/?${searchParams}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to load history' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File**: `frontend/src/app/api/history/save/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

const DJANGO_BASE = process.env.DJANGO_BASE_URL || 'http://127.0.0.1:8001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${DJANGO_BASE}/ai_profiles/history/log/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Update Chat Widget

**File**: `frontend/src/components/cove-ai/CoveChatWidget.tsx`

Changes needed:
1. Import `useChatHistory`
2. Load history on mount
3. Save messages as they're sent
4. Merge history with current messages

```typescript
import { useChatHistory } from '@/src/hooks/useChatHistory';

export default function CoveChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const guestSessionId = useCartSessionStore(s => s.guestSessionId);
  
  // NEW: History persistence
  const { history, isLoading: historyLoading, saveMessage } = useChatHistory(
    guestSessionId || ensureGuestSessionId()
  );

  // Load history into messages on mount
  useEffect(() => {
    if (!historyLoading && history.length > 0) {
      const historyMessages: ChatMessage[] = history.map((h, i) => ({
        id: `history-${i}`,
        role: h.role,
        content: h.content,
        meta: h.meta,
      }));
      setMessages(prev => {
        // Only add if messages are empty (first load)
        if (prev.length === 0) {
          return historyMessages;
        }
        return prev;
      });
    }
  }, [history, historyLoading]);

  // Save user messages
  const handleSubmit = async (e: FormEvent) => {
    // ... existing code ...
    
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    
    // NEW: Save to history
    await saveMessage(userMsg);
    
    // ... rest of existing code ...
  };

  // Save assistant responses
  useEffect(() => {
    if (!isStreamingProgress && introText && streamedItems.length > 0) {
      const msg = {
        role: 'assistant',
        content: introText,
        kind: 'recommendations',
        meta: { items: streamedItems },
      };
      setMessages(prev => [...prev, msg]);
      
      // NEW: Save to history
      saveMessage(msg);
    }
  }, [isStreamingProgress, introText, streamedItems, saveMessage]);
}
```

---

## ✅ Solution 2: Fix Page Refresh

### Investigation Steps:

1. **Check checkout flow** - likely redirecting
2. **Check cart add** - might be form submission
3. **Check event handlers** - prevent default needed

### Likely Culprit:

When cart proposal is confirmed, it probably navigates to checkout page.

### Fix:

**Option A**: Prevent navigation, show confirmation instead
**Option B**: Open checkout in new tab
**Option C**: Use modal for checkout

**Recommended**: Option A (best UX)

```typescript
// In CoveChatWidget.tsx
async function handleConfirmCartProposal(messageId: string) {
  // ... existing add to cart logic ...
  
  // INSTEAD OF:
  // window.location.href = checkoutUrl;  ❌
  
  // DO THIS:
  setMessages(prev => [...prev, {
    id: makeId(),
    role: 'assistant',
    content: `✅ Added to cart! You can continue shopping or checkout when ready.`,
  }]);
  
  // Show cart preview (non-blocking)
  // User can checkout manually via cart icon
}
```

---

## 🧪 Testing Plan

### Test 1: History Persistence
```
1. Send message: "show me hoodies"
2. Get recommendations
3. Refresh page
4. ✅ Messages should still be there
5. Continue conversation
6. ✅ History preserved
```

### Test 2: Cross-Session
```
1. Guest user: chat about hoodies
2. Sign in with Clerk
3. ✅ History migrates to user account
4. Sign out
5. Sign back in
6. ✅ History restored
```

### Test 3: No Page Refresh
```
1. "show me hoodies"
2. "add 2nd item to cart"
3. Confirm
4. ✅ Page stays same
5. ✅ Cart updated
6. ✅ Chat continues
```

---

## 📊 Benefits

### History Persistence:
- ✅ Better UX (conversation preserved)
- ✅ User insights (analyze behavior)
- ✅ Trend detection (popular queries)
- ✅ Personalization (past context)

### No Page Refresh:
- ✅ Seamless UX
- ✅ Context preserved
- ✅ Professional feel

---

## 🚀 Implementation Order

1. Create `useChatHistory` hook
2. Create history API routes
3. Update chat widget to use hook
4. Test history save/load
5. Fix page refresh issue
6. Test end-to-end

---

**Ready to implement?** This will make the chat properly persistent and professional!
