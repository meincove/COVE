"""
Django management command to sync product base_price to vector store metadata.
Updates existing products only - NO DUPLICATES!

Usage:
    python manage.py sync_product_prices
"""

from django.core.management.base import BaseCommand
from django.db import connection
from catalog.models import ProductMasterGroup


class Command(BaseCommand):
    help = 'Sync product base_price to vector store metadata (UPDATE only, no duplicates)'

    def handle(self, *args, **options):
        self.stdout.write("Starting price sync to vector store...")
        
        # Get all products with their base_price
        products = ProductMasterGroup.objects.all()
        total = products.count()
        updated = 0
        errors = 0
        
        self.stdout.write(f"Found {total} products to process...")
        
        with connection.cursor() as cursor:
            for idx, product in enumerate(products, 1):
                try:
                    # Update metadata JSON by adding base_price field
                    # Uses jsonb_set to add/update the price field without removing other fields
                    cursor.execute("""
                        UPDATE ai_core.docs
                        SET meta = jsonb_set(
                            meta,
                            '{base_price}',
                            to_jsonb(%s::numeric),
                            true
                        )
                        WHERE kind = 'product'
                        AND meta->>'slug' = %s
                    """, [str(product.base_price), product.slug])
                    
                    rows_updated = cursor.rowcount
                    updated += rows_updated
                    
                    if idx % 100 == 0:
                        self.stdout.write(f"Processed {idx}/{total} products (updated {updated} records)...")
                    
                    if idx == 1 and rows_updated > 0:
                        self.stdout.write(f"✓ Successfully updated first product: {product.slug} (€{product.base_price})")
                        
                except Exception as e:
                    errors += 1
                    self.stderr.write(f"Error updating {product.slug}: {e}")
        
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Price sync complete!\n"
            f"   Updated: {updated} product records\n"
            f"   Errors: {errors}\n"
            f"   Total products: {total}"
        ))
        
        if errors > 0:
            self.stdout.write(self.style.WARNING(
                f"⚠️  {errors} products had errors - check logs above"
            ))
