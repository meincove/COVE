"""
Django management command to load product catalog to Neon DB

Usage:
    python manage.py load_catalog --file data/productVariantsFlat_final.json

This will:
1. Load products, brands, images, sizes to PostgreSQL
2. Clear existing data (optional --append flag)
3. Validate schema compliance
"""

from django.core.management.base import BaseCommand
from django.db import transaction
import json
from catalog.models import ProductMasterGroup, ColorGroup, ProductImage, SizeStockPrice
from pathlib import Path


class Command(BaseCommand):
    help = 'Load product catalog from JSON to Neon DB'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True, help='Catalog JSON file path')
        parser.add_argument('--append', action='store_true', help='Append to existing data (default: clear first)')
        parser.add_argument('--dry-run', action='store_true', help='Validate without saving')

    def handle(self, *args, **options):
        catalog_path = Path(options['file'])
        
        if not catalog_path.exists():
            self.stdout.write(self.style.ERROR(f'File not found: {catalog_path}'))
            return
        
        # Load catalog
        self.stdout.write(f'📂 Loading catalog from {catalog_path}')
        with open(catalog_path) as f:
            products = json.load(f)
        
        self.stdout.write(f'✅ Loaded {len(products)} products')
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN MODE - No changes will be saved'))
            self._validate_products(products)
            return
        
        # Clear existing data
        if not options['append']:
            self.stdout.write('🗑️  Clearing existing products...')
            with transaction.atomic():
                SizeStockPrice.objects.all().delete()
                ProductImage.objects.all().delete()
                ColorGroup.objects.all().delete()
                ProductMasterGroup.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Cleared existing data'))
        
        # Load products
        self.stdout.write('💾 Loading products to database...')
        stats = self._load_products(products)
        
        # Report
        self.stdout.write(self.style.SUCCESS('\n✅ CATALOG LOADED SUCCESSFULLY'))
        self.stdout.write(f'   Product Groups: {stats["groups"]}')
        self.stdout.write(f'   Color Variants: {stats["variants"]}')
        self.stdout.write(f'   Images: {stats["images"]}')
        self.stdout.write(f'   Size/Stock Records: {stats["sizes"]}')
    
    def _validate_products(self, products):
        """Validate product schema"""
        required_fields = [
            'variantId', 'groupId', 'brandId', 'type', 'gender',
            'colorName', 'hex', 'price', 'sizes', 'images'
        ]
        
        errors = []
        for i, product in enumerate(products[:10]):  # Sample check
            for field in required_fields:
                if field not in product:
                    errors.append(f'Product {i}: Missing field "{field}"')
        
        if errors:
            self.stdout.write(self.style.ERROR('❌ Validation failed:'))
            for error in errors[:5]:
                self.stdout.write(f'   - {error}')
        else:
            self.stdout.write(self.style.SUCCESS('✅ Schema validation passed'))
    
    def _load_products(self, products):
        """Load products to database"""
        stats = {"groups": 0, "variants": 0, "images": 0, "sizes": 0}
        
        # Group products by groupId
        grouped = {}
        for product in products:
            group_id = product.get('groupId')
            if group_id not in grouped:
                grouped[group_id] = []
            grouped[group_id].append(product)
        
        # Load each group
        for group_id, variants in grouped.items():
            # Use first variant as master
            master = variants[0]
            
            with transaction.atomic():
                # Create ProductMasterGroup
                # Generate unique slug from product_id to avoid conflicts
                unique_slug = group_id.lower().replace('_', '-')
                
                product_group, created = ProductMasterGroup.objects.update_or_create(
                    product_id=group_id,
                    defaults={
                        'name': master.get('name', 'Product'),
                        'slug': unique_slug,  # Use product_id-based slug for uniqueness
                        'brand_id': master.get('brandId', 'COVE'),  # Add brandId
                        'tier': master.get('tier', 'casual'),
                        'type': master.get('type', 'clothing'),
                        'material': master.get('material', 'Cotton'),
                        'gender': master.get('gender', 'unisex'),
                        'fit': master.get('fit', 'regular'),
                        'description': master.get('description', ''),
                        'base_price': master.get('price', 0)
                    }
                )
                stats["groups"] += 1 if created else 0
                
                # Create ColorGroups (variants)
                for variant in variants:
                    color_variant, created = ColorGroup.objects.update_or_create(
                        variant_id=variant.get('variantId'),
                        defaults={
                            'product': product_group,
                            'color_name': variant.get('colorName', 'black'),
                            'hex': variant.get('hex', '#000000'),
                            'slug': f"{variant.get('variantId', '').lower()}"
                        }
                    )
                    stats["variants"] += 1 if created else 0
                    
                    # Create ProductImages
                    for image_url in variant.get('images', []):
                        ProductImage.objects.get_or_create(
                            variant=color_variant,
                            image_name=image_url
                        )
                        stats["images"] += 1
                    
                    # Create SizeStockPrice
                    for size, quantity in variant.get('sizes', {}).items():
                        SizeStockPrice.objects.update_or_create(
                            variant=color_variant,
                            size=size,
                            defaults={
                                'quantity': quantity,
                                'price': variant.get('price', 0)
                            }
                        )
                        stats["sizes"] += 1
        
        return stats
