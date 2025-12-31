"""
Django management command to import products from productVariantsFlat_v2.json
Adds outfit builder metadata fields during import.
"""
from django.core.management.base import BaseCommand
from catalog.models import ProductMasterGroup, ColorGroup, SizeStockPrice
import json
from decimal import Decimal
from pathlib import Path


class Command(BaseCommand):
    help = 'Import products from productVariantsFlat_v2.json with outfit builder metadata'
    
    # Formality score mapping
    FORMALITY_MAP = {
        "casual": 3,
        "smart_casual": 6,
        "formal": 9,
        "athletic": 2
    }
    
    # Versatility mapping by type
    VERSATILITY_MAP = {
        "tee": 10,
        "hoodie": 7,
        "sweatshirt": 7,
        "sweater": 8,
        "jacket": 6,
        "pants": 8,
        "shorts": 6,
        "dress": 5,
        "skirt": 5,
        "accessories": 9
    }
    
    def handle(self, *args, **options):
        # ✨ PHASE 6: Use rich dataset with images
        json_path = Path(__file__).parent.parent.parent.parent / 'data' / 'productVariantsFlat_with_images.json'
        
        self.stdout.write(f"Loading products from {json_path}...")
        
        with open(json_path, 'r') as f:
            products = json.load(f)
        
        self.stdout.write(f"Found {len(products)} products to import")
        
        imported = 0
        errors = 0
        
        for idx, product_data in enumerate(products, 1):
            try:
                self.import_product(product_data)
                imported += 1
                if idx % 100 == 0:
                    self.stdout.write(f"Imported {idx}/{len(products)}...")
            except Exception as e:
                errors += 1
                if errors < 10:  # Only show first 10 errors
                    self.stdout.write(self.style.ERROR(f"Error importing {product_data.get('variantId')}: {e}"))
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ Import complete!"))
        self.stdout.write(f"Imported: {imported}")
        self.stdout.write(f"Errors: {errors}")
        self.stdout.write(f"Total in database: {ProductMasterGroup.objects.count()}")
    
    def import_product(self, data):
        """Import a single product variant."""
        group_id = data['groupId']
        
        # Create or get product master group
        product, created = ProductMasterGroup.objects.get_or_create(
            product_id=group_id,
            defaults={
                'name': data.get('name', 'Product'),
                'slug': data.get('groupSlug', group_id.lower()),
                'brand_id': data.get('brandId', 'COVE'),
                'tier': data.get('tier', 'casual'),
                'type': data.get('type', 'tee'),
                'material': data.get('material', 'Cotton'),
                'gender': data.get('gender', 'unisex'),
                'fit': data.get('fit', 'regular'),
                'description': data.get('description', ''),
                'base_price': Decimal(str(data.get('price', 29.99))),
                # Outfit builder fields
                'style_tags': data.get('style', {}).get('styleTags', []),
                'pattern': data.get('style', {}).get('pattern', 'solid'),
                'season': self.infer_season(data),
                'use_cases': data.get('style', {}).get('useCases', []),
                'formality_score': self.FORMALITY_MAP.get(data.get('tier', 'casual'), 5),
                'versatility': self.VERSATILITY_MAP.get(data.get('type', 'tee'), 5),
                'statement_piece': False,
                'color_family': self.infer_color_family(data.get('colorName', 'neutral')),
                'in_stock': data.get('status') == 'active',
                'featured': False
            }
        )
        
        # Create color variant
        variant, _ = ColorGroup.objects.get_or_create(
            variant_id=data['variantId'],
            defaults={
                'product': product,
                'color_name': data.get('colorName', 'default'),
                'hex': data.get('hex', '#000000'),
                'slug': f"{product.slug}-{data.get('colorName', 'default').replace(' ', '-')}"
            }
        )
        
        # Create size/stock/price entries
        sizes_data = data.get('sizes', {})
        for size, quantity in sizes_data.items():
            SizeStockPrice.objects.get_or_create(
                variant=variant,
                size=size,
                defaults={
                    'quantity': quantity,
                    'price': Decimal(str(data.get('price', 29.99)))
                }
            )
    
    def infer_season(self, data):
        """Infer seasons from fabric warmth."""
        warmth = data.get('fabric', {}).get('warmth', 'all-season')
        
        if warmth == 'winter':
            return ['fall', 'winter']
        elif warmth == 'warm-weather':
            return ['spring', 'summer']
        elif warmth == 'cold-weather':
            return ['fall', 'winter', 'spring']
        else:
            return ['spring', 'summer', 'fall', 'winter']
    
    def infer_color_family(self, color_name):
        """Infer color family from color name."""
        color_lower = color_name.lower()
        
        if any(c in color_lower for c in ['black', 'white', 'grey', 'gray', 'navy', 'beige', 'sand', 'stone']):
            return 'neutral'
        elif any(c in color_lower for c in ['red', 'orange', 'yellow', 'burgundy', 'rust']):
            return 'warm'
        elif any(c in color_lower for c in ['blue', 'green', 'teal', 'cyan']):
            return 'cool'
        else:
            return 'bold'
