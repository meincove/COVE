# Week 2 Implementation Plan: User Preference Learning

**Deliverable:** Personalized outfit recommendations based on user behavior and preferences  
**Timeline:** 5-7 days  
**Priority:** HIGH - Foundation for all personalization features

---

## 🎯 Goal

Build a RAG-based user preference system that:
1. Remembers what users like/dislike
2. Learns from user behavior automatically
3. Personalizes outfit recommendations
4. Persists across sessions

**Example:**
```
User: "I don't like hoodies"
[System stores in vector memory]

Later...
User: "Build outfit for casual hangout"
[System recalls preference, avoids hoodies]
Result: Tee + jeans (no hoodies!)
```

---

## 📋 Architecture

```
┌─────────────────────────────────────────────┐
│         User Preference System               │
├─────────────────────────────────────────────┤
│                                             │
│  1. UserProfile (structured data)           │
│     - user_id, style_preference, sizes      │
│     - color_preferences, dislikes           │
│                                             │
│  2. UserMemory (vector-based)               │
│     - Stores statements as embeddings       │
│     - "I hate patterns" → vector            │
│     - Semantic search for recall            │
│                                             │
│  3. PreferenceExtractor (LLM worker)        │
│     - GPT-4o-mini extracts preferences      │
│     - Converts text → structured data       │
│                                             │
│  4. StylistAgent Integration                │
│     - Queries UserProfile before search     │
│     - Filters results based on preferences  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### **Step 1: Database Schema (Day 1)**

#### **New Table: `user_profiles`**
```sql
-- Backend: catalog/models.py
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    style_preference VARCHAR(50),  -- minimalist, streetwear, professional
    color_preferences JSONB,       -- ["navy", "grey", "black"]
    dislikes JSONB,                -- ["hoodies", "patterns"]
    fit_preferences JSONB,         -- ["slim", "regular"]
    size_history JSONB,            -- Track sizes by brand
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

#### **New Table: `user_memories` (Vector Store)**
```sql
-- ai_core schema (pgvector)
CREATE TABLE ai_core.user_memories (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,           -- "I don't like hoodies"
    embedding vector(1536),          -- OpenAI embedding
    memory_type VARCHAR(50),         -- preference, size, style
    confidence FLOAT,                -- 0-1 how confident
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_memories_user_id ON ai_core.user_memories(user_id);
CREATE INDEX idx_user_memories_embedding ON ai_core.user_memories 
    USING ivfflat (embedding vector_cosine_ops);
```

---

### **Step 2: UserProfile Service (Day 2)**

**File:** `backend/catalog/services/user_profile_service.py`

```python
from typing import Dict, List, Optional
from catalog.models import UserProfile
import json

class UserProfileService:
    """Manage user preferences and style profiles"""
    
    @staticmethod
    def get_or_create(user_id: str) -> UserProfile:
        """Get user profile or create default"""
        profile, created = UserProfile.objects.get_or_create(
            user_id=user_id,
            defaults={
                'style_preference': 'casual',
                'color_preferences': [],
                'dislikes': [],
                'fit_preferences': [],
                'size_history': {}
            }
        )
        return profile
    
    @staticmethod
    def update_preferences(user_id: str, preferences: Dict):
        """Update user preferences from extracted data"""
        profile = UserProfileService.get_or_create(user_id)
        
        # Merge color preferences (don't override, append unique)
        if 'colors' in preferences:
            current = set(profile.color_preferences or [])
            current.update(preferences['colors'])
            profile.color_preferences = list(current)
        
        # Merge dislikes
        if 'dislikes' in preferences:
            current = set(profile.dislikes or [])
            current.update(preferences['dislikes'])
            profile.dislikes = list(current)
        
        # Update style if specified
        if 'style' in preferences:
            profile.style_preference = preferences['style']
        
        profile.save()
        return profile
    
    @staticmethod
    def get_preferences(user_id: str) -> Dict:
        """Get user preferences as dict"""
        profile = UserProfileService.get_or_create(user_id)
        return {
            'style_preference': profile.style_preference,
            'color_preferences': profile.color_preferences or [],
            'dislikes': profile.dislikes or [],
            'fit_preferences': profile.fit_preferences or [],
            'size_history': profile.size_history or {}
        }
```

---

### **Step 3: UserMemory Service (RAG) (Day 3)**

**File:** `cove-ai-core/app/core/user_memory.py`

```python
from typing import List, Dict
import asyncpg
from openai import AsyncOpenAI
import os

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

class UserMemoryService:
    """RAG-based user memory using pgvector"""
    
    def __init__(self, db_url: str):
        self.db_url = db_url
    
    async def store_memory(self, user_id: str, content: str, memory_type: str = "preference"):
        """Store user statement as vector"""
        # Generate embedding
        response = await client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=[content]
        )
        embedding = response.data[0].embedding
        
        # Store in database
        conn = await asyncpg.connect(self.db_url)
        try:
            await conn.execute("""
                INSERT INTO ai_core.user_memories (user_id, content, embedding, memory_type)
                VALUES ($1, $2, $3, $4)
            """, user_id, content, embedding, memory_type)
        finally:
            await conn.close()
    
    async def recall(self, user_id: str, query: str, top_k: int = 5) -> List[Dict]:
        """Recall relevant memories using semantic search"""
        # Generate query embedding
        response = await client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=[query]
        )
        query_embedding = response.data[0].embedding
        
        # Search user memories
        conn = await asyncpg.connect(self.db_url)
        try:
            results = await conn.fetch("""
                SELECT content, memory_type, 
                       1 - (embedding <=> $1::vector) as similarity
                FROM ai_core.user_memories
                WHERE user_id = $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
            """, query_embedding, user_id, top_k)
            
            return [
                {
                    'content': r['content'],
                    'type': r['memory_type'],
                    'similarity': r['similarity']
                }
                for r in results
                if r['similarity'] > 0.7  # Only high-confidence memories
            ]
        finally:
            await conn.close()
```

