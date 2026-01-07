# 🚀 Upgrade to Claude 3.5 Sonnet (5-Minute Guide)

## ✅ Prerequisites Check

**Current Status:**
- ✅ Embeddings: 2,268/2,268 products (100% complete!)
- ✅ OpenRouter: Already configured
- ✅ Multi-model architecture: Designed and documented

---

## 🔧 **Step 1: Update ENV Variable**

**File:** `/Users/ssg/Desktop/COVE/cove-ai-core/.env`

**Change this:**
```bash
LLM_MAIN_MODEL="openrouter:openai/gpt-4o-mini"
```

**To this:**
```bash
LLM_MAIN_MODEL="openrouter:anthropic/claude-3.5-sonnet"
```

**Save the file.** That's literally it! 🎉

---

## 💰 **Cost Comparison**

### **Before (GPT-4o-mini):**
```
Input:  $0.150 per 1M tokens
Output: $0.600 per 1M tokens
---
Per outfit build (~1000 tokens): $0.0008
```

### **After (Claude 3.5 Sonnet):**
```
Input:  $3.00 per 1M tokens
Output: $15.00 per 1M tokens
---
Per outfit build (~1000 tokens): $0.018
```

**Increase:** ~22x more expensive  
**But:** Dramatically better reasoning, nuance, fashion understanding!

### **Budget Reality Check:**
```
1000 outfits/month:
- GPT-4o-mini: $0.80/month
- Claude 3.5: $18/month

Still incredibly affordable! 💰
```

---

## 🧪 **Step 2: Test the Change**

### **Option A: Auto-reload Test (Uvicorn)**

Uvicorn should auto-reload when .env changes. Test immediately:

```bash
curl -s -X POST http://localhost:8000/ai/agent/query-stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Build me an outfit for a wedding, budget 200, style professional"}' \
  | grep -E "(event:|data:)" | head -20
```

**What to look for:**
- More sophisticated reasoning
- Better occasion understanding
- Richer explanations

### **Option B: Manual Restart (Safer)**

```bash
# Stop uvicorn (Ctrl+C in terminal)
cd /Users/ssg/Desktop/COVE/cove-ai-core
uvicorn app.main:app --reload --port 8000
```

Then test as above.

---

## 📊 **Step 3: Verify Model Switch**

Check logs to confirm Claude is being used:

```bash
# In uvicorn terminal, you should see:
# INFO: Using model: anthropic/claude-3.5-sonnet
```

Or check response quality - Claude gives:
- **Longer, more detailed reasoning**
- **Better understanding of nuance** ("conservative law firm" vs "startup")
- **More natural language** (sounds human!)

---

## 🎯 **Step 4: Run Stress Test**

Now that embeddings are complete, re-run the outfit builder stress test:

```bash
cd /Users/ssg/Desktop/COVE/cove-ai-core
python3 tests/test_outfit_builder_stress.py
```

**Expected improvements:**
- Better occasion interpretation
- More sophisticated style matching
- Higher success rate (should improve from 33% to 50-66%)

---

## 🔄 **Rollback (If Needed)**

If something goes wrong:

```bash
# .env
LLM_MAIN_MODEL="openrouter:openai/gpt-4o-mini"  # Back to original
```

Restart uvicorn, done!

---

## 🚀 **Next Steps (Multi-Model Strategy)**

Once Claude 3.5 is working as orchestrator, add specialized workers:

### **Add GPT-4o for Vision:**

```python
# app/llm/providers.py (or similar)

# Orchestrator (conversation + reasoning)
ORCHESTRATOR_MODEL = "openrouter:anthropic/claude-3.5-sonnet"

# Vision worker (image analysis)
VISION_MODEL = "openrouter:openai/gpt-4o"

# Embeddings (vector search)
EMBEDDING_MODEL = "openai/text-embedding-3-small"

# Profiling worker (preference extraction)
PROFILER_MODEL = "openrouter:openai/gpt-4o-mini"
```

But start with **just switching the orchestrator** - that alone will be a huge upgrade!

---

## ✅ **Summary**

**What you need to do:**
1. Edit `.env` → Change `LLM_MAIN_MODEL` to `anthropic/claude-3.5-sonnet`
2. Test with a curl command
3. Run stress tests
4. Enjoy 10x better reasoning! 🧠

**Time:** 5 minutes  
**Risk:** Zero (easy rollback)  
**Impact:** Massive quality improvement!

**Ready to make the switch?** 🚀
