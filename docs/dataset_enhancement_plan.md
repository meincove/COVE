# Dataset Enhancement Plan for Virtual Trial Room

## Goal
Build a comprehensive, high-quality product dataset that enables intelligent outfit building with diverse options, accurate matching, and realistic recommendations.

---

## Current Dataset Status

**What We Have**:
- ~40 products (jackets, sweatshirts, sweaters, pants)
- Basic metadata (type, color, price)
- Working embeddings

**What's Missing**:
- Shoes (CRITICAL)
- Tees, hoodies, accessories
- Rich metadata (materials, fit, style tags)
- Diverse price points
- Multiple brands
- Seasonal variations

---

## Ideal Dataset Structure

### Target Inventory: 200+ Products

#### Category Breakdown
```
TOPS (80 products):
- Tees: 25 (basic, graphic, long-sleeve)
- Hoodies: 20 (pullover, zip-up)
- Sweatshirts: 15 (crew, oversized)
- Sweaters: 10 (knit, cardigan)
- Jackets: 10 (denim, bomber, coach)

BOTTOMS (60 products):
- Pants: 30 (jeans, chinos, dress pants)
- Shorts: 20 (casual, athletic, dress)
- Skirts: 10 (casual, formal)

SHOES (40 products):
- Sneakers: 20 (casual, athletic, high-top)
- Boots: 10 (chelsea, combat, dress)
- Dress Shoes: 5 (oxfords, loafers)
- Sandals: 5 (casual, sport)

ACCESSORIES (20 products):
- Belts: 8
- Bags: 6 (backpack, tote, messenger)
- Hats: 6 (beanie, cap, bucket)
```

### Required Metadata Fields

**Core Fields** (CRITICAL):
```json
{
  "id": "unique_id",
  "title": "Product Name",
  "type": "tee|hoodie|pants|shoes|...",
  "tier": "casual|smart_casual|formal|athletic",
  "color": "navy|black|white|...",
  "price": 99.99,
  "brand": "BrandName",
  "description": "Detailed description",
  "images": ["url1", "url2"]
}
```

**Enhanced Fields** (for better matching):
```json
{
  "material": "cotton|denim|leather|...",
  "materialBlend": "100% cotton",
  "fit": "slim|regular|oversized|relaxed",
  "pattern": "solid|striped|graphic|...",
  "season": ["spring", "summer", "fall", "winter"],
  "styleTags": ["minimalist", "streetwear", "classic"],
  "useCases": ["casual", "work", "outdoor"],
  "gender": "male|female|unisex",
  "sizes": ["S", "M", "L", "XL"],
  "inStock": true,
  "featured": false
}
```

**AI-Specific Fields** (for outfit building):
```json
{
  "formalityScore": 1-10,  // 1=gym, 10=black tie
  "versatility": 1-10,     // How many outfits can use this?
  "statementPiece": true,  // Is this a focal point?
  "colorFamily": "neutral|warm|cool|bold",
  "matchingColors": ["navy", "grey", "white"],
  "avoidColors": ["orange", "bright green"]
}
```

---

## Data Quality Standards

### 1. Completeness
- ✅ All core fields populated
- ✅ At least 3 enhanced fields
- ✅ At least 1 product image
- ✅ Description > 50 characters

### 2. Accuracy
- ✅ Prices realistic (€20-€500 range)
- ✅ Colors match actual product
- ✅ Type/category correct
- ✅ Fit descriptions accurate

### 3. Diversity
- ✅ Multiple price points per category
- ✅ Various colors (neutrals + bold)
- ✅ Different styles (minimalist, streetwear, classic)
- ✅ Multiple brands (3-5 brands)

### 4. Consistency
- ✅ Standardized field names
- ✅ Consistent color naming (navy vs dark blue)
- ✅ Uniform type values
- ✅ Same schema across all products

---

## Data Sources & Generation

