"""
Django management command to add product images from productVariantsFlat_with_images.json
"""
from django.core.management.base import BaseCommand
from catalog.models import ColorGroup, ProductImage
import json
from pathlib import Path


class Command(BaseCommand):
    help = 'Import product images from productVariantsFlat_with_images.json'
    
    def handle(self, *args, **options):
        # Path to data folder
        json_path = Path(__file__).resolve().parent.parent.parent.parent / 'data' / 'productVariantsFlat_with_images.json'
        
        self.stdout.write(f"Loading images from {json_path}...")
        
        if not json_path.exists():
            self.stdout.write(self.style.ERROR(f"File not found: {json_path}"))
            return

        with open(json_path, 'r') as f:
            products = json.load(f)
        
        self.stdout.write(f"Found {len(products)} products in JSON")
        
        added = 0
        skipped = 0
        errors = 0
        
        for product_data in products:
            variant_id = product_data.get('variantId')
            images = product_data.get('images', [])
            
            if not images:
                skipped += 1
                continue
            
            try:
                # We need to find the variant. The JSON has 'variantId' like 'CCH001'.
                # Our import script created variants with IDs like 'CCH001' (from JSON import) 
                # or 'G-TYPE-001-COL' (from generation).
                # The products in this JSON correspond to the 'imported' products.
                
                variant = ColorGroup.objects.get(variant_id=variant_id)
                
                # Add each image
                for image_url in images:
                    _, created = ProductImage.objects.get_or_create(
                        variant=variant,
                        image_name=image_url
                    )
                    if created:
                        added += 1
                
            except ColorGroup.DoesNotExist:
                # Try finding by looking up via Product? 
                # The import script used variant_id=data['variantId'] directly.
                # So it should match if the product exists.
                errors += 1
                if errors < 5:
                    self.stdout.write(self.style.WARNING(f"Variant not found: {variant_id}"))
            except Exception as e:
                errors += 1
                if errors < 5:
                    self.stdout.write(self.style.ERROR(f"Error for {variant_id}: {e}"))
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ Import complete!"))
        self.stdout.write(f"Images added: {added}")
        self.stdout.write(f"Skipped JSON items (no images): {skipped}")
        
        # Show stats
        total_variants = ColorGroup.objects.count()
        variants_with_images = ColorGroup.objects.filter(images__isnull=False).distinct().count()
        
        self.stdout.write(f"\nTotal system variants: {total_variants}")
        self.stdout.write(f"Variants with images: {variants_with_images}")
        self.stdout.write(f"Coverage: {variants_with_images/total_variants*100:.1f}%")
