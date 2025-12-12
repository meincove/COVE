#!/usr/bin/env python3
"""
Pexels Image Fetcher for Product Catalog

Fetches real fashion product images from Pexels API and updates catalog JSON
Uses gender-specific queries for accurate image matching

Requirements:
- PEXEL_API_KEY in environment
- productVariantsFlat_v2.json catalog

Output:
- Updated catalog with Pexels image URLs
"""

import json
import os
import time
import requests
from typing import Dict, List, Optional
from tqdm import tqdm
import argparse
from pathlib import Path

class PexelsImageFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.pexels.com/v1"
        self.headers = {"Authorization": api_key}
        self.rate_limit_delay = 0.5  # 200 requests/hour = ~0.5s between requests
        self.cache = {}  # Cache queries to avoid duplicate API calls
        
    def search_product_image(self, product_type: str, color: str, gender: str, 
                            brand_style: str = "") -> Optional[List[str]]:
        """Search Pexels for product images"""
        
        # Build gender-specific query
        gender_prefix = {
            "female": "women's",
            "male": "men's",
            "unisex": ""
        }.get(gender, "")
        
        # Construct query
        query_parts = [gender_prefix, product_type, color, "fashion"]
        query = " ".join([p for p in query_parts if p]).strip()
        
        # Check cache
        if query in self.cache:
            return self.cache[query]
        
        try:
            # Rate limiting
            time.sleep(self.rate_limit_delay)
            
            # Search Pexels
            response = requests.get(
                f"{self.base_url}/search",
                headers=self.headers,
                params={
                    "query": query,
                    "per_page": 3,  # Get 3 images (front, back, detail)
                    "orientation": "portrait"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                photos = data.get("photos", [])
                
                if photos:
                    # Get medium-sized images (good for web)
                    image_urls = [
                        photo["src"]["large"] for photo in photos[:3]
                    ]
                    self.cache[query] = image_urls
                    return image_urls
                else:
                    # Fallback: Try simpler query
                    return self._fallback_search(product_type, gender)
            
            elif response.status_code == 429:
                print(f"⚠️  Rate limit hit. Waiting 60s...")
                time.sleep(60)
                return self.search_product_image(product_type, color, gender, brand_style)
            
            else:
                print(f"❌ Pexels API error: {response.status_code}")
                return self._fallback_search(product_type, gender)
                
        except Exception as e:
            print(f"❌ Failed to fetch image: {e}")
            return self._fallback_search(product_type, gender)
    
    def _fallback_search(self, product_type: str, gender: str) -> Optional[List[str]]:
        """Simplified fallback search"""
        gender_prefix = {
            "female": "women's",
            "male": "men's",
            "unisex": ""
        }.get(gender, "")
        
        simple_query = f"{gender_prefix} {product_type}".strip()
        
        if simple_query in self.cache:
            return self.cache[simple_query]
        
        try:
            time.sleep(self.rate_limit_delay)
            response = requests.get(
                f"{self.base_url}/search",
                headers=self.headers,
                params={"query": simple_query, "per_page": 3, "orientation": "portrait"}
            )
            
            if response.status_code == 200:
                photos = response.json().get("photos", [])
                if photos:
                    urls = [photo["src"]["large"] for photo in photos[:3]]
                    self.cache[simple_query] = urls
                    return urls
            
            # Ultimate fallback: generic placeholder
            return [
                f"https://via.placeholder.com/800x1000/000000/FFFFFF?text={product_type}",
                f"https://via.placeholder.com/800x1000/000000/FFFFFF?text={product_type}+Back",
                f"https://via.placeholder.com/800x1000/000000/FFFFFF?text={product_type}+Detail"
            ]
            
        except:
            return [
                f"https://via.placeholder.com/800x1000/000000/FFFFFF?text={product_type}",
                f"https://via.placeholder.com/800x1000/000000/FFFFFF?text={product_type}+Back",
                f"https://via.placeholder.com/800x1000/000000/FFFFFF?text={product_type}+Detail"
            ]
    
    def update_catalog_with_images(self, catalog_path: Path, output_path: Path,
                                   sample_size: Optional[int] = None) -> Dict:
        """Update catalog JSON with Pexels image URLs"""
        
        print("📸 Fetching product images from Pexels...")
        print(f"   API Rate Limit: 200 requests/hour")
        
        # Load catalog
        with open(catalog_path) as f:
            products = json.load(f)
        
        if sample_size:
            products = products[:sample_size]
            print(f"   Processing first {sample_size} products (sample mode)")
        
        stats = {
            "total": len(products),
            "with_images": 0,
            "fallback": 0,
            "failed": 0
        }
        
        # Update each product
        for i, product in enumerate(tqdm(products, desc="Fetching images")):
            # Get product details
            product_type = product.get("type", "clothing")
            color = product.get("colorName", "black")
            gender = product.get("gender", "unisex")
            brand_style = product.get("brandId", "")
            
            # Fetch images
            image_urls = self.search_product_image(product_type, color, gender, brand_style)
            
            if image_urls:
                # Update product
                product["images"] = image_urls
                
                # Track stats
                if "placeholder" in image_urls[0]:
                    stats["fallback"] += 1
                else:
                    stats["with_images"] += 1
            else:
                stats["failed"] += 1
            
            # Progress update every 50 products
            if (i + 1) % 50 == 0:
                print(f"\n   Progress: {stats['with_images']} real images, "
                      f"{stats['fallback']} fallbacks, {stats['failed']} failed")
        
        # Save updated catalog
        print(f"\n💾 Saving updated catalog to {output_path}...")
        with open(output_path, 'w') as f:
            json.dump(products, f, indent=2)
        
        # Print final stats
        print(f"\n✅ IMAGE FETCH COMPLETE:")
        print(f"   Total Products: {stats['total']}")
        print(f"   Real Images: {stats['with_images']} ({stats['with_images']/stats['total']*100:.1f}%)")
        print(f"   Fallbacks: {stats['fallback']} ({stats['fallback']/stats['total']*100:.1f}%)")
        print(f"   Failed: {stats['failed']}")
        
        return stats


def main():
    parser = argparse.ArgumentParser(description='Fetch Pexels images for product catalog')
    parser.add_argument('--catalog', required=True, help='Input catalog JSON')
    parser.add_argument('--output', required=True, help='Output catalog JSON with images')
    parser.add_argument('--api-key', help='Pexels API key (or set PEXEL_API_KEY env)')
    parser.add_argument('--sample', type=int, help='Process only first N products (for testing)')
    args = parser.parse_args()
    
    # Get API key
    api_key = args.api_key or os.getenv('PEXEL_API_KEY')
    if not api_key:
        print("❌ Error: Pexels API key required!")
        print("   Set PEXEL_API_KEY environment variable or use --api-key")
        return 1
    
    # Initialize fetcher
    fetcher = PexelsImageFetcher(api_key)
    
    # Process catalog
    catalog_path = Path(args.catalog)
    output_path = Path(args.output)
    
    if not catalog_path.exists():
        print(f"❌ Catalog not found: {catalog_path}")
        return 1
    
    # Fetch images
    stats = fetcher.update_catalog_with_images(
        catalog_path, 
        output_path,
        sample_size=args.sample
    )
    
    print(f"\n🚀 Next step: Load catalog to Neon DB")
    print(f"   Command: python load_catalog_to_db.py --catalog {output_path}")
    
    return 0


if __name__ == "__main__":
    exit(main())
