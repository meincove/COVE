#!/usr/bin/env python3
"""
Add professional wear and budget-friendly items to COVE catalog.
Addresses gaps found in outfit builder stress tests.
"""

import os
import django
import sys

# Setup Django
sys.path.insert(0, '/Users/ssg/Desktop/COVE/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductMasterGroup, ColorGroup, SizeStockPrice, ProductImage
from django.db import transaction

# Professional wear products (business casual, formal)
PROFESSIONAL_PRODUCTS = [
    # Blazers (professional tops)
    {"name": "Executive Blazer Navy", "type": "blazer", "base_price": 89.99, "tier": "premium"},
    {"name": "Classic Blazer Charcoal", "type": "blazer", "base_price": 79.99, "tier": "premium"},
    {"name": "Slim Fit Blazer Black", "type": "blazer", "base_price": 95.00, "tier": "luxe"},
    
    # Dress shirts (professional tops)
    {"name": "Oxford Dress Shirt White", "type": "tee", "base_price": 39.99, "tier": "basic"},
    {"name": "Fitted Dress Shirt Blue", "type": "tee", "base_price": 44.99, "tier": "basic"},
    
    # Dress pants (professional bottoms)
    {"name": "Tailored Dress Pants Navy", "type": "pants", "base_price": 65.00, "tier": "premium"},
    {"name": "Slim Dress Pants Charcoal", "type": "pants", "base_price": 69.99, "tier": "premium"},
    {"name": "Classic Dress Pants Black", "type": "pants", "base_price": 59.99, "tier": "basic"},
    
    # Pencil skirts (professional bottoms)
    {"name": "Pencil Skirt Black", "type": "skirt", "base_price": 49.99, "tier": "basic"},
    {"name": "Pencil Skirt Navy", "type": "skirt", "base_price": 54.99, "tier": "basic"},
]

# Budget-friendly items (<€20)
BUDGET_PRODUCTS = [
    # Budget tops
    {"name": "Basic Cotton Tee White", "type": "tee", "base_price": 12.99, "tier": "basic"},
    {"name": "Basic Cotton Tee Black", "type": "tee", "base_price": 12.99, "tier": "basic"},
    {"name": "Everyday Hoodie Grey", "type": "hoodie", "base_price": 19.99, "tier": "basic"},
    {"name": "Simple Sweater Navy", "type": "sweater", "base_price": 18.99, "tier": "basic"},
    
    # Budget bottoms
    {"name": "Budget Chino Pants Tan", "type": "pants", "base_price": 19.99, "tier": "basic"},
    {"name": "Budget Chino Pants Navy", "type": "pants", "base_price": 19.99, "tier": "basic"},
    {"name": "Cotton Shorts Khaki", "type": "shorts", "base_price": 14.99, "tier": "basic"},
    {"name": "Casual Shorts Black", "type": "shorts", "base_price": 14.99, "tier": "basic"},
]

def generate_product_id(name: str, count: int) -> str:
    """Generate unique product ID"""
    clean_name = name.lower().replace(' ', '-')[:30]
    return f"pg-{clean_name}-{count}"

def generate_slug(product_id: str) -> str:
    """Generate slug from product ID"""
    return product_id

@transaction.atomic
def add_products(products: list, category: str):
    """Add products to database"""
    added = 0
    skipped = 0
    
    # Get starting count for IDs
    existing_count = ProductMasterGroup.objects.count()
    
    for idx, product_data in enumerate(products):
        count = existing_count + idx + 1
        product_id = generate_product_id(product_data['name'], count)
        slug = generate_slug(product_id)
        
        # Check if exists
        if ProductMasterGroup.objects.filter(product_id=product_id).exists():
            print(f"  ⏭️  Skipped: {product_data['name']} (already exists)")
            skipped += 1
            continue
        
        # Create product
        product = ProductMasterGroup.objects.create(
            product_id=product_id,
            name=product_data['name'],
            slug=slug,
            type=product_data['type'],
            base_price=product_data['base_price'],
            tier=product_data['tier'],
            material="Cotton blend",
            gender="unisex",
            fit="regular",
            description=f"{product_data['name']} - {category}"
        )
        
        # Create default color variant
        variant = ColorGroup.objects.create(
            variant_id=f"{product_id}-variant-1",
            product=product,
            color_name="default",
            hex="#808080",  # Gray default
            slug=f"{slug}-default"
        )
        
        # Create sizes with stock
        sizes = ['S', 'M', 'L', 'XL']
        for size in sizes:
            SizeStockPrice.objects.create(
                variant=variant,
                size=size,
                quantity=50,  # Good stock
                price=product_data['base_price']
            )
        
        # Create placeholder image
        ProductImage.objects.create(
            variant=variant,
            image_name=f"https://via.placeholder.com/400x600?text={product_data['name'].replace(' ', '+')}"
        )
        
        print(f"  ✅ Added: {product_data['name']} (€{product_data['base_price']})")
        added += 1
    
    return added, skipped

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🏪 COVE CATALOG ENHANCEMENT")
    print("="*60)
    
    # Add professional wear
    print("\n📊 Adding Professional Wear...")
    prof_added, prof_skipped = add_products(PROFESSIONAL_PRODUCTS, "Professional")
    
    # Add budget items
    print("\n💰 Adding Budget-Friendly Items...")
    budget_added, budget_skipped = add_products(BUDGET_PRODUCTS, "Budget-Friendly")
    
    # Summary
    print("\n" + "="*60)
    print("📈 SUMMARY")
    print("="*60)
    print(f"✅ Professional wear added: {prof_added}")
    print(f"✅ Budget items added: {budget_added}")
    print(f"⏭️  Total skipped: {prof_skipped + budget_skipped}")
    print(f"📦 Total new products: {prof_added + budget_added}")
    print()
    
    # Show catalog stats
    total_products = ProductMasterGroup.objects.count()
    by_type = {}
    for product in ProductMasterGroup.objects.all():
        by_type[product.type] = by_type.get(product.type, 0) + 1
    
    print("📊 CATALOG STATISTICS")
    print("="*60)
    print(f"Total products: {total_products}")
    for ptype, count in sorted(by_type.items()):
        print(f"  {ptype:12}: {count}")
    print()
