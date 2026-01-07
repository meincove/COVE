# Product Images Implementation Plan

## Current Status
- **Products**: 2007
- **Color Variants**: 2167
- **Product Images**: 0 ❌

**Critical Gap**: No images for Virtual Trial Room visualization!

---

## Image Requirements

### For Virtual Trial Room
1. **Front view** (primary) - Shows product clearly
2. **Back view** (optional) - Shows details
3. **Detail shots** (optional) - Material, logo, etc.

### Image Specifications
- **Format**: WebP (best compression) or PNG/JPEG
- **Size**: 800x800px minimum (for zoom)
- **Background**: White or transparent
- **Quality**: High enough for visual trial room

---

## Options for Adding Images

### Option 1: AI-Generated Images (DALL-E/Midjourney)
**Pros**:
- Consistent style
- Custom to our products
- Professional quality

**Cons**:
- Expensive ($0.02-0.04 per image × 2000+ = $40-80+)
- Time-consuming (API rate limits)
- May need manual review

**Cost**: ~$50-100 for 2000+ images
**Time**: 2-3 days with automation

### Option 2: Placeholder Images
**Pros**:
- Fast implementation
- Free
- Works for MVP testing

**Cons**:
- Not realistic
- Poor user experience
- Can't showcase actual products

**Cost**: $0
**Time**: 2-3 hours

### Option 3: Stock Photo Integration
**Pros**:
- Real product photos
- Professional quality
- Large libraries available

**Cons**:
- May not match our exact products
- Licensing costs
- Manual matching required

**Cost**: $50-200/month (Unsplash Pro, Pexels, etc.)
**Time**: 1-2 weeks for manual matching

### Option 4: Manual Upload
**Pros**:
- Complete control
- Exact products
- Highest quality

**Cons**:
- Very time-consuming
- Requires product photography
- Expensive if outsourced

**Cost**: $1000+ (photography)
**Time**: 2-4 weeks

---

## Recommended Approach: Hybrid

### Phase 1: Placeholders (Immediate - 2-3 hours)
Generate placeholder images with product info for ALL products

**Benefits**:
- Unblocks Virtual Trial Room development
- Shows product type, color, name
- Better than nothing

### Phase 2: AI-Generated for Key Products (1-2 days)
Generate AI images for top 200 products:
- All shoes (80 products) - CRITICAL
- Popular tees (50 products)
- Popular hoodies (50 products)
- Key accessories (20 products)

**Total**: ~200 images × $0.03 = $6

### Phase 3: Expand Coverage (Ongoing)
- Generate more AI images as budget allows
- Replace placeholders gradually
- Focus on high-traffic products

---

## Implementation Scripts

### Script 1: Generate Placeholder Images

```python
# backend/scripts/generate_placeholder_images.py
from PIL import Image, ImageDraw, ImageFont
from catalog.models import ProductMasterGroup, ColorGroup, ProductImage
import os

def generate_placeholder(variant, output_dir):
    """Generate a placeholder image for a product variant."""
    # Create 800x800 image with product color
    img = Image.new('RGB', (800, 800), color=variant.hex or '#CCCCCC')
    draw = ImageDraw.Draw(img)
    
    # Add product info
    font = ImageFont.load_default()
    
    # Product name
    draw.text((50, 300), variant.product.name, fill='white', font=font)
    # Color
    draw.text((50, 350), f"Color: {variant.color_name}", fill='white', font=font)
    # Type
    draw.text((50, 400), f"Type: {variant.product.type}", fill='white', font=font)
    # Price
    draw.text((50, 450), f"€{variant.product.base_price}", fill='white', font=font)
    
    # Save
    filename = f"{variant.variant_id}_placeholder.webp"
    filepath = os.path.join(output_dir, filename)
    img.save(filepath, 'WEBP', quality=85)
    
    return filename

# Generate for all variants
output_dir = '/Users/ssg/Desktop/COVE/backend/static/products/placeholders'
os.makedirs(output_dir, exist_ok=True)

for variant in ColorGroup.objects.all():
    filename = generate_placeholder(variant, output_dir)
    ProductImage.objects.create(
        variant=variant,
        image_name=f"products/placeholders/{filename}"
    )
```