---

### **Step 4: Preference Extractor (LLM Worker) (Day 4)**

**File:** `cove-ai-core/app/workers/preference_extractor.py`

```python
from typing import Dict
import litellm
import json

class PreferenceExtractor:
    """Extract user preferences from natural language"""
    
    async def extract(self, text: str) -> Dict:
        """Parse user statement for preferences"""
        
        response = await litellm.acompletion(
            model="openrouter/openai/gpt-4o-mini",
            messages=[{
                "role": "system",
                "content": """Extract fashion preferences from user statements.
                
                Return JSON with:
                {
                    "colors": ["navy", "black"],  // Liked colors
                    "dislikes": ["hoodies", "patterns"],  // Disliked items/styles
                    "style": "minimalist",  // Overall style (if mentioned)
                    "fits": ["slim"]  // Fit preferences
                }
                
                Only include fields if explicitly mentioned."""
            }, {
                "role": "user",
                "content": text
            }],
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except:
            return {}
```

---

### **Step 5: Integrate with Stylist Agent (Day 5)**

**File:** `cove-ai-core/app/agents/stylist_agent.py`

```python
# Add to StylistAgent class

async def _execute(self, inputs: dict) -> dict:
    """Enhanced with user preferences"""
    
    # Get user profile
    user_id = inputs.get("user_id", "anonymous")
    user_prefs = await self._get_user_preferences(user_id)
    
    # Recall relevant memories
    memories = await self.memory_service.recall(
        user_id=user_id,
        query=f"{occasion} outfit {style}",
        top_k=3
    )
    
    # Extract dislikes from memories
    dislikes = user_prefs.get('dislikes', [])
    for memory in memories:
        if 'hate' in memory['content'] or 'dislike' in memory['content']:
            # "I hate hoodies" → extract "hoodies"
            extracted = await self.preference_extractor.extract(memory['content'])
            dislikes.extend(extracted.get('dislikes', []))
    
    # Build outfit with preferences
    for category in categories:
        # Enhanced search query with preferences
        search_query = self._build_search_query(
            category=category,
            occasion=occasion,
            style=user_prefs.get('style_preference', style),
            color_prefs=user_prefs.get('color_preferences', []),
            exclude=dislikes
        )
        
        items = await self._call_recs_suggest({
            "query": search_query,
            "top_k": 20,
            "exclude_types": dislikes  # Filter out disliked types
        })
        
        # ... rest of logic
```

---

### **Step 6: API Endpoints (Day 6)**

**File:** `backend/catalog/api_urls.py`

```python
# Add new endpoints

from catalog.views import user_profile_views

urlpatterns = [
    # ... existing ...
    path('user/profile/', user_profile_views.get_profile),
    path('user/profile/update/', user_profile_views.update_profile),
    path('user/preferences/learn/', user_profile_views.learn_from_message),
]
```

**File:** `backend/catalog/views/user_profile_views.py`

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from catalog.services.user_profile_service import UserProfileService

@api_view(['GET'])
def get_profile(request):
    """Get user profile"""
    user_id = request.GET.get('user_id', 'anonymous')
    profile = UserProfileService.get_preferences(user_id)
    return Response(profile)

@api_view(['POST'])
async def learn_from_message(request):
    """Learn preferences from user message"""
    user_id = request.data.get('user_id')
    message = request.data.get('message')
    
    # Extract preferences
    from app.workers.preference_extractor import PreferenceExtractor
    extractor = PreferenceExtractor()
    preferences = await extractor.extract(message)
    
    # Update profile
    if preferences:
        UserProfileService.update_preferences(user_id, preferences)
    
    # Store in vector memory
    from app.core.user_memory import UserMemoryService
    memory = UserMemoryService(os.getenv('DATABASE_URL'))
    await memory.store_memory(user_id, message, 'preference')
    
    return Response({'learned': preferences})
```

---

## 🧪 Testing Strategy (Day 7)

### **Test Scenarios:**

1. **User says "I hate hoodies"**
   - Verify preference extracted
   - Verify stored in user_profiles.dislikes
   - Verify stored as vector in user_memories
   - Build outfit → should NOT include hoodies

2. **User says "I love navy"**
   - Verify color preference extracted
   - Build outfit → should prioritize navy items

3. **Cross-session persistence**
   - User sets preference in session 1
   - User returns in session 2
   - Verify preferences still applied

4. **Memory recall accuracy**
   - Store 10 different preferences
   - Query with related text
   - Verify top-k returns relevant memories

---

## 📊 Success Criteria

- [ ] User preferences persist across sessions
- [ ] Disliked items never appear in recommendations
- [ ] Preferred colors prioritized in search results
- [ ] Memory recall accuracy >80% on test set
- [ ] Response time <500ms with memory lookup
- [ ] Zero duplicate preferences stored

---

##User Review Required

> [!IMPORTANT]
> **Database Migration Required**
> This plan requires adding two new tables (`user_profiles`, `user_memories`). 
> 
> **Breaking Changes:** None - pure addition  
> **Risk:** Low - isolated new feature
> 
> **Before proceeding:**
> 1. Review schema designs
> 2. Confirm vector extension enabled in Neon
> 3. Approve API endpoint additions

---

## 🚀 Next

Once user preference learning is working:
- **Week 3:** Add visual intelligence (GPT-4o outfit matching)
- **Week 4:** Advanced reasoning with Claude
- **Week 5:** Context awareness (weather, trends)
- **Week 6:** Proactive engagement

**Let's build legendary personalization!** 💎
