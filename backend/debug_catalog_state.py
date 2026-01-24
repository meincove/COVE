import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Brand, ProductMasterGroup

def check_catalog():
    print("\n--- Searching for 'Test Price Fix' ---")
    try:
        p = ProductMasterGroup.objects.get(name="Test Price Fix")
        print(f"Product: {p.name}")
        print(f"ID: {p.product_id}")
        print(f"Base Price: {p.base_price}")
        
        variants = p.color_variants.all()
        for v in variants:
            imgs = v.images.all()
            print(f"  Color: {v.color_name}")
            print(f"  Images Count: {imgs.count()}")
            if imgs.exists():
                print(f"  First Image: {imgs.first().image_name}")
            else:
                print("  NO IMAGES FOUND!")
    except ProductMasterGroup.DoesNotExist:
        print("Product 'Test Price Fix' NOT FOUND.")

if __name__ == "__main__":
    check_catalog()
