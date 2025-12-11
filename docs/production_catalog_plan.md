# Production-Grade Multi-Brand Catalog Generator
## Implementation Plan

**Date**: December 9, 2024  
**Target**: 2000+ Products, 15 Brands, Complete Schema, Real Images  
**Quality**: Production-Ready (No Shortcuts)

---

## 🎯 Requirements Analysis

### Critical User Requirements
1. ✅ **Production-quality dataset** - No shortcuts or placeholders
2. ✅ **For AI AND Frontend** - Must serve both teammates
3. ✅ **Complete per-product data** - All fields, variations, images
4. ✅ **Real images** - From Pexels (200 req/hr free tier)
5. ✅ **Schema compatibility** - Zero refactoring required
6. ✅ **Local image storage** - No external dependencies in production

---

## 📊 Current Schema Analysis

### Exact Schema (From productVariantsFlat.json)

```json
{
  // Core Identifiers (8 fields)
  "variantId": "CCH001",
  "groupId": "PG_HOODIE_CASUAL_FLEECE",
  "groupSlug": "hoodie-casual-fleece-19.99",
  "brandId": "COVE",
  "merchantId": "COVE_DTC",
  "tenantId": "cove-default",
  "currency": "EUR",
  "tax Category": "standard",
  "status": "active",
  
  // Product Attributes (8 fields)
  "sizingKey": "hoodie_unisex_regular",
  "tier": "casual",
  "type": "hoodie",
  "gender": "unisex",
  "fit": "regular",
  "material": "Brushed Fleece",
  "price": 19.99,
  
  // Color & Images (3 fields)
  "colorName": "black",
  "hex": "#000000",
  "images": ["CCH001-back.png", "CCH001-front.png"],
  
  // Sizes (1 object)
  "sizes": {"S": 10, "M": 12, "L": 8, "XL": 6},
  
  // Descriptions (3 fields)
  "name": "Cove Casual Hoodie",
  "description": "...",
  
  // Nested Objects (5 objects - CRITICAL)
  "fabric": {
    "materialMain": "Brushed Fleece",
    "materialBlend": "80% cotton / 20% polyester",
    "gsm": 360,
    "stretchLevel": "medium",
    "thickness": "medium",
    "warmth": "all-season",
    "breathability": "medium",
    "softness": "high"
  },
  
  "style": {
    "dressCode": "streetwear",
    "styleTags": ["hoodie", "minimal", "logo-front"],
    "useCases": ["daily wear", "travel"],
    "pattern": "solid",
    "logoPlacement": "front-small"
  },
  
  "fitProfile": {
    "fit": "regular",
    "length": "regular",
    "bodyShapes": ["slim", "athletic"],
    "recommendedGender": "unisex",
    "stretchHelpsFit": true
  },
  
  "care": {
    "washTemp": "30°C gentle wash",
    "dryer": "no",
    "iron": "low",
    "careNotes": "..."
  },
  
  // Additional Fields
  "styleNotes": "...",
  "fitNotes": "...",
  "tags": ["hoodie", "casual", "black", ...]
}
```

**Total**: **21+ required fields** + **5 nested objects** = **Complete schema**

---

## 🏭 Brand Definitions (15 Production Brands)

| Brand | Identity | Price Range | Style | Target | Products |
|-------|----------|-------------|-------|---------|----------|
| **COVE** | Minimalist Essentials | €15-€60 | Clean, simple | Gen Z | 200 |
| **UrbanPulse** | Street Culture | €25-€120 | Edgy, bold | Urban youth | 150 |
| **NordicThread** | Scandi Minimal | €40-€150 | Refined, clean | Professionals | 140 |
| **EcoHaven** | Sustainable First | €30-€90 | Natural, ethical | Eco-conscious | 130 |
| **FlexFit** | Performance Athleisure | €20-€100 | Technical, active | Athletes | 150 |  
| **LuxeLine** | Contemporary Premium | €80-€300 | Sophisticated | Fashion-forward | 120 |
| **TimelessCo** | Classic Heritage | €50-€200 | Traditional, quality | Traditionalists | 130 |
| **TechUrban** | Technical Wear | €60-€180 | Futuristic, functional | Tech enthusiasts | 110 |
| **FreeSpirit** | Bohemian Lifestyle | €25-€85 | Flowing, artistic | Free spirits | 100 |
| **CoreBasics** | Essential Wardrobe | €18-€55 | Simple, reliable | Minimalists | 140 |
| **StreetVibe** | Youth Culture | €30-€110 | Trendy, vibrant | Trendsetters | 120 |
| **ComfortZone** | Everyday Ease | €22-€75 | Soft, relaxed | Comfort seekers | 150 |
| **BoldHues** | Color Expression | €28-€95 | Bright, playful | Bold personalities | 90 |
| **SimpleStack** | Basics Done Right | €15-€50 | Functional | Value shoppers | 110 |
| **ModernHeritage** | Updated Classics | €45-€160 | Contemporary-classic | Style-conscious | 100 |