### Script 2: Generate AI Images (DALL-E)

```python
# backend/scripts/generate_ai_images.py
import openai
from catalog.models import ProductMasterGroup, ColorGroup, ProductImage
import requests
import os

openai.api_key = os.getenv('OPENAI_API_KEY')

def generate_ai_image(variant):
    """Generate AI image for a product variant."""
    # Create prompt
    prompt = f"""
    Professional product photography of a {variant.color_name} {variant.product.type}.
    {variant.product.material} material.
    {variant.product.fit} fit.
    Clean white background, front view, studio lighting, high quality, e-commerce style.
    """
    
    # Generate image
    response = openai.Image.create(
        model="dall-e-3",
        prompt=prompt,
        size="1024x1024",
        quality="standard",
        n=1
    )
    
    # Download image
    image_url = response.data[0].url
    img_data = requests.get(image_url).content
    
    # Save
    filename = f"{variant.variant_id}_ai.webp"
    filepath = f"/Users/ssg/Desktop/COVE/backend/static/products/ai/{filename}"
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, 'wb') as f:
        f.write(img_data)
    
    return f"products/ai/{filename}"

# Generate for priority products
priority_types = ['sneakers', 'boots', 'dress_shoes', 'sandals']
for variant in ColorGroup.objects.filter(product__type__in=priority_types)[:80]:
    try:
        image_path = generate_ai_image(variant)
        ProductImage.objects.create(
            variant=variant,
            image_name=image_path
        )
        print(f"✅ Generated image for {variant.variant_id}")
    except Exception as e:
        print(f"❌ Error for {variant.variant_id}: {e}")
```

### Script 3: Bulk Image Upload

```python
# backend/catalog/management/commands/upload_images.py
from django.core.management.base import BaseCommand
from catalog.models import ColorGroup, ProductImage
from pathlib import Path

class Command(BaseCommand):
    def handle(self, *args, **options):
        """Link existing images to products."""
        image_dir = Path('/Users/ssg/Desktop/COVE/backend/static/products')
        
        for image_file in image_dir.rglob('*.webp'):
            # Extract variant ID from filename
            variant_id = image_file.stem.split('_')[0]
            
            try:
                variant = ColorGroup.objects.get(variant_id=variant_id)
                ProductImage.objects.get_or_create(
                    variant=variant,
                    image_name=str(image_file.relative_to(image_dir.parent))
                )
                self.stdout.write(f"✅ Linked {variant_id}")
            except ColorGroup.DoesNotExist:
                self.stdout.write(f"⚠️  Variant not found: {variant_id}")
```

---

## Timeline & Costs

### Immediate (Today - 2-3 hours)
- ✅ Generate placeholder images for all 2167 variants
- ✅ Link to database
- ✅ Test in Virtual Trial Room
- **Cost**: $0

### Short-term (This Week - 1-2 days)
- Generate AI images for 200 priority products
- Replace placeholders for shoes, key apparel
- **Cost**: ~$6-10

### Medium-term (Next 2 Weeks)
- Generate AI images for remaining products (batch processing)
- Or integrate stock photos
- **Cost**: ~$50-100

---

## Next Steps

1. **Choose approach**: Placeholders first? AI-generated? Both?
2. **Set up image storage**: Static files or CDN?
3. **Run generation script**: Create images
4. **Link to database**: Update ProductImage table
5. **Test Virtual Trial Room**: Verify images display correctly

---

## Questions to Resolve

1. **Budget**: How much can we spend on images?
2. **Timeline**: Need images immediately or can wait?
3. **Quality**: Placeholders acceptable for MVP?
4. **Storage**: Where to host images (local, S3, CDN)?

---

## Recommendation

**For MVP (Next 2-3 hours)**:
1. Generate placeholder images for ALL products
2. Test Virtual Trial Room with placeholders
3. Validate image display and loading

**For Production (Next 1-2 weeks)**:
1. Generate AI images for shoes (80 products) - PRIORITY
2. Generate AI images for top 100 apparel items
3. Keep placeholders for remaining products
4. Replace gradually as budget allows

This gives us a working Virtual Trial Room immediately while building toward production-quality images.
