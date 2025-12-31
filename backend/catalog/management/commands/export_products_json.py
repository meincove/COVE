"""
Django management command to export products to JSON for AI embeddings.
"""
from django.core.management.base import BaseCommand
from catalog.models import ProductMasterGroup
from catalog.serializers import ProductSerializer
import json
import os

class Command(BaseCommand):
    help = 'Export products for AI embedding generation'
    
    def handle(self, *args, **options):
        self.stdout.write("📦 Fetching products...")
        products = ProductMasterGroup.objects.all().prefetch_related(
            'color_variants', 
            'color_variants__images',
            'color_variants__sizes'
        )
        
        self.stdout.write(f"   Found {products.count()} products")
        
        serializer = ProductSerializer(products, many=True)
        data = serializer.data
        
        output_path = '/tmp/products_export.json'
        with open(output_path, 'w') as f:
            json.dump(data, f)
            
        self.stdout.write(self.style.SUCCESS(f"✅ Exported to {output_path}"))
