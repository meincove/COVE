# Multi-Brand Product Catalog Generation Plan

**Date**: December 9, 2024  
**Objective**: Generate realistic multi-brand fashion catalog for testing AI features  
**Current State**: 273 variants, 1 brand (COVE)  
**Target State**: 2000+ variants, 15+ brands, 8+ categories

---

## 🔍 Current Data Analysis

### What You Have Now
```
File: backend/data/productVariantsFlat.json
Size: 7899 lines (~198KB)
Products: ~273 variants
Brands: 1 (COVE)
Categories: 3 (hoodies, tees, jackets)
```

### Why This is Insufficient

**For Collaborative Filtering**:
- Need 50+ users × 20+ interactions = **1000+ interaction pairs**
- With 273 products → CF similarity matrix is sparse
- Can't properly test "users who bought X also bought Y"

**For Recommendations**:
- Limited cross-category recommendations
- No brand preference learning
- No price range diversity

**For Search**:
- Limited query diversity
- No multi-brand comparisons
- Can't test brand filtering

**For A/B Testing**:
- Need statistical significance → **500+ products minimum**

---

## 🎯 Solution: 3-Tier Hybrid Approach

### Tier 1: Faker + Templates (Fast, Structural)
### Tier 2: AI Generation (Realistic, Descriptive)  
### Tier 3: Real Dataset Images (Professional)

---

## 📊 Target Product Catalog Structure

### **Total**: 2,000 Products (across 15 brands)

| Brand | Style | Products | Price Range | Target Demo |
|-------|-------|----------|-------------|-------------|
| **COVE** | Minimalist Basics | 250 | €15-€60 | Gen Z, Millennials |
| **UrbanEdge** | Streetwear | 180 | €25-€120 | Urban youth |
| **NordicWear** | Scandinavian Minimal | 150 | €40-€150 | Professionals |
| **EcoThread** | Sustainable Fashion | 140 | €30-€90 | Eco-conscious |
| **SportFlow** | Athleisure | 170 | €20-€100 | Active lifestyle |
| **LuxeLine** | Contemporary Premium | 120 | €80-€300 | Fashion-forward |
| **Heritage\u0026Co** | Classic Timeless | 130 | €50-€200 | Quality seekers |
| **TechWear Pro** | Technical Urban | 110 | €60-€180 | Tech enthusiasts |
| **BohoVibes** | Bohemian Lifestyle | 100 | €25-€85 | Free spirits |
| **MinimalCo** | Essential Basics | 140 | €18-€55 | Minimalists |
| **StreetPulse** | Urban Culture | 120 | €30-€110 | Street culture |
| **CasualFlow** | Everyday Comfort | 150 | €22-€75 | Comfort seekers |
| **VibrantThreads** | Colorful Expression | 90 | €28-€95 | Bold personalities |
| **TimelessBasics** | Wardrobe Essentials | 110 | €15-€50 | Value shoppers |
| **ModernHeritage** | Updated Classics | 100 | €45-€160 | Style-conscious |

### **Product Categories** (Distribution)

| Category | Count | Avg Price | Brands |
|----------|-------|-----------|--------|
| Hoodies | 300 | €45 | All brands |
| T-Shirts | 350 | €25 | All brands |
| Sweatshirts | 200 | €40 | 12 brands |
| Jackets | 280 | €95 | 13 brands |
| Pants | 250 | €65 | 10 brands |
| Shorts | 180 | €35 | 10 brands |
| Dresses | 150 | €75 | 8 brands |
| Skirts | 100 | €45 | 6 brands |
| Sweaters | 120 | €55 | 11 brands |
| Accessories | 70 | €20 | 8 brands |

---

## 🛠️ Implementation Approach

### **Option A: Faker + Templates** (Recommended for MVP)

**Time**: 4-6 hours  
**Cost**: €0  
**Quality**: 7/10 (good enough for testing)

**Approach**:
1. Use Python Faker library for attribute generation
2. Create brand templates with style DNA
3. Generate variants programmatically
4. Use placeholder images initially

