
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductMasterGroup, Brand

def check_brand(brand_name_query):
    print(f"--- Checking Products for Brand: {brand_name_query} ---")
    brands = Brand.objects.filter(brand_name__icontains=brand_name_query)
    
    if not brands.exists():
        print("No brand found!")
        return

    for b in brands:
        print(f"Brand: {b.brand_name} ({b.brand_id})")
        products = ProductMasterGroup.objects.filter(brand_id=b.brand_id)
        for p in products:
            print(f"  - Product: {p.name}")
            print(f"    Type: '{p.type}'")
            print(f"    Tier: '{p.tier}'")
            print(f"    Status: '{p.status}'")
            print(f"    Category (slug): {p.slug}")
            print("")

if __name__ == "__main__":
    check_brand("Myname")
