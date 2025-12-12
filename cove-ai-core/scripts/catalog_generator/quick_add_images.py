#!/usr/bin/env python3
"""
Quick Image URL Mapper - No API Calls Required

Maps product types/genders to curated Pexels fashion photo URLs
Much faster than API calls (~instant vs 32 minutes)

Usage:
    python quick_add_images.py --catalog productVariantsFlat_v2.json --output productVariantsFlat_final.json
"""

import json
import random
from pathlib import Path
import argparse

# Curated high-quality fashion photos from Pexels (Creative Commons)
# These are pre-selected professional product photos
FASHION_IMAGES = {
    "hoodie": {
        "female": [
            "https://images.pexels.com/photos/7679454/pexels-photo-7679454.jpeg",
            "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg",
            "https://images.pexels.com/photos/2560894/pexels-photo-2560894.jpeg"
        ],
        "male": [
            "https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg",
            "https://images.pexels.com/photos/842811/pexels-photo-842811.jpeg",
            "https://images.pexels.com/photos/1152994/pexels-photo-1152994.jpeg"
        ],
        "unisex": [
            "https://images.pexels.com/photos/1040424/pexels-photo-1040424.jpeg",
            "https://images.pexels.com/photos/45987/pexels-photo-45987.jpeg",
            "https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg"
        ]
    },
    "tee": {
        "female": [
            "https://images.pexels.com/photos/914668/pexels-photo-914668.jpeg",
            "https://images.pexels.com/photos/8346234/pexels-photo-8346234.jpeg",
            "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg"
        ],
        "male": [
            "https://images.pexels.com/photos/1192335/pexels-photo-1192335.jpeg",
            "https://images.pexels.com/photos/2897531/pexels-photo-2897531.jpeg",
            "https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg"
        ],
        "unisex": [
            "https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg",
            "https://images.pexels.com/photos/839465/pexels-photo-839465.jpeg",
            "https://images.pexels.com/photos/2690200/pexels-photo-2690200.jpeg"
        ]
    },
    "jacket": {
        "female": [
            "https://images.pexels.com/photos/7676478/pexels-photo-7676478.jpeg",
            "https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg",
            "https://images.pexels.com/photos/794062/pexels-photo-794062.jpeg"
        ],
        "male": [
            "https://images.pexels.com/photos/2802943/pexels-photo-2802943.jpeg",
            "https://images.pexels.com/photos/3732896/pexels-photo-3732896.jpeg",
            "https://images.pexels.com/photos/1460838/pexels-photo-1460838.jpeg"
        ],
        "unisex": [
            "https://images.pexels.com/photos/167703/pexels-photo-167703.jpeg",
            "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg",
            "https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg"
        ]
    },
    "pants": {
        "female": [
            "https://images.pexels.com/photos/1895943/pexels-photo-1895943.jpeg",
            "https://images.pexels.com/photos/7679420/pexels-photo-7679420.jpeg",
            "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg"
        ],
        "male": [
            "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg",
            "https://images.pexels.com/photos/1445302/pexels-photo-1445302.jpeg",
            "https://images.pexels.com/photos/1234553/pexels-photo-1234553.jpeg"
        ],
        "unisex": [
            "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg",
            "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg",
            "https://images.pexels.com/photos/1234553/pexels-photo-1234553.jpeg"
        ]
    },
    "dress": {
        "female": [
            "https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg",
            "https://images.pexels.com/photos/7679661/pexels-photo-7679661.jpeg",
            "https://images.pexels.com/photos/1488688/pexels-photo-1488688.jpeg"
        ],
        "male": [],
        "unisex": []
    },
    "skirt": {
        "female": [
            "https://images.pexels.com/photos/794062/pexels-photo-794062.jpeg",
            "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg",
            "https://images.pexels.com/photos/247322/pexels-photo-247322.jpeg"
        ],
        "male": [],
        "unisex": []
    },
    "shorts": {
        "female": [
            "https://images.pexels.com/photos/2690200/pexels-photo-2690200.jpeg",
            "https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg"
        ],
        "male": [
            "https://images.pexels.com/photos/1983046/pexels-photo-1983046.jpeg",
            "https://images.pexels.com/photos/1445302/pexels-photo-1445302.jpeg"
        ],
        "unisex": [
            "https://images.pexels.com/photos/1983046/pexels-photo-1983046.jpeg",
            "https://images.pexels.com/photos/1445302/pexels-photo-1445302.jpeg"
        ]
    },
    "sweatshirt": {
        "female": [
            "https://images.pexels.com/photos/2560894/pexels-photo-2560894.jpeg",
            "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg"
        ],
        "male": [
            "https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg",
            "https://images.pexels.com/photos/842811/pexels-photo-842811.jpeg"
        ],
        "unisex": [
            "https://images.pexels.com/photos/1040424/pexels-photo-1040424.jpeg",
            "https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg"
        ]
    },
    "sweater": {
        "female": [
            "https://images.pexels.com/photos/1488688/pexels-photo-1488688.jpeg",
            "https://images.pexels.com/photos/914668/pexels-photo-914668.jpeg"
        ],
        "male": [
            "https://images.pexels.com/photos/1192335/pexels-photo-1192335.jpeg",
            "https://images.pexels.com/photos/842811/pexels-photo-842811.jpeg"
        ],
        "unisex": [
            "https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg",
            "https://images.pexels.com/photos/839465/pexels-photo-839465.jpeg"
        ]
    },
    "accessories": {
        "female": [
            "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg"
        ],
        "male": [
            "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg"
        ],
        "unisex": [
            "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg"
        ]
    }
}

def get_images_for_product(product_type: str, gender: str) -> list:
    """Get image URLs for product type and gender"""
    images = FASHION_IMAGES.get(product_type, {}).get(gender, [])
    
    if not images:
        # Fallback to unisex if gender-specific not available
        images = FASHION_IMAGES.get(product_type, {}).get("unisex", [])
    
    if not images:
        # Ultimate fallback
        images = [
            f"https://via.placeholder.com/800x1000/000000/FFFFFF?text={product_type.title()}"
        ]
    
    # Return 3 images (cycle if less available)
    while len(images) < 3:
        images.append(images[0] if images else images[0])
    
    return images[:3]


def main():
    parser = argparse.ArgumentParser(description='Quick add images to catalog')
    parser.add_argument('--catalog', required=True, help='Input catalog JSON')
    parser.add_argument('--output', required=True, help='Output catalog JSON')
    args = parser.parse_args()
    
    catalog_path = Path(args.catalog)
    output_path = Path(args.output)
    
    # Load catalog
    print(f"📂 Loading catalog from {catalog_path}")
    with open(catalog_path) as f:
        products = json.load(f)
    
    print(f"✅ Loaded {len(products)} products")
    
    # Add images
    print("🎨 Adding curated fashion images...")
    for product in products:
        product_type = product.get("type", "tee")
        gender = product.get("gender", "unisex")
        product["images"] = get_images_for_product(product_type, gender)
    
    # Save
    print(f"💾 Saving to {output_path}")
    with open(output_path, 'w') as f:
        json.dump(products, f, indent=2)
    
    print(f"\n✅ COMPLETE: {len(products)} products with images")
    print(f"   Output: {output_path}")
    print(f"\n🚀 Next: Load to database")
    print(f"   python manage.py load_catalog --file {output_path}")


if __name__ == "__main__":
    main()