**Advantages**:
- Fast implementation
- Full control
- Reproducible
- No API dependencies

**Code Structure**:
```python
from faker import Faker
import random
import json

fake = Faker()

BRANDS = {
    "UrbanEdge": {
        "style": "streetwear",
        "price_range": (25, 120),
        "materials": ["cotton blend", "french terry", "denim"],
        "colors": ["black", "grey", "navy", "olive", "burgundy"],
        "vibe": "urban contemporary edgy"
    },
    # ... 14 more brands
}

PRODUCT_TYPES = {
    "hoodie": {
        "base_price": 45,
        "materials": ["fleece", "heavy cotton", "french terry"],
        "attributes": ["drawstring hood", "kangaroo pocket", "ribbed cuffs"]
    },
    # ... more types
}

def generate_product(brand_name, brand_data, product_type):
    variant = {
        "variantId": f"{brand_name[:3].upper()}{fake.unique.random_number(digits=4)}",
        "brand": brand_name,
        "type": product_type,
        "name": f"{brand_name} {product_type.title()}",
        "price": random.uniform(*brand_data["price_range"]),
        "material": random.choice(brand_data["materials"]),
        "colorName": random.choice(brand_data["colors"]),
        # ... more attributes
    }
    return variant
```

---

### **Option B: AI-Generated (Best Quality)**

**Time**: 8-12 hours  
**Cost**: €20-50 (OpenAI API)  
**Quality**: 9/10 (very realistic)

**Approach**:
1. Generate product templates with Faker
2. Use GPT-4 to write descriptions, style notes
3. Use DALL-E/Stable Diffusion for placeholder images
4. Combine into final JSON

**Prompt Template**:
```
Generate a product description for:
Brand: {brand_name} (style: {brand_style})
Product: {product_type} in {color}
Price: €{price}
Material: {material}

Output JSON with:
- description (2 sentences)
- styleNotes (1 sentence)
- fitNotes (1 sentence)
- tags (8-12 keywords)
```

---

### **Option C: Real Dataset + Transformation** (Fastest Start)

**Time**: 2-3 hours  
**Cost**: €0  
**Quality**: 8/10 (real data but needs cleanup)

**Approach**:
1. Download FakeStoreAPI or Kaggle fashion dataset
2. Transform to your schema
3. Split into brands
4. Adjust prices for EUR market

**Available Datasets**:
- **FakeStoreAPI**: https://fakestoreapi.com/products (20 products)
- **Platzi Fake Store**: https://api.escuelajs.co/api/v1/products (200 products)
- **Kaggle Fashion Dataset**: 44,000 products (download required)

---

## 🚀 Recommended Implementation (Hybrid Approach)

### **Phase 1: Structure** (2 hours)
Use **Option A** to generate catalog structure:
- All brands
- All categories
- Product variants with basic attributes

### **Phase 2: Enrichment** (4 hours)
Use **Option B** for 20% of products:
- AI-generated descriptions for hero products
- Template-fill for remaining 80%

### **Phase 3: Images** (2 hours)
- Use placeholder images from Unsplash API
- OR use existing COVE images as templates
- OR generate with DALL-E for select products

**Total Time**: 8 hours  
**Total Cost**: €10-20  
**Quality**: 8.5/10

---

## 📝 Implementation Script

I'll create a Python script that does this:

### `generate_catalog.py`

