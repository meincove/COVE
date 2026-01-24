
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductImage

def clean():
    print("--- Cleaning Corrupted Image Paths ---")
    bad_images = ProductImage.objects.filter(image_name__icontains='http://127.0.0.1:8001/media/')
    
    count = 0
    for img in bad_images:
        val = img.image_name
        # Keep stripping headers until we get a clean path
        # Pattern to strip: http://127.0.0.1:8001/media/
        
        original = val
        while "http://127.0.0.1:8001/media/" in val:
            val = val.replace("http://127.0.0.1:8001/media/", "")
            
        # Also clean double uploads
        if "uploads/uploads/" in val:
            val = val.replace("uploads/uploads/", "uploads/")

        if val != original:
            img.image_name = val
            img.save()
            print(f"cleaned: ...{original[-30:]} -> {val}")
            count += 1
            
    print(f"Fixed {count} corrupted images.")

if __name__ == "__main__":
    clean()
