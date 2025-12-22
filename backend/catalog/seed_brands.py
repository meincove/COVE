"""
Seed initial brands for COVE marketplace - Windows compatible version
"""
from catalog.models import Brand

brands_data = [
    {
        'brand_id': 'COVE',
        'brand_name': 'COVE',
        'slug': 'cove',
        'description': 'COVE - Your premium lifestyle marketplace powered by AI',
        'theme_colors': {
            'primary': '#000000',
            'secondary': '#FFFFFF',
            'accent': '#4F46E5'
        },
        'is_active': True
    },
    {
        'brand_id': 'BoldHues',
        'brand_name': 'BoldHues',
        'slug': 'boldhues',
        'description': 'Colorful, bright, bold, expressive, and playful apparel for modern living',
        'theme_colors': {
            'primary': '#FF0000',
            'secondary': '#FFFF00',
            'accent': '#FF69B4'
        },
        'is_active': True
    },
    {
        'brand_id': 'ModernHeritage',
        'brand_name': 'Modern Heritage',
        'slug': 'modern-heritage',
        'description': 'Contemporary designs with a nod to timeless classics',
        'theme_colors': {
            'primary': '#2C3E50',
            'secondary': '#ECF0F1',
            'accent': '#E74C3C'
        },
        'is_active': True
    },
]

print("Seeding brands...")
for brand_data in brands_data:
    brand, created = Brand.objects.get_or_create(
        brand_id=brand_data['brand_id'],
        defaults=brand_data
    )
    if created:
        print(f"[OK] Created brand: {brand.brand_name}")
    else:
        print(f"[INFO] Brand already exists: {brand.brand_name}")

print(f"\n[SUCCESS] Total brands in database: {Brand.objects.count()}")
