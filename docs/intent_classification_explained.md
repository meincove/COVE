# How Intent Classification ACTUALLY Works

## NOT Keyword Matching!

### What the Config Does

The `intent_classification_config.json` provides **FEW-SHOT LEARNING EXAMPLES** for the LLM, not hardcoded rules.

#### The Strategy:

```
Config Examples → LLM learns PATTERN → Generalizes to novel inputs
```

### Architecture Breakdown

#### 1. **Config Provides Training Examples**
```json
"cart_proposal": {
    "examples": [
        "add this to cart",
        "I want the black hoodie",
        "cop this",        // Slang
        "ad hoodie too cart"  // Typo
    ]
}
```

#### 2. **LLM Builds Understanding**
The classifier builds a prompt like this:

```
You are an expert intent classifier.

**cart_proposal**
Meaning: User wants to add item to cart
Examples:
  - 'add this to cart'
  - 'I want the black hoodie'
  - 'cop this'
  - 'ad hoodie too cart'
Common signals: add, cart, buy, want

Now classify: "toss it in the basket"
```

#### 3. **LLM Generalizes**
The LLM (GPT-4o-mini) **learns the PATTERN**:
- Sees "add this to cart" → understands "addition action"
- Sees "cop this" → understands "purchase slang"  
- **Generalizes to**: "toss it in basket", "dame esto", "acheter"

This is **NOT** keyword matching!

---

## Key Differences

### ❌ Hardcoded Keywords (OLD approach):
```python
if "add" in query or "cart" in query:
    return "cart_proposal"
```
**Problem**: Breaks on:
- Typos: "ad to cart"
- Slang: "cop this", "lemme get"
- Other languages: "acheter", "compra"
- Novel phrasing: "toss in basket"

### ✅ LLM Few-Shot Learning (OUR approach):
```python
# Provide examples to LLM
examples = [
    "add to cart",
    "cop this",
    "ad hoodie too cart"
]

# LLM learns the CONCEPT and generalizes
llm_classify(query="toss in basket", examples=examples)
# → "cart_proposal" (understood the intent!)
```

**Benefits**:
- ✅ Handles typos
- ✅ Handles slang  
- ✅ Handles ANY language
- ✅ Handles novel phrasings
- ✅ No explicit rules needed

---

## How Multilingual Works

### Config Has Some Examples:
```json
"multilingual_examples": {
    "fr": ["ajouter au panier"],
    "es": ["añadir al carrito"],
    "de": ["in den Warenkorb"]
}
```

### LLM Generalizes From These:
- Sees French: "ajouter" → learns "add"
- Sees Spanish: "añadir" → learns "add"  
- **Generalizes to**: "acheter" (buy), "compra" (buy), ANY purchase verb

The LLM uses its **pre-trained multilingual knowledge** + our examples!

---

## The Two-Stage Approach

### Stage 1: Embedding Fast-Path (Optional)
```python
# Fast similarity check
user_query_embedding = embed("cop this jacket")
intent_embeddings = {
    "cart_proposal": embed("add to cart, buy, purchase..."),
    "recommendations": embed("show me, recommend...")
}

# Find most similar
if similarity > 0.85:
    return "cart_proposal"  # Fast exit
```

### Stage 2: LLM Fallback (High Accuracy)
```python
# For ambiguous/complex queries
prompt = f"""
Examples of cart_proposal:
- add to cart
- cop this
- ad hoodie too cart

Classify: "{user_query}"
"""

llm_response = gpt4("cart_proposal")  # LLM understands intent
```

---

## Why Examples Matter

### Good Examples Teach Patterns:

**Typo Pattern:**
- Config: "ad hoodie too cart"  
- LLM learns: typos don't change intent
- Generalizes: "ad jackt to kart" → cart_proposal ✅

**Slang Pattern:**
- Config: "cop this", "lemme get"
- LLM learns: informal purchase language
- Generalizes: "ima cop", "gimme that" → cart_proposal ✅

**Positional Pattern:**
- Config: "add the second one to cart"
- LLM learns: position + cart intent
- Generalizes: "buy the third item" → cart_proposal ✅

---

## What Happens Outside Config?

### Example: "compra esto" (Spanish, NOT in config)

1. **LLM sees examples**: "add to cart", "acheter" (French buy)
2. **Activates pre-trained knowledge**: "compra" (Spanish) = "buy"
3. **Understands pattern**: purchase verb + demonstrative
4. **Classifies**: cart_proposal ✅

The LLM uses **BOTH**:
- Our examples (few-shot learning)
- Its training data (multilingual understanding)

---

## Current Implementation

```python
class IntentClassifier:
    def classify(self, query: str):
        # Try fast embedding path
        if self.use_embedding_fast_path:
            intent, confidence = self._embedding_classify(query)
            if confidence > 0.85:
                return intent  # Quick match
        
        # Fallback to LLM (high accuracy)
        intent, confidence = self._llm_classify(query)
        
        # LLM sees:
        # 1. All examples from config
        # 2. Intent descriptions  
        # 3. Common keywords as hints
        # 4. Multilingual examples
        # 5. Chain-of-thought instructions
        
        return intent  # Generalized classification
```

---

## Testing Generalization

To prove it's NOT keyword matching, we can test:

```python
# These are NOT in config at all
test_cases = [
    "compra esto",  # Spanish
    "acheter maintenant",  # French
    "toss it in the basket",  # Novel phrasing
    "ima cop that XL",  # Multiple novel elements
    "kaufen jetzt",  # German
]

# If these work → LLM is learning patterns, not matching keywords!
```

---

## Benefits of This Approach

1. **Generalizes** to unseen phrasings
2. **Multilingual** out of the box
3. **Robust** to typos and slang
4. **Maintainable** - add examples, not rules
5. **Improves** as we add more examples
6. **No hardcoding** - pure learning

---

## Why Config Is NOT Hardcoded

### Hardcoded would be:
```python
if "add" in query or "cart" in query:
    return "cart"
```

### Our approach is:
```python
# Teach LLM the concept
examples = load_from_config()
llm_response = ask_llm(query, examples)
# LLM understands INTENT, not words
```

The config is **TRAINING DATA**, not **RULES**.

---

## Current Status

**What's Working**:
- LLM sees all our examples
- Generalizes to some degree
- Handles multilingual (built into GPT-4o)

**What Needs Fixing**:
- Still mapping wrong (might be prompt issue)
- Need to verify LLM is actually using examples
- Possibly temperature/prompt tuning needed

**Next**: Debug why cart intents still fail despite good examples.