### Option 1: Synthetic Data Generation (FASTEST)
**Pros**: Quick, controlled, consistent
**Cons**: Not real products

**Approach**:
```python
# Generate realistic product data
def generate_product(type, style, color):
    return {
        "id": f"{type}_{style}_{color}_{uuid4()}",
        "title": f"{style.title()} {type.title()}",
        "type": type,
        "tier": infer_tier(style),
        "color": color,
        "price": random_price(type),
        "brand": random_brand(),
        "material": infer_material(type),
        "fit": random_fit(),
        "styleTags": [style, infer_secondary_style()],
        ...
    }
```

### Option 2: Web Scraping (REALISTIC)
**Pros**: Real products, real prices
**Cons**: Legal/ethical concerns, maintenance

**Sources**:
- Uniqlo, H&M, Zara (basic/affordable)
- Nike, Adidas (athletic)
- ASOS, Nordstrom (variety)

### Option 3: Manual Curation (HIGHEST QUALITY)
**Pros**: Perfect control, curated selection
**Cons**: Time-consuming

**Process**:
1. Research popular products
2. Create product entries manually
3. Use AI to generate descriptions
4. Validate all fields

### Recommended: Hybrid Approach
1. **Generate 100 products synthetically** (core inventory)
2. **Scrape 50 real products** (for realism)
3. **Manually curate 50 premium products** (for quality)

---

## Implementation Workflow

### Phase 1: Core Dataset (100 Products)

**Week 1: Generate Synthetic Data**
```bash
# Run generation script
python scripts/generate_products.py \
  --count 100 \
  --categories tee,hoodie,pants,shoes \
  --output data/products.json
```

**Week 1: Add to Database**
```bash
# Import to PostgreSQL
python scripts/import_products.py \
  --file data/products.json \
  --validate
```

**Week 1: Generate Embeddings**
```bash
# Create vector embeddings
python scripts/generate_embeddings.py \
  --table ai_products \
  --batch-size 50
```

**Week 1: Validate**
```bash
# Test search
curl -X POST "http://localhost:8000/ai/recs/suggest" \
  -d '{"query": "navy tee", "top_k": 5}'

# Test outfit builder
curl -X POST "http://localhost:8000/ai/agent/query" \
  -d '{"message": "casual outfit", "sessionType": "outfit_builder"}'
```

### Phase 2: Expansion (200 Products)

**Week 2: Add Real Products**
- Scrape 50 products from e-commerce sites
- Manually curate 50 premium products
- Validate and import

**Week 2: Enhance Metadata**
- Add AI-specific fields
- Calculate formality scores
- Define color matching rules

### Phase 3: Continuous Updates

**Ongoing**:
- Add seasonal products
- Update prices
- Mark out-of-stock items
- Add new categories as needed

---

## Sample Product Schemas

### Example 1: Basic Tee
```json
{
  "id": "tee_minimal_navy_001",
  "title": "Essential Navy Crew Tee",
  "type": "tee",
  "tier": "casual",
  "color": "navy",
  "price": 29.99,
  "brand": "ModernBasics",
  "description": "Classic navy crew neck tee in soft cotton. Perfect for everyday wear.",
  "material": "cotton",
  "materialBlend": "100% organic cotton",
  "fit": "regular",
  "pattern": "solid",
  "season": ["spring", "summer", "fall"],
  "styleTags": ["minimalist", "basic", "versatile"],
  "useCases": ["casual", "layering"],
  "gender": "unisex",
  "sizes": ["S", "M", "L", "XL"],
  "inStock": true,
  "formalityScore": 3,
  "versatility": 9,
  "statementPiece": false,
  "colorFamily": "neutral",
  "matchingColors": ["white", "grey", "khaki", "denim"],
  "images": ["https://example.com/tee_navy_front.jpg"]
}
```

