# Product Embedding Architecture - Cloud-Based Design

**Date**: December 8, 2025  
**Status**: Initial setup complete, production architecture documented

---

## Current Situation (Initial Setup)

### What We Did
✅ Embedded 88 real products from `productVariantsFlat.json`  
✅ Stored embeddings in Neon DB (`ai_products` table)  
✅ System now has complete catalog with vectors

### Product Breakdown
- **Hoodies**: 26 variants
- **Tees**: 27 variants  
- **Bombers**: 19 variants
- **Jackets**: 16 variants
- **Total**: 88 products across 4 tiers (originals, casual, limited, designer)

---

## ⚠️ Proper Production Architecture

**You're absolutely right** - everything should be in the cloud (Neon DB), not relying on local files!

### Correct Cloud-Based Flow

```
┌──────────────────────────────────────────────────────────┐
│                    NEON DATABASE (Cloud)                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────┐      ┌────────────────────────┐ │
│  │  products table     │      │  ai_products table     │ │
│  │  (Django source)    │      │  (with embeddings)     │ │
│  ├─────────────────────┤      ├────────────────────────┤ │
│  │ id, name            │      │ id, title              │ │
│  │ type, tier          │──┐   │ type, tier             │ │
│  │ price, description  │  │   │ embedding(vector)      │ │
│  │ slug, in_stock      │  │   │ price, slug            │ │
│  └─────────────────────┘  │   └────────────────────────┘ │
│                           │                              │
└───────────────────────────┼──────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Sync Service  │
                    │ (to be built) │
                    └───────────────┘
                            │
                            ├─ Fetch new/updated products
                            ├─ Generate embeddings (OpenRouter)
                            └─ Store in ai_products table
```

### Production Flow (How It Should Work)

1. **Product Management**
   - Products managed in Django admin
   - Stored in Neon `products` table (via Django ORM)

2. **Embedding Sync Service** (TODO)
   ```python
   async def sync_product_embeddings():
       # Fetch products from Neon products table
       products = await fetch_products_from_neon()
       
       for product in products:
           # Check if embedding exists
           existing = await get_embedding(product.id)
           
           # Generate if missing or product updated
           if not existing or product.updated_at > existing.updated_at:
               embedding = await generate_embedding(product)
               await store_embedding(product.id, embedding)
   ```

3. **Automated Updates**
   - Webhook on product create/update
   - Trigger embedding generation
   - Store in `ai_products` table

4. **Recommendation System**
   - Reads ONLY from `ai_products` table in Neon
   - No local file dependencies
   - Cloud-native architecture

---

## Why Local JSON Was Used (Temporary)

### Initial Setup Only
- **One-time bootstrap**: Populate Neon with existing catalog
- **Fast development**: Don't need webhook infrastructure yet
- **Data migration**: Move from local files → cloud database

### Not for Production
- ❌ **Local files stale**: Products change but JSON doesn't update
- ❌ **Manual process**: Need to re-run script for new products
- ❌ **Not scalable**: Can't handle real-time product updates

---

## Recommended Production Implementation

### Phase 1: Immediate (Current)
✅ **Status**: DONE
- Use `embed_all_products.py` for initial population
- All 88 products now in Neon with embeddings

### Phase 2: Automated Sync (Next)
**Build cloud-based sync service**:

```python
# scripts/sync_embeddings_from_neon.py

async def sync_embeddings():
    """
    Fetch products from Neon products table,
    generate embeddings for new/updated products.
    """
    
    # Connect to Neon
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Fetch products from main products table
    products = await conn.fetch("""
        SELECT id, name, description, type, tier, price, slug, updated_at
        FROM products
        WHERE in_stock = true
    """)
    
    for product in products:
        # Check if embedding exists and is current
        ai_product = await conn.fetchrow("""
            SELECT updated_at FROM ai_products WHERE id = $1
        """, product['id'])
        
        if not ai_product or product['updated_at'] > ai_product['updated_at']:
            # Generate new embedding
            text = f"{product['name']} {product['description']} {product['type']} {product['tier']}"
            embedding = await generate_embedding(text)
            
            # Upsert to ai_products
            await conn.execute("""
                INSERT INTO ai_products (...)
                VALUES (...)
                ON CONFLICT (id) DO UPDATE SET ...
            """)
    
    await conn.close()
```

### Phase 3: Real-Time Updates (Future)
**Webhook-based updates**:

1. Django signal on product save
2. Trigger embedding generation API
3. Update `ai_products` table in real-time

```python
# Django signal
@receiver(post_save, sender=Product)
def update_embedding(sender, instance, **kwargs):
    # Trigger async embedding update
    trigger_embedding_sync.delay(instance.id)
```

---

## File Structure (Production)

### Data Sources
```
Cloud (Neon DB)
├── products table          # Source of truth
└── ai_products table       # Embeddings + metadata

Local Files (deprecated in production)
└── productVariantsFlat.json  # Only for initial setup
```

### Sync Scripts
```
scripts/
├── embed_all_products.py      # Initial setup (used once)
├── sync_embeddings_from_neon.py  # Ongoing sync (TODO)
└── sync_on_product_update.py     # Real-time (TODO)
```

---

## Benefits of Cloud Architecture

### ✅ Scalability
- No local file size limits
- Handles millions of products
- Distributed database queries

### ✅ Real-Time
- Products update immediately
- Embeddings stay current
- No manual intervention

### ✅ Reliability
- Single source of truth (Neon)
- No sync issues between files and DB
- Cloud backup and redundancy

### ✅ Maintainability
- One database to manage
- Automated workflows
- No JSON file updates

---

## Migration Path

### Current State
```
Local JSON → Generate embeddings → Neon ai_products
```

### Target State
```
Neon products → Generate embeddings → Neon ai_products
       ▲                                      │
       └────────── Query for recommendations ──┘
```

### Steps to Migrate
1. ✅ **Done**: Initial embedding of 88 products
2. **TODO**: Build `sync_embeddings_from_neon.py`
3. **TODO**: Set up automated sync (cron or webhook)
4. **TODO**: Deprecate `productVariantsFlat.json` dependency

---

## Current Status

### ✅ What Works Now
- 88 products embedded in Neon
- Complete catalog coverage
- Hybrid search functional
- Personalization ready

### 🔄 What Needs Improvement
- Fetch products from Neon instead of JSON
- Automated sync on product updates
- Real-time embedding generation

### 📋 Next Steps
1. Build Neon → Neon sync script
2. Test with product updates
3. Deploy automated sync service
4. Remove local JSON dependency

---

## Conclusion

**You're absolutely correct** - the proper architecture is **cloud-based** with everything in Neon DB.

The local JSON file was used for **initial setup only**. The production system should:
- ✅ Store products in Neon
- ✅ Fetch products from Neon
- ✅ Generate embeddings in cloud
- ✅ Store embeddings in Neon
- ✅ Serve recommendations from Neon

**No local file dependencies in production!**
