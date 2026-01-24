
import os
import django
from urllib.parse import urlparse

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import ProductImage

def fix_paths():
    print("--- Fixing Image Paths ---")
    images = ProductImage.objects.all()
    count = 0
    for img in images:
        val = img.image_name
        if not val:
            continue
            
        original = val
        
        # If it contains http/https
        if "http" in val:
            # Try to split by /media/
            if "/media/" in val:
                parts = val.split("/media/")
                if len(parts) > 1:
                    val = parts[1] # Take everything after /media/
            else:
                # Fallback: if it is a full URL but no /media/, assume it's external?
                # But here we know they are uploads.
                # Let's check if it has /uploads/
                if "/uploads/" in val:
                    parts = val.split("/uploads/")
                    val = "uploads/" + parts[1]
        
        # Ensure it doesn't start with /
        if val.startswith("/"):
            val = val.lstrip("/")
            
        if val != original:
            img.image_name = val
            img.save()
            print(f"Fixed: {original} -> {val}")
            count += 1
            
    print(f"\nTotal Images Fixed: {count}")

if __name__ == "__main__":
    fix_paths()
