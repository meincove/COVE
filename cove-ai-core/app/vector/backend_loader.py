"""
Backend API Data Loader for AI Core

Fetches product data from local JSON export file.
"""

import asyncio
import logging
import json
import os
from typing import List, Dict, Any

log = logging.getLogger("cove.vector.backend_loader")


async def fetch_all_products(
    base_url: str = None,
    page_size: int = 500,
    max_pages: int = 50
) -> List[Dict[str, Any]]:
    """Fetch all products from exported JSON file."""
    # ✨ PHASE 6: Use FULL catalog (4.9MB with Pexels images)
    # Path relative to project root or absolute
    json_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "backend/data/productVariantsFlat.json"  # Full 4.9MB catalog!
    )
    
    if not os.path.exists(json_path):
        log.error(f"Export file not found: {json_path}")
        raise FileNotFoundError(f"Export file {json_path} not found. Run 'python manage.py export_products_json' in backend first.")
        
    log.info(f"Loading products from {json_path}...")
    
    # Run in thread pool for file I/O
    return await asyncio.to_thread(_load_json, json_path)


def _load_json(path):
    with open(path, 'r') as f:
        data = json.load(f)
    log.info(f"Loaded {len(data)} products from JSON")
    return data


def transform_for_embedding(product: Dict[str, Any]) -> str:
    """
    Transform backend product into text for embedding generation.
    Includes brand context for brand-aware embeddings.
    """
    brand_id = product.get("brand_id", "Unknown")
    name = product.get("name", "")
    tier = product.get("tier", "")
    product_type = product.get("type", "")
    gender = product.get("gender", "")
    description = product.get("description", "")
    
    # Extract colors from color variants
    colors = []
    # API serializer typically returns 'color_variants' or 'colors'
    variants = product.get("color_variants") or product.get("colors") or []
    for v in variants:
        c_name = v.get("color_name") or v.get("colorName")
        if c_name:
            colors.append(c_name)
    
    # Get material
    material = "cotton"
    if variants:
        first = variants[0]
        if "material" in first:
            material = first["material"]
        elif "material" in product:
             material = product["material"]
    
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
    Supports both flat JSON (productVariantsFlat) and nested API response.
    """
    variants = product.get("color_variants") or product.get("colors") or []
    
    first_color = None
    # ✨ PHASE 6: Support flat JSON structure
    variant_id = product.get("variantId") or product.get("variant_id")
    
    if variants:
        first_color = variants[0]
        if not variant_id:
            variant_id = first_color.get("variant_id") or first_color.get("variantId")
    
    # ✨ PHASE 6: Extract slug from flat JSON
    slug = product.get("slug") or product.get("groupSlug")
    
    # ✨ PHASE 6: Extract price (critical for outfit builder)
    price = product.get("price") or product.get("base_price") or 0
    
    # ✨ PHASE 6: Extract color from flat JSON
    color = product.get("colorName") or product.get("color_name")
    if not color and first_color:
        color = first_color.get("color_name") or first_color.get("colorName")
    
    # ✨ PHASE 6: Extract material from flat JSON
    material = product.get("material")
    if not material and first_color:
        material = first_color.get("material")
    
    metadata = {
        "product_id": product.get("product_id") or product.get("groupId"),
        "variant_id": variant_id,
        "slug": slug,
        "name": product.get("name"),
        "brand_id": product.get("brand_id") or product.get("brandId") or "COVE",
        "tier": product.get("tier"),
        "type": product.get("type"),
        "gender": product.get("gender"),
        "description": product.get("description"),
        "url": f"/product/{slug}" if slug else None,
        "price": price,  # ✨ CRITICAL for outfit builder
        "color": color,
        "material": material,
        # Add outfit builder fields
        "style_tags": product.get("style_tags") or product.get("style", {}).get("styleTags", []),
        "formality_score": product.get("formality_score"),
        "versatility": product.get("versatility"),
        "season": product.get("season", []),
        "use_cases": product.get("use_cases") or product.get("style", {}).get("useCases", []),
    }
    
    # ✨ PHASE 6: Extract images (flat JSON has them at product level)
    images = product.get("images") or []
    if not images and first_color:
        images = first_color.get("images", [])
    
    if images:
        if isinstance(images, list) and len(images) > 0:
            first_img = images[0]
            if isinstance(first_img, dict):
                metadata["image"] = first_img.get("image_name") or first_img.get("url")
            else:
                metadata["image"] = first_img  # String URL directly
    
    return metadata

