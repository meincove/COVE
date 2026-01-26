import requests
import json

def create_product():
    url = "http://localhost:8000/api/brands/COVE/products/"
    headers = {"Content-Type": "application/json"}
    payload = {
        "product_name": "Test Price Fix",
        "product_type": "T-Shirt",
        "gender": "unisex",
        "description": "Test product for verification",
        "colors": [
            {
                "color_name": "Black",
                "hex_code": "#000000",
                "sizes": [
                    {"size_label": "M", "stock_quantity": 10, "base_price": "25.50"}
                ],
                "images": [
                    {"image_url": "http://test.com/img.jpg", "display_order": 1, "is_primary": True}
                ]
            }
        ]
    }
    
    print(f"Sending POST to {url}...")
    try:
        resp = requests.post(url, json=payload)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_product()
