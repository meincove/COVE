
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductMasterGroup

def normalize_types():
    print("--- Normalizing Product Types to Lowercase ---")
    products = ProductMasterGroup.objects.all()
    count = 0
    for p in products:
        if p.type and p.type != p.type.lower():
            old_type = p.type
            p.type = p.type.lower()
            
            # Map specific overrides if needed
            if p.type == 't-shirt': p.type = 'tee' 
            
            p.save()
            print(f"Updated: {p.name} ({old_type} -> {p.type})")
            count += 1
            
    print(f"\nTotal Products Updated: {count}")

if __name__ == "__main__":
    normalize_types()