**Total**: 2,040 products

---

## 🖼️ Image Sourcing Strategy

### Winner: Pexels API ✅

**Why Pexels over Unsplash**:
- ✅ **200 requests/hour** (vs Unsplash 50)
- ✅ **20,000 requests/month** (vs Unsplash 1,500)
- ✅ Unlimited with approved application
- ✅ No hotlinking requirement (can download locally)
- ✅ Excellent fashion photography collection

### Image Organization Structure

```
frontend/public/images/products/
├── COVE/
│   ├── hoodie/
│   │   ├── CCH001-front.jpg
│   │   ├── CCH001-back.jpg
│   │   └── CCH001-detail.jpg
│   ├── tee/
│   └── jacket/
├── UrbanPulse/
│   ├── hoodie/
│   └── tee/
└── [13 more brands]/
```

**Benefits**:
- ✅ Organized by brand + category
- ✅ Easy for frontend to reference
- ✅ No external API calls in production
- ✅ CDN-ready structure

### Image Download Strategy

**Phase 1: Fetch from Pexels** (200/hour limit)
- Query: `{brand_style} {product_type} {color} fashion`
- Download: 3 images per product (front, back, detail)
- Store: Local `/public/images/` directory

**Phase 2: Fallback**
- If rate limit hit → Use Pixabay (unlimited)
- If still missing → Use solid color placeholder with product info

---

## 🛠️ Implementation Architecture

### Tool Stack
- **Python 3.10+** (your existing environment)
- **Faker** - Attribute generation
- **Requests** - Pexels API calls
- **Pillow** - Image processing
- **tqdm** - Progress tracking
- **JSON** - Schema output

### Script Structure

```
cove-ai-core/scripts/
├── generate_catalog.py          # Main generator
├── brand_definitions.py         # Brand DNA
├── product_templates.py         # Product schemas
├── pexels_downloader.py         # Image fetching
└── schema_validator.py          # Ensure 100% compatibility
```

---

## 📝 Generated Product Example

```json
{
  "variantId": "URP-H-0042",
  "groupId": "PG_HOODIE_URBANPULSE_HEAVYWEIGHT",
  "groupSlug": "urbanpulse-heavyweight-hoodie-89.99",
  "brandId": "UrbanPulse",
  "merchantId": "URBANPULSE_OFFICIAL",
  "tenantId": "cove-marketplace",
  "currency": "EUR",
  "taxCategory": "standard",
  "status": "active",
  
  "sizingKey": "hoodie_unisex_oversized",
  "tier": "premium",
  "type": "hoodie",
  "gender": "unisex",
  "fit": "oversized",
  "material": "Heavy French Terry",
  "price": 89.99,
  
  "colorName": "charcoal grey",
  "hex": "#36454F",
  "sizes": {
    "XS": 3,
    "S": 12,
    "M": 18,
    "L": 15,
    "XL": 10,
    "XXL": 5
  },
  "images": [
    "URP-H-0042-front.jpg",
    "URP-H-0042-back.jpg",
    "URP-H-0042-detail.jpg"
  ],
  
  "name": "UrbanPulse Heavyweight Hoodie",
  "description": "Premium heavyweight hoodie crafted from dense French terry for durability and warmth. Oversized fit with dropped shoulders defines the modern street silhouette.",
  
  "fabric": {
    "materialMain": "Heavy French Terry",
    "materialBlend": "85% organic cotton / 15% recycled polyester",
    "gsm": 480,
    "stretchLevel": "low",
    "thickness": "heavy",
    "warmth": "cold-weather",
    "breathability": "low",
    "softness": "medium-high"
  },
  
  "style": {
    "dressCode": "streetwear",
    "styleTags": ["oversized", "heavyweight", "urban", "statement"],
    "useCases": ["street fashion", "winter layering", "statement piece"],
    "pattern": "solid",
    "logoPlacement": "chest-embroidered"
  },
  
  "fitProfile": {
    "fit": "oversized",
    "length": "regular",
    "bodyShapes": ["slim", "athletic", "stocky"],
    "recommendedGender": "unisex",
    "stretchHelpsFit": false
  },
  
  "care": {
    "washTemp": "30°C gentle wash",
    "dryer": "no",
    "iron": "low",
    "careNotes": "Wash inside out. Air dry to maintain fabric weight. Do not bleach."
  },
  
  "styleNotes": "Layer over slim-fit tees with tapered pants for balanced proportions. The heavyweight fabric holds its shape season after season.",
  
  "fitNotes": "True oversized fit - order your usual size for intended drape. Size down if you prefer a more fitted oversized look.",
  
  "tags": [
    "hoodie", "heavyweight", "french terry", "oversized", 
    "streetwear", "urban", "charcoal", "premium", "cold-weather",
    "statement piece", "winter", "embroidered logo"
  ]
}
```

