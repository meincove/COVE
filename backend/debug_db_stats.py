
import os
import django
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductMasterGroup

def check_stats():
    print(f"--- Database Stats ---")
    total = ProductMasterGroup.objects.count()
    print(f"Total Products: {total}")
    
    # Check types
    types = ProductMasterGroup.objects.values_list('type', flat=True).distinct()
    print(f"\nUnique Types in DB: {list(types)}")
    
    # Check "Jacket" specifically
    jacket_counts = {
        'exact_jacket': ProductMasterGroup.objects.filter(type='jacket').count(),
        'capital_Jacket': ProductMasterGroup.objects.filter(type='Jacket').count(),
        'contains_jacket': ProductMasterGroup.objects.filter(type__icontains='jacket').count()
    }
    print(f"\nJacket Counts: {jacket_counts}")
    
    # Measure Query Time for ALL
    print(f"\nTime to fetch all {total} IDs (DB only)...")
    start = time.time()
    list(ProductMasterGroup.objects.values_list('product_id', flat=True))
    print(f"DB Load Time: {time.time() - start:.4f}s")

    print(f"\n--- Brand Audit ---")
    from catalog.models import Brand
    brands = Brand.objects.all().order_by('-created_at')
    print(f"Total Brands: {brands.count()}")
    for b in brands:
        p_count = ProductMasterGroup.objects.filter(brand_id=b.brand_id).count()
        print(f"- [{b.brand_id}] {b.brand_name} (Active: {b.is_active}) -> {p_count} products")

if __name__ == "__main__":
    check_stats()
