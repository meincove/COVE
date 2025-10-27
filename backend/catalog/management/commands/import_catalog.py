import os
import json
from django.core.management.base import BaseCommand
from catalog.models import ProductMasterGroup, ColorGroup, ProductImage, SizeStockPrice
from django.conf import settings


class Command(BaseCommand):
    help = "Import product catalog from catalogData.json"

    def handle(self, *args, **kwargs):
        # Path to catalogData.json in backend
        data_path = os.path.join(settings.BASE_DIR, 'data', 'catalogData.json')
        if not os.path.exists(data_path):
            self.stderr.write(self.style.ERROR(f"File not found: {data_path}"))
            return

        with open(data_path, 'r') as file:
            catalog = json.load(file)

        total_products = 0
        total_variants = 0

        for tier, products in catalog.items():
            for product in products:
                master, created = ProductMasterGroup.objects.get_or_create(
                    product_id=product['id'],
                    defaults={
                        'name': product['name'],
                        'slug': product['slug'],
                        'tier': product['tier'],
                        'type': product['type'],
                        'material': product['material'],
                        'gender': product['gender'],
                        'fit': product['fit'],
                        'description': product['description'],
                        'base_price': product['price'],
                    }
                )

                if created:
                    self.stdout.write(self.style.SUCCESS(f"Created: {master.name}"))

                for color in product['colors']:
                    variant, v_created = ColorGroup.objects.get_or_create(
                        variant_id=color['variantId'],
                        defaults={
                            'product': master,
                            'color_name': color['colorName'],
                            'hex': color['hex'],
                            'slug': color['slug'],
                        }
                    )
                    if v_created:
                        self.stdout.write(f"  └─ Variant: {variant.variant_id}")

                    # Add images
                    for image_name in color['images']:
                        ProductImage.objects.get_or_create(
                            variant=variant,
                            image_name=image_name
                        )

                    # Add size-stock-price
                    for size, qty in product['sizes'].items():
                        SizeStockPrice.objects.get_or_create(
                            variant=variant,
                            size=size,
                            defaults={
                                'quantity': qty,
                                'price': product['price']
                            }
                        )

                total_products += 1
                total_variants += len(product['colors'])

        self.stdout.write(self.style.SUCCESS(f"\n✅ Imported {total_products} products and {total_variants} variants."))
