# Separate Chat Sessions - Implementation Plan

## Concept

**Current**: Single chat session for all queries
```
User: "show me hoodies"
Bot: [6 hoodies]
User: "build me an outfit"
Bot: [outfit builder starts]
User: "show me tees"  ← Confusing! Are we still building outfit?
```

**Proposed**: Separate chat sessions by intent
```
Main Chat:
  User: "show me hoodies"
  Bot: [6 hoodies]
  User: "show me tees"
  Bot: [6 tees]

Outfit Builder Chat (separate window):
  User: "build me an outfit"
  Bot: "What's the occasion?"
  User: "date night"
  Bot: [builds outfit]
```

---

## Architecture

### Session Namespacing

Use **session prefixes** to separate conversations under same user:

```python
# Current
session_id = "guest_abc123"  # or clerk_user_xyz

# Proposed
main_session = "guest_abc123:main"
outfit_session = "guest_abc123:outfit_builder"
cart_session = "guest_abc123:cart"  # Future: separate cart chat
```

### Benefits
- ✅ Same user ID (guest or clerk)
- ✅ Separate conversation histories
- ✅ Separate context/state
- ✅ Easy to implement
- ✅ No database schema changes

---

## Implementation

### Backend Changes

#### 1. Add Session Type to Request

**File**: `/Users/ssg/Desktop/COVE/cove-ai-core/app/routes/agent.py`

```python
# Current
class AgentIn(BaseModel):
    message: str
    guestSessionId: Optional[str] = None
    clerkUserId: Optional[str] = None

# New
class AgentIn(BaseModel):
    message: str
    guestSessionId: Optional[str] = None
    clerkUserId: Optional[str] = None
    sessionType: Optional[str] = "main"  # "main", "outfit_builder", "cart"
```

#### 2. Create Namespaced Session ID

```python
def get_namespaced_session_id(
    guest_id: Optional[str],
    clerk_id: Optional[str],
    session_type: str = "main"
) -> str:
    """
    Create namespaced session ID.
    
    Examples:
        - guest_abc123:main
        - guest_abc123:outfit_builder
        - clerk_user_xyz:main
        - clerk_user_xyz:outfit_builder
    """
    base_id = clerk_id or guest_id or "anonymous"
    return f"{base_id}:{session_type}"
```

#### 3. Auto-Route to Outfit Builder Session

```python
# In agent.py - after intent classification
if intent == "outfit_builder":
    # Force session type to outfit_builder
    session_type = "outfit_builder"
    session_key = get_namespaced_session_id(
        body.guestSessionId,
        body.clerkUserId,
        session_type
    )
    
    # Execute in outfit builder session
    result = await orchestrator.execute_workflow(
        workflow_name="outfit_builder",
        query=q,
        context={
            "session_id": session_key,  # Separate session!
            ...
        }
    )
```

#### 4. Update Conversation Handler

```python
# Use namespaced session for conversation flow
session_key = get_namespaced_session_id(
    body.guestSessionId,
    body.clerkUserId,
    body.sessionType  # From request
)

# Check if conversation exists
conversation = conversation_handler.get_conversation(session_key)
```

---

### Frontend Changes

#### 1. Add Session Type to Chat Component

**File**: `/Users/ssg/Desktop/COVE/frontend/components/Chat.tsx` (or similar)

```typescript
interface ChatProps {
  sessionType?: 'main' | 'outfit_builder' | 'cart';
  guestSessionId?: string;
  clerkUserId?: string;
}

function Chat({ sessionType = 'main', ...props }: ChatProps) {
  // Send sessionType with each message
  const sendMessage = async (message: string) => {
    await fetch('/ai/agent/query', {
      method: 'POST',
      body: JSON.stringify({
        message,
        guestSessionId: props.guestSessionId,
        clerkUserId: props.clerkUserId,
        sessionType  // Include session type
      })
    });
  };
}
```

#### 2. Create Separate Outfit Builder Chat

**Option A**: Modal/Drawer
```typescript
// Trigger outfit builder
<Button onClick={() => setShowOutfitBuilder(true)}>
  Build an Outfit
</Button>

// Separate chat modal
<Modal open={showOutfitBuilder}>
  <Chat 
    sessionType="outfit_builder"
    guestSessionId={guestSessionId}
    clerkUserId={clerkUserId}
  />
</Modal>
```

**Option B**: Split Screen
```typescript
<div className="flex">
  {/* Main chat */}
  <Chat sessionType="main" />
  
  {/* Outfit builder chat */}
  {showOutfitBuilder && (
    <Chat sessionType="outfit_builder" />
  )}
</div>
```

**Option C**: Tabs
```typescript
<Tabs>
  <Tab label="Browse">
    <Chat sessionType="main" />
  </Tab>
  <Tab label="Outfit Builder">
    <Chat sessionType="outfit_builder" />
  </Tab>
</Tabs>
```

---

## UX Flow

### Scenario 1: User Triggers Outfit Builder

```
1. User in main chat: "build me an outfit"
2. Backend detects outfit_builder intent
3. Backend responds with special flag: "switch_to_outfit_builder": true
4. Frontend opens outfit builder chat window
5. Outfit builder chat starts with: "What's the occasion?"
```

