#!/usr/bin/env python3
"""Quick test script to verify catalog API"""
import requests
import json

# Test 1: Total count
print("=" * 60)
print("TEST 1: Total Product Count")
print("=" * 60)
response = requests.get("http://localhost:8001/api/products/")
data = response.json()
print(f"✅ Total Products: {data['count']}")
print(f"✅ Expected: 1933")
print(f"✅ Match: {data['count'] == 1933}\n")

# Test 2: Sample product
print("=" * 60)
print("TEST 2: Sample Product Data")
print("=" * 60)
sample = data['results'][0]
print(f"Name: {sample.get('name', 'N/A')}")
print(f"Brand ID: {sample.get('brand_id', 'N/A')}")
print(f"Type: {sample.get('type', 'N/A')}")
print(f"Gender: {sample.get('gender', 'N/A')}")
print(f"Price: €{sample.get('base_price', 0)}")
print(f"Variants: {len(sample.get('color_variants', []))}\n")

# Test 3: Images
print("=" * 60)
print("TEST 3: Product Images")
print("=" * 60)
variants = sample.get('color_variants', [])
if variants:
    first_variant = variants[0]
    images = first_variant.get('images', [])
    print(f"Images in first variant: {len(images)}")
    if images:
        print(f"Sample image URLs:")
        for img in images[:3]:
            print(f"  - {img.get('image_name', 'N/A')[:80]}")
else:
    print("❌ No variants found")

print("\n" + "=" * 60)
print("TEST 4: Brand Filtering")
print("=" * 60)
brand_response = requests.get("http://localhost:8001/api/products/?brandId=COVE&page_size=5")
brand_data = brand_response.json()
print(f"COVE products found: {brand_data.get('count', 0)}")
if brand_data.get('results'):
    print("Sample COVE products:")
    for p in brand_data['results'][:3]:
        print(f"  - {p.get('name', 'N/A')} (€{p.get('base_price', 0)})")

print("\n✅ All tests complete!")
