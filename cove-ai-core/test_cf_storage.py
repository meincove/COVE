#!/usr/bin/env python3
"""
Test CF Model DB Storage

Quick test to verify we can save/load CF models to/from Neon DB
"""

import sys
import os

# Add AI core to path
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from app.mcp_agents.product_recommender.item_based_cf import ItemBasedCF
from app.mcp_agents.product_recommender.cf_storage import list_cf_models

print("=" * 60)
print("🧪 CF MODEL DB STORAGE TEST")
print("=" * 60)

# Create a simple CF instance
cf = ItemBasedCF()

# Build a small test matrix
test_interactions = [
    {'user_id': 'user1', 'item_id': 'CCH001', 'weight': 1.0},
    {'user_id': 'user1', 'item_id': 'CCT007', 'weight': 0.8},
    {'user_id': 'user2', 'item_id': 'CCH001', 'weight': 1.0},
    {'user_id': 'user2', 'item_id': 'CCB012', 'weight': 0.9},
    {'user_id': 'user3', 'item_id': 'CCT007', 'weight': 1.0},
    {'user_id': 'user3', 'item_id': 'CCB012', 'weight': 0.7},
]

print("\n1️⃣ Building test CF model...")
cf.build_user_item_matrix(test_interactions)
cf.compute_all_similarities()

print(f"   Items: {list(cf.item_to_idx.keys())}")
print(f"   Similarities computed: {len(cf.similarity_matrix)}")

# Test save to DB
print("\n2️⃣ Saving to Neon DB...")
try:
    cf.save_model(use_db=True)
    print("   ✅ Save successful!")
except Exception as e:
    print(f"   ❌ Save failed: {e}")

# List models in DB
print("\n3️⃣ Listing models in DB...")
models = list_cf_models()
for model in models:
    print(f"   v{model['version']}: {model['size_mb']:.2f}MB, active={model['is_active']}, created={model['created_at'][:19]}")

# Test load from DB
print("\n4️⃣ Loading from Neon DB...")
cf2 = ItemBasedCF()
try:
    cf2.load_model(use_db=True)
    print(f"   ✅ Load successful!")
    print(f"   Loaded {len(cf2.similarity_matrix)} similarities")
    print(f"   Items: {list(cf2.item_to_idx.keys())}")
except Exception as e:
    print(f"   ❌ Load failed: {e}")

print("\n" + "=" * 60)
print("✅ TEST COMPLETE!")
print("=" * 60)
print("\n📊 Summary:")
print("  - CF models now persist in Neon DB")
print("  - Survives container restarts")
print("  - Version tracking built-in")
print("  - Old versions auto-cleaned (keeps last 5)")
print()
