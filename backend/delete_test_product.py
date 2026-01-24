import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductMasterGroup

def delete_test_product():
    try:
        p = ProductMasterGroup.objects.get(name="Test Price Fix")
        p.delete()
        print(f"Deleted product: {p.name} ({p.product_id})")
    except ProductMasterGroup.DoesNotExist:
        print("Product not found, nothing to delete.")

if __name__ == "__main__":
    delete_test_product()