### Scenario 2: User Manually Opens Outfit Builder

```
1. User clicks "Build an Outfit" button
2. Frontend opens outfit builder chat (sessionType="outfit_builder")
3. Backend starts outfit builder conversation
4. User interacts in separate window
```

### Scenario 3: User Switches Between Chats

```
Main Chat:
  - "show me hoodies" → [6 hoodies]
  - "show me tees" → [6 tees]

Outfit Builder Chat (separate):
  - "build outfit for date" → [building...]
  - "make it more casual" → [adjusting...]
  
Main Chat (back to browsing):
  - "show me bombers" → [6 bombers]
```

---

## Database/Storage

### Conversation History

Each session type has its own history:

```python
# Redis/DB storage
conversations = {
    "guest_abc123:main": {
        "messages": [
            {"role": "user", "content": "show me hoodies"},
            {"role": "assistant", "content": "Here are 6 hoodies..."}
        ]
    },
    "guest_abc123:outfit_builder": {
        "messages": [
            {"role": "user", "content": "build me an outfit"},
            {"role": "assistant", "content": "What's the occasion?"},
            {"role": "user", "content": "date night"},
            {"role": "assistant", "content": "Here's your outfit..."}
        ]
    }
}
```

### Fact Storage

Facts can be shared across sessions (same user):

```python
# Store facts with user ID (not session ID)
user_id = clerk_id or guest_id

# Facts are accessible to all sessions
facts = get_user_facts(user_id)

# But each session has its own conversation context
context = get_session_context(f"{user_id}:{session_type}")
```

---

## Implementation Phases

### Phase 1: Backend Support (1-2 hours)
- [x] Add `sessionType` to AgentIn model
- [x] Create `get_namespaced_session_id()` function
- [x] Update conversation handler to use namespaced sessions
- [x] Update outfit builder to use separate session
- [x] Test with Postman/curl

### Phase 2: Frontend Integration (2-3 hours)
- [ ] Add sessionType prop to Chat component
- [ ] Create outfit builder trigger (button/intent detection)
- [ ] Implement separate chat window (modal/drawer/tabs)
- [ ] Handle session switching
- [ ] Test UX flow

### Phase 3: Polish (1-2 hours)
- [ ] Add visual indicators (badges, icons)
- [ ] Persist session state (localStorage)
- [ ] Add "close outfit builder" functionality
- [ ] Handle edge cases (switching mid-conversation)

---

## API Changes

### Request
```json
{
  "message": "build me an outfit",
  "guestSessionId": "guest_abc123",
  "sessionType": "outfit_builder"  // NEW
}
```

### Response (when switching sessions)
```json
{
  "kind": "answer",
  "answer": "What's the occasion?",
  "sessionType": "outfit_builder",  // NEW
  "switchSession": true  // NEW - tells frontend to open new chat
}
```

---

## Benefits

### For Users
- ✅ **Clearer context** - Know which conversation is which
- ✅ **Parallel tasks** - Browse while building outfit
- ✅ **Better focus** - Outfit builder has dedicated space
- ✅ **Less confusion** - No mixing of intents

### For Development
- ✅ **Easier debugging** - Separate logs per session
- ✅ **Better analytics** - Track outfit builder usage
- ✅ **Simpler state** - Each session has clean context
- ✅ **Future-proof** - Easy to add more session types (cart, wishlist, etc.)

---

## Future Enhancements

### Multiple Session Types
```typescript
sessionTypes = {
  main: "Browse products",
  outfit_builder: "Build outfits",
  cart: "Manage cart",
  wishlist: "Save favorites",
  size_help: "Get size recommendations"
}
```

### Session Persistence
- Save session state to localStorage
- Resume conversations after page refresh
- Sync across devices (if logged in)

### Session Management UI
```
[Main Chat]  [Outfit Builder]  [Cart (2 items)]
     ↑             ↑                  ↑
  Active      Minimized          Notification
```

---

## Testing

### Backend Tests
```bash
# Test namespaced sessions
curl -X POST http://localhost:8000/ai/agent/query \
  -d '{"message": "show me hoodies", "guestSessionId": "test", "sessionType": "main"}'

curl -X POST http://localhost:8000/ai/agent/query \
  -d '{"message": "build outfit", "guestSessionId": "test", "sessionType": "outfit_builder"}'

# Verify separate conversation histories
curl http://localhost:8001/ai_profiles/session/facts/get/?guest_session_id=test:main
curl http://localhost:8001/ai_profiles/session/facts/get/?guest_session_id=test:outfit_builder
```

### Frontend Tests
- Open main chat, send messages
- Trigger outfit builder, verify new window
- Switch between sessions, verify context preserved
- Close outfit builder, verify main chat unaffected

---

## Recommendation

**Start with Phase 1** (backend support) - it's quick and enables the feature.

Then decide on frontend UX:
- **Modal/Drawer** - Best for focused outfit building
- **Split Screen** - Best for power users
- **Tabs** - Best for mobile

I recommend **Modal/Drawer** for v1 - it's clean, focused, and familiar UX.