### Example 2: Statement Sneaker
```json
{
  "id": "sneaker_bold_white_001",
  "title": "StreetVibe High-Top Sneaker",
  "type": "sneakers",
  "tier": "casual",
  "color": "white",
  "price": 129.99,
  "brand": "UrbanKicks",
  "description": "Bold white high-top sneakers with chunky sole. Street-ready style.",
  "material": "leather",
  "materialBlend": "Leather upper, rubber sole",
  "fit": "true_to_size",
  "pattern": "solid",
  "season": ["spring", "summer", "fall", "winter"],
  "styleTags": ["streetwear", "bold", "contemporary"],
  "useCases": ["casual", "street", "urban"],
  "gender": "unisex",
  "sizes": ["7", "8", "9", "10", "11", "12"],
  "inStock": true,
  "formalityScore": 2,
  "versatility": 7,
  "statementPiece": true,
  "colorFamily": "neutral",
  "matchingColors": ["black", "grey", "navy", "any"],
  "images": ["https://example.com/sneaker_white.jpg"]
}
```

---

## Validation Criteria

### Automated Checks
```python
def validate_product(product):
    checks = {
        "has_id": product.get("id") is not None,
        "has_title": len(product.get("title", "")) > 0,
        "has_type": product.get("type") in VALID_TYPES,
        "has_price": 0 < product.get("price", 0) < 1000,
        "has_color": product.get("color") in VALID_COLORS,
        "has_image": len(product.get("images", [])) > 0,
        "description_length": len(product.get("description", "")) > 50
    }
    return all(checks.values()), checks
```

### Manual Review
- [ ] Images load correctly
- [ ] Descriptions make sense
- [ ] Prices are realistic
- [ ] Colors match images
- [ ] Style tags are appropriate

---

## Success Metrics

### Dataset Quality
- [ ] 200+ products across 8 categories
- [ ] 100% core fields populated
- [ ] 80%+ enhanced fields populated
- [ ] 95%+ pass validation checks

### Outfit Builder Performance
- [ ] Can build 10+ different outfit types
- [ ] 90%+ outfits within budget
- [ ] 80%+ color coordination success
- [ ] 3-5 items per outfit average

### Search Quality
- [ ] Relevant results for 95%+ queries
- [ ] < 1s search response time
- [ ] Diverse results (not all same brand/color)

---

## Next Steps

### Immediate (This Week)
1. **Create product generation script**
   - Define product templates
   - Generate 100 synthetic products
   - Validate output

2. **Import to database**
   - Run import script
   - Verify data integrity
   - Generate embeddings

3. **Test outfit builder**
   - Run with new dataset
   - Verify complete outfits returned
   - Check variety and quality

### Short-term (Next 2 Weeks)
1. Add real products (scraping/manual)
2. Enhance metadata
3. Add seasonal variations
4. Create product images/placeholders

### Long-term (Ongoing)
1. Continuous dataset updates
2. Add user feedback loop
3. A/B test product selections
4. Optimize based on conversion data

---

## Tools & Scripts Needed

### 1. Product Generator
```bash
scripts/generate_products.py
  --count 100
  --categories tee,hoodie,pants,shoes
  --brands 5
  --price-range 20-500
```

### 2. Database Importer
```bash
scripts/import_products.py
  --file products.json
  --table ai_products
  --validate
  --dry-run
```

### 3. Embedding Generator
```bash
scripts/generate_embeddings.py
  --table ai_products
  --model text-embedding-3-small
  --batch-size 50
```

### 4. Validator
```bash
scripts/validate_dataset.py
  --table ai_products
  --report validation_report.json
```

---

## Conclusion

A high-quality dataset is the foundation of your Virtual Trial Room. With 200+ well-structured products across diverse categories, your AI will be able to:

- Build complete, stylish outfits
- Offer multiple options per category
- Match colors intelligently
- Respect budget constraints
- Provide fallback alternatives
- Create personalized recommendations

**Estimated Time**: 1-2 weeks for core dataset (100 products)
**Estimated Cost**: Minimal (mostly time + embedding API costs)

Let's start with the product generation script!
