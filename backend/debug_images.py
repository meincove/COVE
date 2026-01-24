
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductImage

def debug():
    # Find images containing 'http'
    images = ProductImage.objects.filter(image_name__icontains='http')
    print(f"Found {images.count()} images with 'http'")
    
    for img in images:
        print(f"ID: {img.id}")
        print(f"Value: '{img.image_name}'")
        print(f"Repr: {repr(img.image_name)}")
        print(f"StartsWith http? {img.image_name.startswith('http')}")
        print("-" * 20)

if __name__ == "__main__":
    debug()
