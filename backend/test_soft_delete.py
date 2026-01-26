import requests
import sys

API_BASE = "http://localhost:8000/api"
BRAND_ID = "COVE"

def run_test():
    print("--- Testing Soft Delete Flow ---")
    
    # 1. Create Product
    print("\n1. Creating Product...")
    create_url = f"{API_BASE}/brands/{BRAND_ID}/products/"
    payload = {
        "product_name": "Delete Me Product",
        "product_type": "T-Shirt",
        "gender": "unisex",
        "description": "To be deleted",
        "colors": [
            {
                "color_name": "Red",
                "hex_code": "#FF0000",
                "sizes": [{"size_label": "M", "stock_quantity": 10, "base_price": "20.00"}],
                "images": [{"image_url": "http://test.com/img.jpg", "display_order": 1, "is_primary": True}]
            }
        ]
    }
    
    res = requests.post(create_url, json=payload)
    if res.status_code != 201:
        print(f"FAILED: Create {res.status_code} {res.text}")
        return
    
    data = res.json()
    product_id = data['product_id']
    print(f"CREATED: {product_id}")
    
    # 2. Verify in Main List (Active)
    print("\n2. Checking Main List (Active)...")
    res = requests.get(f"{API_BASE}/brands/{BRAND_ID}/products/")
    products = res.json().get('products', [])
    found = any(p['product_id'] == product_id for p in products)
    print(f"Found in active list: {found}")
    if not found:
        print("FAILED: Product not found in active list initially")
        return

    # 3. Soft Delete
    print(f"\n3. Soft Deleting {product_id}...")
    res = requests.delete(f"{API_BASE}/brands/{BRAND_ID}/products/{product_id}/") # Note: assuming delete endpoint is mapped without /restore/ etc. wait... views_product.py has BrandProductDetailView? GET only?
    
    # Ah, wait. I implemented `delete` method in `BrandProductDetailView`?
    # Let me check my memory/file. I added `delete` to `BrandProductDetailView`? Or CreateView?
    # I added it to a view... I should verify WHICH view class I modified.
    
    # Actually, I might have missed adding `delete` to the Detail view if I only looked at the file.
    # Let's check if the DELETE endpoint works.
    
    view_url = f"{API_BASE}/brands/{BRAND_ID}/products/{product_id}/" # This maps to BrandProductDetailView
    res = requests.delete(view_url)
    
    if res.status_code == 405:
        print("FAILED: DELETE method not allowed on Detail View. Did I add it to the right class?")
        return
        
    if res.status_code != 204:
        print(f"FAILED: Delete returned {res.status_code} {res.text}")
        return
    
    print("Soft Deleted (204 OK)")
    
    # 4. Verify Removed from Main List
    print("\n4. Verifying Removal from Main List...")
    res = requests.get(f"{API_BASE}/brands/{BRAND_ID}/products/")
    products = res.json().get('products', [])
    found = any(p['product_id'] == product_id for p in products)
    print(f"Found in active list: {found} (Should be False)")
    
    # 5. Verify in Bin (Trashed)
    print("\n5. Verifying Clean Bin List (status=trashed)...")
    res = requests.get(f"{API_BASE}/brands/{BRAND_ID}/products/?status=trashed")
    products = res.json().get('products', [])
    found_bin = any(p['product_id'] == product_id for p in products)
    print(f"Found in Bin: {found_bin} (Should be True)")
    
    # 6. Restore
    print(f"\n6. Restoring {product_id}...")
    res = requests.post(f"{API_BASE}/brands/{BRAND_ID}/products/{product_id}/restore/")
    if res.status_code == 200:
        print("Restored (200 OK)")
    else:
        print(f"Restore Failed: {res.status_code}")

    # 7. Cleanup (Permanent Delete)
    print(f"\n7. Permanent Delete {product_id}...")
    res = requests.delete(f"{API_BASE}/brands/{BRAND_ID}/products/{product_id}/permanent/")
    print(f"Permanent Delete Status: {res.status_code}")

if __name__ == "__main__":
    run_test()
