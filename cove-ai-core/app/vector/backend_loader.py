"""
Backend API Data Loader for AI Core

Fetches product data from Django backend API instead of local JSON.
Handles pagination, rate limiting, and data transformation.

Usage:
    from app.vector.backend_loader import fetch_all_products
    
    products = await fetch_all_products()
    # Returns list of 1,933 products from all 15 brands
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx

log = logging.getLogger("cove.vector.backend_loader")

# Backend API configuration
BACKEND_BASE_URL = "http://localhost:8001"
PRODUCTS_ENDPOINT = "/api/products/"


async def fetch_all_products(
    base_url: str = BACKEND_BASE_URL,
    page_size: int = 500,
    max_pages: int = 50
) -> List[Dict[str, Any]]:
    """
    Fetch all products from backend API with pagination.
    
    Args:
        base_url: Backend API base URL
        page_size: Products per page (backend max is 500)
        max_pages: Safety limit to prevent infinite loops
        
    Returns:
        List of all products from backend
    """
    all_products = []
    page = 1
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        while page <= max_pages:
            try:
                url = f"{base_url}{PRODUCTS_ENDPOINT}"
                params = {"page": page, "page_size": page_size}
                
                log.info(f"Fetching page {page} (page_size={page_size})...")
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                results = data.get("results", [])
                
                if not results:
                    log.info(f"No more results at page {page}")
                    break
                
                all_products.extend(results)
                log.info(f"Fetched {len(results)} products (total: {len(all_products)})")
                
                # Check if there are more pages
                if not data.get("next"):
                    log.info("Reached last page")
                    break
                
                page += 1
                
                # Small delay to avoid overwhelming backend
                await asyncio.sleep(0.1)
                
            except httpx.HTTPError as e:
                log.error(f"HTTP error fetching page {page}: {e}")
                raise
            except Exception as e:
                log.error(f"Error fetching page {page}: {e}")
                raise
    
    log.info(f"✅ Fetched {len(all_products)} total products")
    return all_products


def transform_for_embedding(product: Dict[str, Any]) -> str:
    """
    Transform backend product into text for embedding generation.
    
    Includes brand context for brand-aware embeddings.
    
    Args:
        product: Product dict from backend API
        
    Returns:
        Text string optimized for embedding
    """
    brand_id = product.get("brand_id", "Unknown")
    name = product.get("name", "")
    tier = product.get("tier", "")
    product_type = product.get("type", "")
    gender = product.get("gender", "")
    description = product.get("description", "")
    
    # Extract colors from color variants
    colors = []
    for color_group in product.get("colors", []):
        color_name = color_group.get("colorName", "")
        if color_name:
            colors.append(color_name)
    
    # Get material from first color variant if available
    material = "cotton"  # default
    if product.get("colors") and len(product["colors"]) > 0:
        first_color = product["colors"][0]
        if "material" in first_color:
            material = first_color["material"]
    
    # Build embedding text with brand prominently featured
    embedding_text = f"""[{brand_id}] {name}
{tier} tier {product_type} for {gender}
Brand: {brand_id}
Material: {material}
{description}
Available colors: {', '.join(colors) if colors else 'multiple colors'}
"""
    
    return embedding_text.strip()


def get_product_metadata(product: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract metadata for vector store.
    
    Args:
        product: Product dict from backend API
        
    Returns:
        Metadata dict for storage
    """
    # Get first color variant for variant-level metadata
    # Backend API uses "color_variants" key
    first_color = None
    variant_id = None
    
    colors_list = product.get("color_variants") or product.get("colors") or []
    if colors_list and len(colors_list) > 0:
        first_color = colors_list[0]
        # Backend API uses snake_case: variant_id, not variantId
        variant_id = first_color.get("variant_id") or first_color.get("variantId")
    
    metadata = {
        "product_id": product.get("product_id"),
        "variant_id": variant_id,
        "slug": product.get("slug"),
        "name": product.get("name"),
        "brand_id": product.get("brand_id"),
        "tier": product.get("tier"),
        "type": product.get("type"),
        "gender": product.get("gender"),
        "description": product.get("description"),
        "url": f"/product/{product.get('slug')}",
    }
    
    # Add color info from first variant
    if first_color:
        # Backend API uses color_name (snake_case)
        metadata["color"] = first_color.get("color_name") or first_color.get("colorName")
        metadata["material"] = first_color.get("material")
        
        # Add first image
        images = first_color.get("images", [])
        if images:
            # Handle both array of objects and array of strings
            if isinstance(images, list) and len(images) > 0:
                first_image = images[0]
                if isinstance(first_image, dict):
                    first_image = first_image.get("image_name") or first_image.get("url")
                metadata["image"] = first_image
    
    return metadata


# Synchronous wrapper for scripts
def fetch_all_products_sync() -> List[Dict[str, Any]]:
    """Synchronous wrapper for use in scripts."""
    return asyncio.run(fetch_all_products())


if __name__ == "__main__":
    # Quick test
    logging.basicConfig(level=logging.INFO)
    
    print("🔄 Testing backend data loader...")
    products = fetch_all_products_sync()
    
    print(f"\n✅ Fetched {len(products)} products")
    
    # Show brands
    brands = set(p.get("brand_id") for p in products)
    print(f"📦 Brands: {sorted(brands)}")
    
    # Show sample embedding text
    if products:
        sample = products[0]
        print(f"\n📝 Sample embedding text:")
        print(transform_for_embedding(sample))
        
        print(f"\n📋 Sample metadata:")
        import json
        print(json.dumps(get_product_metadata(sample), indent=2))
