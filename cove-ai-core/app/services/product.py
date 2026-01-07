"""
Product service for handling product-related database queries.
"""
from typing import List
import logging
from app.vector.store import get_conn

log = logging.getLogger("cove.product")

def get_available_colors(slug: str) -> List[str]:
    """Get available colors for a product by querying database for variants."""
    try:
        # Extract base slug (e.g., 'pg-hoodie-corebasics-119' -> 'pg-hoodie-corebasics')
        base_slug = slug.rsplit('-', 1)[0] if '-' in slug else slug
        
        query = """
            SELECT DISTINCT c->>'colorName'
            FROM ai_core.docs,
                 jsonb_array_elements(COALESCE(meta->'colors', '[]'::jsonb)) AS c
            WHERE kind = 'product'
              AND meta->>'slug' LIKE %s
              AND c->>'colorName' IS NOT NULL
              AND c->>'colorName' != ''
        """
        
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (f"{base_slug}%",))
                colors = [row[0] for row in cur.fetchall()]
                return colors if len(colors) > 1 else []  # Only return if multiple colors
    except Exception as e:
        log.warning(f"Failed to get colors for {slug}: {e}")
        return []

def get_available_facet_values(product_type: str, facet: str) -> List[str]:
    """
    Get distinct available values for a specific facet (color, fabric, style, fit).
    facet: 'color', 'fabric', 'style', 'fit', 'material'
    """
    try:
        # Map friendly facet names to DB paths
        # Note: colors is an array of objects in meta->colors
        # Others might be top-level meta fields or inside details json
        
        query = ""
        params = [product_type]
        
        if facet in ['color', 'colors']:
            query = """
                SELECT DISTINCT c->>'colorName'
                FROM ai_core.docs,
                     jsonb_array_elements(COALESCE(meta->'colors', '[]'::jsonb)) AS c
                WHERE kind = 'product'
                  AND meta->>'type' = %s
                  AND c->>'colorName' IS NOT NULL
                  AND c->>'colorName' != ''
            """
        elif facet in ['fabric', 'material', 'materials']:
            # Assuming fabric/material is in meta->details->material or meta->material
            query = """
                SELECT DISTINCT meta->>'material'
                FROM ai_core.docs
                WHERE kind = 'product'
                  AND meta->>'type' = %s
                  AND meta->>'material' IS NOT NULL
            """
        elif facet in ['style', 'styles']:
            query = """
                SELECT DISTINCT meta->>'style'
                FROM ai_core.docs
                WHERE kind = 'product'
                  AND meta->>'type' = %s
                  AND meta->>'style' IS NOT NULL
            """
             
        if not query:
            return []
            
        final_query = f"{query} LIMIT 12"
        
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(final_query, tuple(params))
                values = [row[0] for row in cur.fetchall()]
                return [v for v in values if v] # Filter empty
    except Exception as e:
        log.warning(f"Failed to get facet {facet} for type {product_type}: {e}")
        return []
