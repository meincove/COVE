"""
Fetch type-appropriate images from Pexels API for all products.

This script:
1. Groups products by type (jacket, sweater, hoodie, etc.)
2. Fetches relevant images from Pexels for each type
3. Assigns unique images to products
4. Updates database with new image URLs

Usage:
    python fetch_product_images.py
"""

import os
import sys
import django
import requests
import time
from collections import defaultdict
from dotenv import load_dotenv
from pathlib import Path

# Load .env file
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductMasterGroup, ProductImage

# Pexels API configuration
PEXELS_API_KEY = os.getenv('PEXEL_API_KEY')  # Note: env var is PEXEL_API_KEY (no S)
PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search'

# Product type to Pexels search query mapping
SEARCH_QUERIES = {
    'hoodie': 'hoodie fashion model',
    'tee': 't-shirt fashion model',
    'sweatshirt': 'sweatshirt fashion',
    'jacket': 'jacket fashion model',
    'pants': 'pants trousers fashion',
    'shorts': 'shorts fashion model',
    'dress': 'dress fashion model',
    'skirt': 'skirt fashion model',
    'sweater': 'sweater fashion model',
    'accessories': 'fashion accessories',
    'sneakers': 'sneakers fashion shoes',
    'boots': 'fashion boots shoes',
    'dress_shoes': 'leather dress shoes men',
    'sandals': 'fashion sandals shoes',
}

def fetch_pexels_images(query, count=50):
    """Fetch images from Pexels for a given query."""
    if not PEXELS_API_KEY:
        print("⚠️  PEXELS_API_KEY not set in environment")
        return []
    
    headers = {'Authorization': PEXELS_API_KEY}
    images = []
    
    # Fetch multiple pages if needed
    page = 1
    while len(images) < count and page <= 5:  # Max 5 pages (250 images)
        params = {
            'query': query,
            'per_page': min(80, count - len(images)),  # Max 80 per page
            'page': page
        }
        
        try:
            response = requests.get(PEXELS_SEARCH_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            for photo in data.get('photos', []):
                # Use medium size for good quality/performance balance
                images.append(photo['src']['medium'])
            
            if len(data.get('photos', [])) == 0:
                break  # No more results
            
            page += 1
            time.sleep(0.5)  # Rate limiting
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching from Pexels: {e}")
            break
    
    return images

def main():
    print("🖼️  Fetching Type-Appropriate Images from Pexels")
    print("=" * 60)
    
    # Group products by type
    products_by_type = defaultdict(list)
    all_products = ProductMasterGroup.objects.all().select_related()
    
    for product in all_products:
        product_type = product.type.lower() if product.type else 'accessories'
        products_by_type[product_type].append(product)
    
    print(f"\n📊 Products grouped by type:")
    for ptype, products in products_by_type.items():
        print(f"   {ptype:15} {len(products):4} products")
    
    print(f"\n🔍 Fetching images from Pexels API...")
    
    # Fetch images for each product type
    type_images = {}
    for ptype, products in products_by_type.items():
        query = SEARCH_QUERIES.get(ptype, f'{ptype} fashion')
        count_needed = len(products)
        
        print(f"\n   Fetching {count_needed} images for '{ptype}' (query: '{query}')...")
        images = fetch_pexels_images(query, count=count_needed)
        type_images[ptype] = images
        print(f"   ✅ Got {len(images)} images")
        
        if len(images) < count_needed:
            print(f"   ⚠️  Only got {len(images)}/{count_needed} images - some will repeat")
    
    print(f"\n💾 Updating database with new images...")
    
    updated_count = 0
    for ptype, products in products_by_type.items():
        images = type_images.get(ptype, [])
        
        if not images:
            print(f"   ⚠️  No images for {ptype}, skipping")
            continue
        
        for idx, product in enumerate(products):
            # Get or create the first color variant's images
            color_variants = product.color_variants.all()
            
            if not color_variants:
                continue
            
            first_variant = color_variants[0]
            
            # Get the image URL for this product (cycle if needed)
            image_url = images[idx % len(images)]
            
            # Update ALL images for this variant to the new URL
            # (products may have multiple images, update them all to same URL for now)
            images_for_variant = ProductImage.objects.filter(variant=first_variant)
            if images_for_variant.exists():
                images_for_variant.update(image_name=image_url)
            else:
                # Create if no images exist
                ProductImage.objects.create(variant=first_variant, image_name=image_url)
            
            updated_count += 1
    
    print(f"\n✅ Updated {updated_count} products with new images")
    print(f"\n🎉 Done! Refresh the frontend to see type-appropriate images.")

if __name__ == '__main__':
    main()
