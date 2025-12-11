#!/usr/bin/env python3
"""
Product Templates for Multi-Brand Catalog

8 product categories with complete attribute definitions
Matches exact schema from productVariantsFlat.json
"""

PRODUCT_TEMPLATES = {
    "hoodie": {
        "base_price_eur": 45,
        "type": "hoodie",
        "sizing_key": "hoodie_unisex_regular",
        "materials": {
            "premium": ["Heavy French Terry", "Brushed Fleece", "Heavyweight Cotton"],
            "standard": ["French Terry", "Cotton Blend", "Fleece"],
            "basic": ["Basic Fleece", "Cotton Poly Blend"]
        },
        "gsm_range": (300, 480),
        "attributes": {
            "features": ["drawstring hood", "kangaroo pocket", "ribbed cuffs", "dropped shoulders"],
            "fits": ["regular", "oversized", "relaxed", "slim"],
            "lengths": ["regular", "cropped", "longline"],
            "patterns": ["solid", "heather", "tie-dye", "color-block"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium", "high"],
            "thickness": ["light", "medium", "heavy"],
            "warmth": ["warm-weather", "all-season", "cold-weather"],
            "breathability": ["low", "medium", "high"],
            "softness": ["medium", "medium-high", "high"]
        },
        "style": {
            "dress_codes": ["streetwear", "casual", "athleisure"],
            "use_cases": ["daily wear", "street fashion", "layering", "winter", "travel"]
        },
        "care": {
            "washTemp": "30°C gentle wash",
            "dryer": "no",
            "iron": "low"
        }
    },
    
    "tee": {
        "base_price_eur": 25,
        "type": "tee",
        "sizing_key": "tee_unisex_regular",
        "materials": {
            "premium": ["Organic Cotton", "Pima Cotton", "Silk Blend"],
            "standard": ["Cotton Jersey", "Cotton Blend"],
            "basic": ["Jersey", "Cotton Poly"]
        },
        "gsm_range": (150, 220),
        "attributes": {
            "features": ["crew neck", "v-neck", "scoop neck"],
            "fits": ["regular", "oversized", "slim", "relaxed"],
            "lengths": ["regular", "cropped", "longline"],
            "patterns": ["solid", "graphic", "stripe", "tie-dye"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium"],
            "thickness": ["light", "medium"],
            "warmth": ["warm-weather", "all-season"],
            "breathability": ["high", "medium-high"],
            "softness": ["medium-high", "high"]
        },
        "style": {
            "dress_codes": ["casual", "streetwear", "athleisure"],
            "use_cases": ["daily wear", "layering", "gym", "summer"]
        },
        "care": {
            "washTemp": "30°C machine wash",
            "dryer": "yes-low",
            "iron": "medium"
        }
    },
    
    "sweatshirt": {
        "base_price_eur": 50,
        "type": "sweatshirt",
        "sizing_key": "sweatshirt_unisex_regular",
        "materials": {
            "premium": ["Heavy Cotton", "French Terry", "Loopback Cotton"],
            "standard": ["Cotton Fleece", "Cotton Blend"],
            "basic": ["Fleece", "Cotton Poly"]
        },
        "gsm_range": (280, 400),
        "attributes": {
            "features": ["crew neck", "ribbed cuffs", "ribbed hem"],
            "fits": ["regular", "oversized", "relaxed"],
            "lengths": ["regular", "cropped"],
            "patterns": ["solid", "heather", "color-block"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium"],
            "thickness": ["medium", "heavy"],
            "warmth": ["all-season", "cold-weather"],
            "breathability": ["low", "medium"],
            "softness": ["medium-high", "high"]
        },
        "style": {
            "dress_codes": ["casual", "streetwear"],
            "use_cases": ["daily wear", "layering", "winter"]
        },
        "care": {
            "washTemp": "30°C gentle wash",
            "dryer": "no",
            "iron": "low"
        }
    },
    
    "jacket": {
        "base_price_eur": 95,
        "type": "jacket",
        "sizing_key": "jacket_unisex_regular",
        "materials": {
            "premium": ["Leather", "Wool Blend", "Softshell", "Tech Fabric"],
            "standard": ["Denim", "Canvas", "Nylon"],
            "basic": ["Polyester", "Cotton Blend"]
        },
        "gsm_range": (350, 600),
        "attributes": {
            "features": ["zip front", "pockets", "adjustable cuffs", "hood"],
            "fits": ["regular", "oversized", "slim"],
            "lengths": ["regular", "cropped", "longline"],
            "patterns": ["solid", "quilted", "paneled"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium"],
            "thickness": ["medium", "heavy", "very-heavy"],
            "warmth": ["all-season", "cold-weather", "winter"],
            "breathability": ["low", "medium"],
            "softness": ["low", "medium"]
        },
        "style": {
            "dress_codes": ["casual", "streetwear", "outdoor"],
            "use_cases": ["winter", "layering", "outdoor", "travel"]
        },
        "care": {
            "washTemp": "Cold wash or dry clean",
            "dryer": "no",
            "iron": "low"
        }
    },
    
    "pants": {
        "base_price_eur": 65,
        "type": "pants",
        "sizing_key": "pants_unisex_regular",
        "materials": {
            "premium": ["Wool Blend", "Italian Cotton", "Tencel"],
            "standard": ["Cotton Twill", "Denim", "Canvas"],
            "basic": ["Cotton Blend", "Poly Cotton"]
        },
        "gsm_range": (200, 400),
        "attributes": {
            "features": ["pockets", "belt loops", "zip fly", "elastic waist"],
            "fits": ["regular", "slim", "relaxed", "wide-leg", "tapered"],
            "lengths": ["regular", "cropped", "full-length"],
            "patterns": ["solid", "pinstripe", "check"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium", "high"],
            "thickness": ["light", "medium", "heavy"],
            "warmth": ["warm-weather", "all-season", "cold-weather"],
            "breathability": ["medium", "high"],
            "softness": ["low", "medium", "medium-high"]
        },
        "style": {
            "dress_codes": ["casual", "smart-casual", "streetwear"],
            "use_cases": ["daily wear", "office-casual", "travel"]
        },
        "care": {
            "washTemp": "30°C machine wash",
            "dryer": "yes-low",
            "iron": "medium"
        }
    },
    
    "shorts": {
        "base_price_eur": 35,
        "type": "shorts",
        "sizing_key": "shorts_unisex_regular",
        "materials": {
            "premium": ["Linen", "Premium Cotton", "Tech Fabric"],
            "standard": ["Cotton Twill", "Denim", "Canvas"],
            "basic": ["Cotton Blend", "Poly Cotton"]
        },
        "gsm_range": (180, 300),
        "attributes": {
            "features": ["pockets", "drawstring", "belt loops"],
            "fits": ["regular", "slim", "relaxed"],
            "lengths": ["above-knee", "at-knee", "bermuda"],
            "patterns": ["solid", "stripe", "check"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium", "high"],
            "thickness": ["light", "medium"],
            "warmth": ["warm-weather", "summer"],
            "breathability": ["high", "medium-high"],
            "softness": ["medium", "medium-high"]
        },
        "style": {
            "dress_codes": ["casual", "athletic", "resort"],
            "use_cases": ["summer", "beach", "gym", "travel"]
        },
        "care": {
            "washTemp": "30°C machine wash",
            "dryer": "yes-low",
            "iron": "medium"
        }
    },
    
    "dress": {
        "base_price_eur": 75,
        "type": "dress",
        "sizing_key": "dress_women_regular",
        "materials": {
            "premium": ["Silk Blend", "Linen", "Tencel", "Rayon"],
            "standard": ["Cotton", "Jersey", "Cotton Blend"],
            "basic": ["Poly Blend", "Jersey Knit"]
        },
        "gsm_range": (150, 280),
        "attributes": {
            "features": ["lined", "pockets", "adjustable straps"],
            "fits": ["fitted", "a-line", "relaxed", "wrap"],
            "lengths": ["mini", "midi", "maxi"],
            "patterns": ["solid", "floral", "stripe", "abstract"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium", "high"],
            "thickness": ["light", "medium"],
            "warmth": ["warm-weather", "all-season"],
            "breathability": ["high", "medium-high"],
            "softness": ["medium-high", "high"]
        },
        "style": {
            "dress_codes": ["casual", "smart-casual", "bohemian"],
            "use_cases": ["daily wear", "evening", "summer", "events"]
        },
        "care": {
            "washTemp": "Cold wash or hand wash",
            "dryer": "no",
            "iron": "low"
        }
    },
    
    "skirt": {
        "base_price_eur": 45,
        "type": "skirt",
        "sizing_key": "skirt_women_regular",
        "materials": {
            "premium": ["Silk", "Linen", "Wool Blend"],
            "standard": ["Cotton", "Denim", "Twill"],
            "basic": ["Poly Blend", "Cotton Blend"]
        },
        "gsm_range": (150, 300),
        "attributes": {
            "features": ["elastic waist", "zip closure", "pockets"],
            "fits": ["fitted", "a-line", "pleated", "wrap"],
            "lengths": ["mini", "midi", "maxi"],
            "patterns": ["solid", "print", "plaid"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium", "high"],
            "thickness": ["light", "medium"],
            "warmth": ["warm-weather", "all-season"],
            "breathability": ["high", "medium-high"],
            "softness": ["medium", "medium-high", "high"]
        },
        "style": {
            "dress_codes": ["casual", "smart-casual"],
            "use_cases": ["daily wear", "summer", "office-casual"]
        },
        "care": {
            "washTemp": "30°C gentle wash",
            "dryer": "no",
            "iron": "medium"
        }
    },
    
    "sweater": {
        "base_price_eur": 55,
        "type": "sweater",
        "sizing_key": "sweater_unisex_regular",
        "materials": {
            "premium": ["Merino Wool", "Cashmere", "Wool Blend"],
            "standard": ["Cotton Knit", "Acrylic Blend"],
            "basic": ["Acrylic", "Poly Blend"]
        },
        "gsm_range": (250, 400),
        "attributes": {
            "features": ["crew neck", "v-neck", "turtleneck", "ribbed trim"],
            "fits": ["regular", "oversized", "slim"],
            "lengths": ["regular", "cropped"],
            "patterns": ["solid", "cable knit", "fair isle"]
        },
        "fabric_specs": {
            "stretch_levels": ["medium", "high"],
            "thickness": ["medium", "heavy"],
            "warmth": ["cold-weather", "winter"],
            "breathability": ["low", "medium"],
            "softness": ["high", "very-high"]
        },
        "style": {
            "dress_codes": ["casual", "smart-casual"],
            "use_cases": ["winter", "layering", "office-casual"]
        },
        "care": {
            "washTemp": "Hand wash or dry clean",
            "dryer": "no",
            "iron": "low or steam"
        }
    },
    
    "accessories": {
        "base_price_eur": 20,
        "type": "accessories",
        "sizing_key": "onesize",
        "materials": {
            "premium": ["Leather", "Merino Wool", "Silk"],
            "standard": ["Cotton", "Acrylic"],
            "basic": ["Poly Blend"]
        },
        "gsm_range": (100, 300),
        "attributes": {
            "features": ["adjustable", "one size"],
            "fits": ["standard"],
            "lengths": ["standard"],
            "patterns": ["solid", "stripe"]
        },
        "fabric_specs": {
            "stretch_levels": ["low", "medium", "high"],
            "thickness": ["light", "medium"],
            "warmth": ["all-season", "cold-weather"],
            "breathability": ["medium", "high"],
            "softness": ["medium", "high"]
        },
        "style": {
            "dress_codes": ["casual", "accessory"],
            "use_cases": ["daily wear", "winter", "style accent"]
        },
        "care": {
            "washTemp": "Hand wash",
            "dryer": "no",
            "iron": "low"
        }
    }
}

# Size stock distributions
SIZE_DISTRIBUTIONS = {
    "women": {
        "XS": (0, 5),
        "S": (8, 15),
        "M": (12, 20),
        "L": (10, 18),
        "XL": (5, 12),
        "XXL": (0, 8)
    },
    "men": {
        "S": (5, 12),
        "M": (10, 18),
        "L": (12, 20),
        "XL": (8, 15),
        "XXL": (3, 10)
    },
    "unisex": {
        "XS": (0, 5),
        "S": (8, 15),
        "M": (12, 20),
        "L": (10, 18),
        "XL": (6, 14),
        "XXL": (2, 8)
    }
}