---

## ⚙️ Implementation Timeline

### Phase 1: Setup (30 min)
- ✅ Install dependencies
- ✅ Get Pexels API key (free)
- ✅ Create directory structure

### Phase 2: Brand Definitions (1 hour)
- ✅ Define 15 brand identities
- ✅ Create style DNA per brand
- ✅ Set price ranges, materials, colors

### Phase 3: Product Templates (1.5 hours)
- ✅ Create templates for 8 categories
- ✅ Define material libraries
- ✅ Set up attribute combinations

### Phase 4: Generator Core (2 hours)
- ✅ Build main generation logic
- ✅ Implement exact schema matching
- ✅ Add validation layer

### Phase 5: Image Integration (2 hours)
- ✅ Pexels API integration
- ✅ Download + organize images
- ✅ Generate image filenames

### Phase 6: Generation + QA (1 hour)
- ✅ Run full generation (2000+ products)
- ✅ Validate schema compliance
- ✅ Spot-check quality

### Phase 7: Frontend Integration (30 min)
- ✅ Copy images to frontend/public
- ✅ Update JSON path references
- ✅ Test product page rendering

**Total Time**: 8.5 hours for production-grade catalog

---

## 🎯 Success Criteria

After completion, you'll have:

### Data Quality

- ✅ **2,040 products** across 15 brands
- ✅ **100% schema compliance** - Every field populated
- ✅ **8 product categories** - Hoodies, tees, jackets, pants, etc.
- ✅ **6,120 real images** - 3 per product from Pexels
- ✅ **Realistic variations** - Colors, sizes, materials
- ✅ **Proper price distribution** - €15-€300 range
- ✅ **Complete metadata** - fabric, style, fit, care

### Integration Ready
- ✅ **Zero refactoring** - Drop-in replacement for current JSON
- ✅ **Frontend compatible** - Images organized in public folder
- ✅ **AI ready** - Rich descriptions for embeddings
- ✅ **Django loadable** - Matches existing models

### Testing Capabilities
- ✅ **CF testable** - Enough products for sparse matrix
- ✅ **Search testable** - Multi-brand, multi-category queries
- ✅ **Recommendations testable** - Cross-brand suggestions
- ✅ **A/B testable** - Statistical significance possible

---

## 🚀 Next Steps

**Option A: I Implement Now** (Recommended)
- I'll create all scripts
- Generate full catalog
- Download images  
- Validate integration
- **Timeline**: 4-6 hours of work

**Option B: Review Plan First**
- You review this plan
- Suggest adjustments
- I implement with changes

**Option C: Phased Approach**
- Start with 500 products (5 brands)
- Validate approach
- Scale to 2000

**Your decision?**

---

## 📦 Deliverables

When complete, you'll receive:

1. **`productVariantsFlat_v2.json`** - 2040 products, production-ready
2. **`/frontend/public/images/products/`** - 6120 organized images
3. **`generate_catalog.py`** - Rerunnable generator script
4. **`catalog_report.md`** - Statistics and validation report
5. **`migration_guide.md`** - How to switch from old to new catalog

---

**This is production-grade. No shortcuts. Ready when you are.** 🚀
