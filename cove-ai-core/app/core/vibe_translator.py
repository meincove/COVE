from typing import List, Dict, Optional
import re

class VibeTranslator:
    """
    Translates abstract fashion 'vibes' (e.g., 'Mob Wife', 'Y2K') into 
    concrete search keywords/attributes compatible with the generic product dataset.
    """
    
    # Taxonomy mapping: Vibe -> List of Keywords/Attributes
    # Based on vibe_taxonomy.md and dataset analysis
    TAXONOMY: Dict[str, List[str]] = {
        # --- Modern / Trendy ---
        "y2k": ["cropped", "slim fit", "metallic", "mini skirt", "retro", "party", "pink", "baby blue", "silver"],
        "cyberpunk": ["utility", "oversized", "waterproof", "cargo", "matte", "tech", "functional", "black", "neon green"],
        "techwear": ["utility", "oversized", "waterproof", "cargo", "matte", "tech", "functional", "black", "charcoal"],
        "coquette": ["slim fit", "soft", "delicate", "mini", "feminine", "romantic", "white", "light pink", "cream"],
        "office siren": ["slim fit", "structured", "minimalist", "clean", "office", "formal", "elegant", "grey", "pinstripe"],
        "mob wife": ["oversized", "leopard", "leather", "bold", "glamour", "luxury", "gold", "black"],
        "eclectic grandpa": ["knit", "retro", "relaxed fit", "patterned", "vintage", "casual", "cozy", "brown", "mustard"],
        
        # --- Natural / Relaxed ---
        "cottagecore": ["linen", "flowy", "floral", "puff sleeve", "romantic", "nature", "vintage", "sage green", "beige"],
        "coastal grandmother": ["linen", "knit", "relaxed fit", "striped", "classic", "elegant", "minimal", "white", "blue", "sand"],
        "gorpcore": ["fleece", "windbreaker", "utility", "functional", "outdoors", "hiking", "tech", "olive", "brown", "orange"],
        "clean girl": ["minimalist", "matching set", "bodysuit", "slick", "clean", "gym", "casual", "beige", "white", "grey"],
        
        # --- Edgy / Alternative ---
        "indie sleaze": ["distressed", "leather", "slim fit", "graphic", "grunge", "rock", "party", "black", "red", "metallic"],
        "grunge": ["plaid", "oversized", "flannel", "ripped", "90s", "streetwear", "casual", "black", "grey", "red"],
        "dark academia": ["tweed", "structured", "knit", "turtleneck", "vintage", "formal", "classic", "brown", "black", "forest green"],
    }

    @classmethod
    def translate(cls, query: str) -> List[str]:
        """
        Analyzes the query for vibe keywords and returns a list of expanding search terms.
        """
        query_lower = query.lower()
        expanded_terms = set()

        for vibe, keywords in cls.TAXONOMY.items():
            # Check if the vibe phrase exists in the user query
            # We use distinct word boundaries to avoid partial matches (e.g. "office" matching "office siren")
            # But "mob wife" contains spaces, so we need careful checking.
            
            # Simple substring check first, often sufficient for multi-word vibes
            if vibe in query_lower:
                expanded_terms.update(keywords)
        
        return list(expanded_terms)

    @classmethod
    def get_supported_vibes(cls) -> List[str]:
        return list(cls.TAXONOMY.keys())
