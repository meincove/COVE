#!/usr/bin/env python3
"""
Quick script to insert test products for outfit builder testing.
Run from backend directory: python3 insert_test_products.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, '/Users/ssg/Desktop/COVE/backend')
django.setup()

from catalog.models import Product

products = [
    # Blazers
    {'slug': 'navy-blazer-001', 'title': 'Navy Wool Blazer', 'description': 'Professional navy blazer for business meetings', 'category': 'blazer', 'brand': 'LUXLN', 'color': 'Navy', 'price_numeric': 199.00, 'available_sizes': 'S,M,L,XL', 'image_url': '/images/blazer-navy.jpg', 'variant_id': 'BLZ-001'},
    {'slug': 'charcoal-blazer-002', 'title': 'Charcoal Suit Jacket', 'description': 'Modern charcoal suit jacket', 'category': 'blazer', 'brand': 'CRBSC', 'color': 'Charcoal', 'price_numeric': 249.00, 'available_sizes': 'S,M,L,XL', 'image_url': '/images/blazer-charcoal.jpg', 'variant_id': 'BLZ-002'},
    {'slug': 'tan-blazer-003', 'title': 'Tan Cotton Blazer', 'description': 'Smart casual tan blazer', 'category': 'blazer', 'brand': 'FRSPT', 'color': 'Tan', 'price_numeric': 169.00, 'available_sizes': 'S,M,L,XL', 'image_url': '/images/blazer-tan.jpg', 'variant_id': 'BLZ-003'},
    
    # Shirts  
    {'slug': 'white-shirt-001', 'title': 'White Oxford Shirt', 'description': 'Essential white oxford shirt', 'category': 'shirt', 'brand': 'LUXLN', 'color': 'White', 'price_numeric': 79.00, 'available_sizes': 'S,M,L,XL', 'image_url': '/images/shirt-white.jpg', 'variant_id': 'SHT-001'},
    {'slug': 'blue-shirt-002', 'title': 'Light Blue Dress Shirt', 'description': 'Professional light blue shirt', 'category': 'shirt', 'brand': 'CRBSC', 'color': 'Light Blue', 'price_numeric': 69.00, 'available_sizes': 'S,M,L,XL', 'image_url': '/images/shirt-lightblue.jpg', 'variant_id': 'SHT-002'},
    {'slug': 'pink-shirt-003', 'title': 'Pink Slim Fit Shirt', 'description': 'Modern pink slim fit shirt', 'category': 'shirt', 'brand': 'FRSPT', 'color': 'Pink', 'price_numeric': 75.00, 'available_sizes': 'S,M,L,XL', 'image_url': '/images/shirt-pink.jpg', 'variant_id': 'SHT-003'},
    
    # Pants
    {'slug': 'navy-pants-001', 'title': 'Navy Chinos', 'description': 'Classic navy chinos', 'category': 'pants', 'brand': 'CRBSC', 'color': 'Navy', 'price_numeric': 89.00, 'available_sizes': '28,30,32,34,36', 'image_url': '/images/pants-navy.jpg', 'variant_id': 'PNT-001'},
    {'slug': 'khaki-pants-002', 'title': 'Khaki Chinos', 'description': 'Versatile khaki chinos', 'category': 'pants', 'brand': 'FRSPT', 'color': 'Khaki', 'price_numeric': 79.00, 'available_sizes': '28,30,32,34,36', 'image_url': '/images/pants-khaki.jpg', 'variant_id': 'PNT-002'},
    {'slug': 'charcoal-pants-003', 'title': 'Charcoal Dress Pants', 'description': 'Professional charcoal dress pants', 'category': 'pants', 'brand': 'LUXLN', 'color': 'Charcoal', 'price_numeric': 99.00, 'available_sizes': '28,30,32,34,36', 'image_url': '/images/pants-charcoal.jpg', 'variant_id': 'PNT-003'},
    
    # Shoes
    {'slug': 'black-shoes-001', 'title': 'Black Oxford Shoes', 'description': 'Classic black oxford dress shoes', 'category': 'shoes', 'brand': 'LUXLN', 'color': 'Black', 'price_numeric': 149.00, 'available_sizes': '7,8,9,10,11,12', 'image_url': '/images/shoes-black.jpg', 'variant_id': 'SHO-001'},
    {'slug': 'brown-shoes-002', 'title': 'Brown Derby Shoes', 'description': 'Versatile brown leather shoes', 'category': 'shoes', 'brand': 'CRBSC', 'color': 'Brown', 'price_numeric': 139.00, 'available_sizes': '7,8,9,10,11,12', 'image_url': '/images/shoes-brown.jpg', 'variant_id': 'SHO-002'},
    {'slug': 'tan-shoes-003', 'title': 'Tan Suede Loafers', 'description': 'Smart casual tan suede loafers', 'category': 'shoes', 'brand': 'FRSPT', 'color': 'Tan', 'price_numeric': 129.00, 'available_sizes': '7,8,9,10,11,12', 'image_url': '/images/shoes-tan.jpg', 'variant_id': 'SHO-003'},
]

print("🚀 Inserting test products for Outfit Builder...")
print("=" * 60)

created = 0
updated = 0

for product_data in products:
    product, was_created = Product.objects.update_or_create(
        slug=product_data['slug'],
        defaults=product_data
    )
    if was_created:
        created += 1
        print(f"  ✓ Created: {product.title}")
    else:
        updated += 1
        print(f"  ↻ Updated: {product.title}")

print("\n" + "=" * 60)
print(f"✅ SUCCESS! {created} created, {updated} updated")
print(f"\n📦 Database Status:")
print(f"   Total Products: {Product.objects.count()}")
print(f"   Blazers: {Product.objects.filter(category='blazer').count()}")
print(f"   Shirts: {Product.objects.filter(category='shirt').count()}")
print(f"   Pants: {Product.objects.filter(category='pants').count()}")
print(f"   Shoes: {Product.objects.filter(category='shoes').count()}")

print(f"\n🎯 Complete Outfit Combinations:")
print(f"   • Business: Navy Blazer + White Shirt + Charcoal Pants + Black Shoes (€516)")
print(f"   • Smart Casual: Tan Blazer + Blue Shirt + Navy Chinos + Brown Shoes (€486)")
print(f"   • Date Night: Charcoal Blazer + Pink Shirt + Khaki Pants + Tan Loafers (€532)")

print(f"\n✅ Ready to test! Click 'Build Outfit' in your app!")
