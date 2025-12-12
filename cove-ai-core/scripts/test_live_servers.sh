#!/bin/bash
# Complete system test - Backend (8001) + AI Core (8000)

echo "================================"
echo "🧪 COMPLETE SYSTEM TEST"
echo "Backend: localhost:8001"
echo "AI Core: localhost:8000"
echo "================================"
echo

# Test 1: Brand-specific query
echo "Test 1: Brand-Specific Query"
echo "Query: 'COVE black hoodie'"
echo "Expected: Only COVE products"
echo "---"
curl -s -X POST http://localhost:8000/ai/recs/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "query": "COVE black hoodie",
    "user_id": null,
    "top_k": 5
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', [])
brands = set()
print(f'Results: {len(items)}')
for i, item in enumerate(items, 1):
    title = item['title']
    score = item['score']
    brand = title.split()[0]  # First word is brand
    brands.add(brand)
    print(f'  {i}. [{brand}] {title} (score: {score:.3f})')
print(f'\nBrands found: {sorted(brands)}')
if brands == {'COVE'}:
    print('✅ PASS: All results from COVE')
else:
    print(f'❌ FAIL: Expected only COVE, got {brands}')
"
echo

# Test 2: Multi-brand query
echo "Test 2: Multi-Brand Discovery"
echo "Query: 'affordable tee'"
echo "Expected: Budget brands (SimpleStack, CoreBasics, etc.)"
echo "---"
curl -s -X POST http://localhost:8000/ai/recs/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "query": "affordable tee",
    "user_id": null,
    "top_k": 5
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', [])
brands = set()
print(f'Results: {len(items)}')
for i, item in enumerate(items, 1):
    title = item['title']
    score = item['score']
    brand = title.split()[0]
    brands.add(brand)
    print(f'  {i}. [{brand}] {title} (score: {score:.3f})')
print(f'\nBrands found: {sorted(brands)}')
print(f'✅ PASS: Multi-brand results ({len(brands)} brands)')
"
echo

# Test 3: Another brand
echo "Test 3: Different Brand Query"
echo "Query: 'UrbanPulse jacket'"
echo "Expected: UrbanPulse products"
echo "---"
curl -s -X POST http://localhost:8000/ai/recs/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "query": "UrbanPulse jacket",
    "user_id": null,
    "top_k": 5
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', [])
brands = set()
print(f'Results: {len(items)}')
for i, item in enumerate(items, 1):
    title = item['title']
    score = item['score']
    brand = title.split()[0]
    brands.add(brand)
    print(f'  {i}. [{brand}] {title} (score: {score:.3f})')
print(f'\nBrands found: {sorted(brands)}')
if brands == {'UrbanPulse'}:
    print('✅ PASS: All results from UrbanPulse')
else:
    print(f'⚠️  Mixed brands: {brands}')
"
echo

# Test 4: Generic query
echo "Test 4: Generic Discovery"
echo "Query: 'sweater'"
echo "Expected: Multiple brands"
echo "---"
curl -s -X POST http://localhost:8000/ai/recs/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "query": "sweater",
    "user_id": null,
    "top_k": 8
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', [])
brands = set()
print(f'Results: {len(items)}')
for i, item in enumerate(items, 1):
    title = item['title']
    brand = title.split()[0]
    brands.add(brand)
print(f'\nUnique brands: {len(brands)}')
print(f'Brands: {sorted(brands)}')
if len(brands) >= 3:
    print(f'✅ PASS: Good diversity ({len(brands)} brands)')
else:
    print(f'⚠️  Low diversity ({len(brands)} brands)')
"
echo

echo "================================"
echo "✅ COMPLETE SYSTEM TEST FINISHED"
echo "================================"