```python
#!/usr/bin/env python3
"""
Multi-Brand Product Catalog Generator

Generates 2000+ realistic fashion products across 15 brands
Output: productVariantsFlat_generated.json
"""

import json
import random
from faker import Faker
from typing import Dict, List
import openai  # optional for AI generation

fake = Faker()

# Brand definitions (full list in actual script)
BRANDS = {
    "UrbanEdge": {
        "id":  "UREDGE",
        "merchant": "URBAN_EDGE_STORE",
        "style_tags": ["streetwear", "urban", "contemporary"],
        "price_multiplier": 1.5,
        "materials": ["cotton blend", "french terry", "tech fabric"],
        "colors": ["black", "grey heather", "navy",  "olive", "burgundy", "cream"],
        "description_tone": "edgy cool urban lifestyle"
    },
    # ... 14 more brands
}

# Product type templates
PRODUCT_TEMPLATES = {
    "hoodie": {
        "base_price_eur": 45,
        "materials": ["fleece", "heavy cotton", "french terry", "brushed fleece"],
        "gsm_range": (300, 400),
        "attributes": {
            "features": ["drawstring hood", "kangaroo pocket", "ribbed cuffs"],
            "fits": ["regular", "oversized", "relaxed"],
            "lengths": ["regular", "cropped"]
        }
    },
    # ... more product types
}

# Color library with hex codes
COLORS = {
    "black": "#000000",
    "white": "#FFFFFF",
    "navy": "#000080",
    "grey heather": "#8C8C8C",
    # ... 50+ colors
}

def generate_variant(brand_name: str, brand_data: Dict, product_type: str, index: int) -> Dict:
    """Generate a single product variant"""
    
    template = PRODUCT_TEMPLATES[product_type]
    base_price = template["base_price_eur"] * brand_data["price_multiplier"]
    
    color = random.choice(brand_data["colors"])
    material = random.choice(brand_data["materials"])
    
    variant_id = f"{brand_data['id']}{product_type[:1].upper()}{index:04d}"
    
    variant = {
        "variantId": variant_id,
        "groupId": f"PG_{product_type.upper()}_{brand_name.upper()}_{index}",
        "groupSlug": fake.slug(),
        "brandId": brand_name,
        "merchantId": brand_data["merchant"],
        "tenantId": "cove-marketplace",
        "currency": "EUR",
        "taxCategory": "standard",
        "status": "active",
        "tier": random.choice(["basic", "casual", "premium"]),
        "type": product_type,
        "gender": random.choice(["unisex", "women", "men"]),
        "fit": random.choice(template["attributes"]["fits"]),
        "material": material,
        "price": round(base_price + random.uniform(-10, 30), 2),
        "colorName": color,
        "hex": COLORS.get(color, "#000000"),
        "sizes": generate_sizes(),
        "images": [],
        "name": f"{brand_name} {product_type.title()}",
        "description": generate_description(brand_name, product_type, color, material),
       # ... more fields matching your schema
    }
    
    return variant

def generate_description(brand, product_type, color, material):
    """Generate product description"""
    templates = [
        f"{color.title()} {product_type} crafted from {material} for everyday style.",
        f"Contemporary {product_type} in {color}, designed for modern living.",
        f"Essential {color} {product_type} that blends comfort with style.",
    ]
    return random.choice(templates)

def generate_sizes():
    """Generate realistic stock levels"""
    return {
        "XS": random.randint(0, 8),
        "S": random.randint(5, 15),
        "M": random.randint(8, 20),
        "L": random.randint(6, 18),
        "XL": random.randint(3, 12),
        "XXL": random.randint(0, 8),
    }

def generate_full_catalog():
    """Generate complete catalog"""
    all_variants = []
    
    for brand_name, brand_data in BRANDS.items():
        brand_product_count = brand_data.get("product_count", 130)
        
        # Distribute products across categories
        for product_type in ["hoodie", "tee", "jacket", "pants", "sweatshirt"]:
            type_count = brand_product_count // 5
            
            for i in range(type_count):
                variant = generate_variant(brand_name, brand_data, product_type, i)
                all_variants.append(variant)
    
    return all_variants

def main():
    print("🏭 Generating multi-brand product catalog...")
    
    variants = generate_full_catalog()
    
    output_file = "productVariantsFlat_generated.json"
    with open(output_file, 'w') as f:
        json.dump(variants, f, indent=2)
    
    print(f"✅ Generated {len(variants)} products")
    print(f"📁 Saved to: {output_file}")
    
    # Stats
    brands = set(v["brandId"] for v in variants)
    types = set(v["type"] for v in variants)
    print(f"📊 Brands: {len(brands)}, Categories: {len(types)}")

if __name__ == "__main__":
    main()
```

