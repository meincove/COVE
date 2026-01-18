"""
Slug utilities for SEO-friendly product URLs.
Format: brand-product-name (e.g., 'boldhues-classic-hoodie')
"""
import re
from django.utils.text import slugify


def generate_product_slug(brand_id: str, name: str, remove_brand_from_name: bool = True) -> str:
    """
    Generate SEO-friendly product slug.
    
    Args:
        brand_id: The brand identifier (e.g., 'BoldHues')
        name: Product name (e.g., 'BoldHues Hoodie' or 'Classic Hoodie')
        remove_brand_from_name: Whether to remove brand from name if present
    
    Returns:
        Clean slug like 'boldhues-classic-hoodie'
    """
    # Clean brand
    brand_clean = brand_id.lower().strip()
    
    # Clean name
    name_clean = name.lower().strip()
    
    # Remove brand from name if it starts with brand (avoid duplication)
    if remove_brand_from_name and name_clean.startswith(brand_clean):
        name_clean = name_clean[len(brand_clean):].strip()
        # Also handle cases like "BoldHues's Hoodie" -> remove "'s "
        name_clean = re.sub(r"^['\s]+", '', name_clean)
    
    # Build base slug
    if name_clean:
        base_slug = slugify(f"{brand_clean}-{name_clean}")
    else:
        base_slug = slugify(brand_clean)
    
    # Clean up multiple dashes
    base_slug = re.sub(r'-+', '-', base_slug)
    base_slug = base_slug.strip('-')
    
    return base_slug


def generate_variant_slug(product_slug: str, color_name: str) -> str:
    """
    Generate variant slug with color.
    
    Args:
        product_slug: The product slug (e.g., 'boldhues-hoodie')
        color_name: Color name (e.g., 'electric blue')
    
    Returns:
        Variant slug like 'boldhues-hoodie-electric-blue'
    """
    color_clean = slugify(color_name.lower().strip())
    
    # Don't add 'default' color to slug
    if color_clean in ('default', 'none', ''):
        return product_slug
    
    return f"{product_slug}-{color_clean}"


def ensure_unique_slug(base_slug: str, model_class, exclude_pk=None) -> str:
    """
    Ensure slug uniqueness by appending numbers if collision occurs.
    
    Args:
        base_slug: The desired slug
        model_class: Django model class to check against
        exclude_pk: Primary key to exclude from check (for updates)
    
    Returns:
        Unique slug (may have suffix like '-2' if collision)
    """
    slug = base_slug
    counter = 1
    max_attempts = 100  # Safety limit
    
    while counter <= max_attempts:
        qs = model_class.objects.filter(slug=slug)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        
        if not qs.exists():
            return slug
        
        counter += 1
        slug = f"{base_slug}-{counter}"
    
    # Fallback: append random chars if too many collisions
    import secrets
    return f"{base_slug}-{secrets.token_hex(3)}"


def build_product_url(slug: str, color: str = None, size: str = None, variant_id: str = None) -> str:
    """
    Build full product URL with optional color/size query params.
    
    Args:
        slug: Product slug
        color: Optional color name
        size: Optional size
        variant_id: Optional variant ID
    
    Returns:
        URL like '/product/boldhues-hoodie?color=blue&size=M'
    """
    base_url = f"/product/{slug}"
    
    params = []
    if variant_id:
        params.append(f"variantId={variant_id}")
    if color and color.lower() != 'default':
        color_param = slugify(color.lower())
        params.append(f"color={color_param}")
    if size:
        params.append(f"size={size}")
    
    if params:
        return f"{base_url}?{'&'.join(params)}"
    
    return base_url