---

## 🎨 AI Enhancement Script (Optional)

### `enrich_with_ai.py`

```python
import json
import openai
from tqdm import tqdm

def enrich_product_with_ai(product):
    """Use GPT-4 to generate rich descriptions"""
    
    prompt = f"""Generate realistic product content for:
Brand: {product['brandId']} 
Product: {product['type']} in {product['colorName']}
Price: €{product['price']}
Material: {product['material']}

Return JSON with:
{{
  "description": "2-sentence product description",
  "styleNotes": "1 sentence styling tip",
  "fitNotes": "1 sentence fit guidance",
  "tags": ["tag1", "tag2", "tag3"]
}}
"""
    
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8
    )
    
    return json.loads(response.choices[0].message.content)

def enrich_catalog(input_file, output_file, sample_size=200):
    """Enrich top N products with AI"""
    
    with open(input_file) as f:
        products = json.load(f)
    
    # Enrich first N products (hero products)
    for product in tqdm(products[:sample_size]):
        enrichment = enrich_product_with_ai(product)
        product.update(enrichment)
    
    with open(output_file, 'w') as f:
        json.dump(products, f, indent=2)
    
    print(f"✅ Enriched {sample_size} products with AI")
```

---

## 🖼️ Image Sourcing Strategy

### Option 1: Unsplash API (Free, Real Photos)
```python
import requests

def get_product_image(product_type, color):
    url = f"https://api.unsplash.com/photos/random"
    params = {
        "query": f"{color} {product_type} fashion",
        "client_id": "YOUR_UNSPLASH_KEY"
    }
    response = requests.get(url, params=params)
    return response.json()["urls"]["regular"]
```

### Option 2: Placeholder Service
```
https://placeholder.it/photos/fashion/300x400
```

### Option 3: DALL-E Generation (€0.02/image)
```python
def generate_product_image(product):
    prompt = f"professional product photography, {product['colorName']} {product['type']}, clean background, studio lighting"
    # Call DALL-E API
```

---

## ✅ Success Criteria

After implementation, you should have:

- ✅ **2000+ products** across 15 brands
- ✅ **8+ categories** (hoodies, tees, jackets, pants, etc.)
- ✅ **Realistic price distribution** (€15-€300)
- ✅ **Diverse materials** (50+ materials)
- ✅ **50+ colors** with hex codes
- ✅ **Proper attribute coverage** (fits, styles, use cases)
- ✅ **Valid stock levels** per size
- ✅ **Schema-compatible** with existing Django models

### Testing Your AI Features

**Collaborative Filtering**:
- 2000 products × 100 simulated users = 200K interaction pairs ✅
- Sparse matrix still 90%+ empty (realistic) ✅
- Enough data for meaningful similarities ✅

**Recommendations**:
- Cross-brand recommendations ✅
- Price-based filtering ✅
- Style-based matching ✅

**Search**:
- Multi-brand queries ✅
- Price range filtering ✅
- Material/color search ✅

---

## 🎯 Next Steps

1. **Review this plan** - Any adjustments needed?
2. **Choose approach** - Faker only? Faker + AI? Real dataset?
3. **I'll implement** - Generate the script
4. **Run generation** - Create new catalog JSON
5. **Load into DB** - Update Django fixtures
6. **Generate embeddings** - Rebuild vector DB
7. **Test features** - Verify CF, search, recommendations

**Time to first results**: 2-4 hours  
**Time to production-ready**: 8-12 hours

---

## 💡 Quick Win Option

**Want to start TODAY?**

I can generate a **500-product catalog** (5 brands) in the **next 30 minutes** using Faker:
- Quick validation of approach
- Immediate testing of your features  
- Scale to 2000 later

**Or go full 2000 products now** if you want the complete solution.

**Your call!**
