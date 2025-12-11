#!/usr/bin/env python3
"""
Brand Definitions for Multi-Brand Catalog Generator

15 distinct fashion brands with unique identities, pricing, and style DNA
Gender distribution: 45% Female, 35% Unisex, 20% Male
"""

BRANDS = {
    "COVE": {
        "id": "COVE",
        "merchant": "COVE_DTC",
        "name": "COVE",
        "description": "Minimalist essentials for everyday life",
        "style_dna": "clean minimal essential timeless",
        "price_multiplier": 1.0,  # Base pricing
        "target_demo": "Gen Z, Millennials",
        "materials": ["Brushed Fleece", "Cotton Jersey", "French Terry", "Organic Cotton"],
        "colors": {
            "neutral": ["black", "white", "grey heather", "sand", "navy"],
            "accent": ["forest green", "burgundy", "deep navy"]
        },
        "product_count": 200,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "UrbanPulse": {
        "id": "URPLS",
        "merchant": "URBANPULSE_STORE",
        "name": "UrbanPulse",
        "description": "Street culture meets contemporary design",
        "style_dna": "streetwear edgy urban bold contemporary",
        "price_multiplier": 1.8,
        "target_demo": "Urban youth, trendsetters",
        "materials": ["Heavy French Terry", "Denim", "Tech Fabric", "Canvas"],
        "colors": {
            "neutral": ["black", "charcoal", "olive", "stone grey"],
            "accent": ["rust orange", "electric blue", "acid green"]
        },
        "product_count": 150,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "NordicThread": {
        "id": "NRDTH",
        "merchant": "NORDICTHREAD_CO",
        "name": "NordicThread",
        "description": "Scandinavian minimalism with quality craftsmanship",
        "style_dna": "scandinavian minimal refined quality",
        "price_multiplier": 2.5,
        "target_demo": "Professionals, design lovers",
        "materials": ["Merino Wool", "Organic Linen", "Premium Cotton", "Cashmere Blend"],
        "colors": {
            "neutral": ["off-white", "taupe", "charcoal", "navy", "stone"],
            "accent": ["sage green", "dusty rose", "steel blue"]
        },
        "product_count": 140,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "EcoHaven": {
        "id": "ECOHV",
        "merchant": "ECOHAVEN_SUSTAINABLE",
        "name": "EcoHaven",
        "description": "Sustainable fashion without compromise",
        "style_dna": "sustainable ethical natural eco-conscious",
        "price_multiplier": 1.6,
        "target_demo": "Eco-conscious consumers",
        "materials": ["Organic Cotton", "Recycled Polyester", "Hemp Blend", "Bamboo Fabric"],
        "colors": {
            "neutral": ["natural", "earth brown", "sage", "charcoal"],
            "accent": ["terracotta", "olive", "ocean blue"]
        },
        "product_count": 130,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "FlexFit": {
        "id": "FLXFT",
        "merchant": "FLEXFIT_ATHLETIC",
        "name": "FlexFit",
        "description": "Performance athleisure for active lifestyles",
        "style_dna": "athletic performance technical active",
        "price_multiplier": 1.4,
        "target_demo": "Athletes, active lifestyle",
        "materials": ["Performance Jersey", "Four-Way Stretch", "Moisture-Wicking", "Nylon Blend"],
        "colors": {
            "neutral": ["black", "charcoal", "navy", "grey"],
            "accent": ["electric lime", "coral", "cyan"]
        },
        "product_count": 150,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "LuxeLine": {
        "id": "LUXLN",
        "merchant": "LUXELINE_PREMIUM",
        "name": "LuxeLine",
        "description": "Contemporary premium for the fashion-forward",
        "style_dna": "luxury premium sophisticated fashion-forward",
        "price_multiplier": 4.0,
        "target_demo": "Fashion enthusiasts",
        "materials": ["Silk Blend", "Cashmere", "Italian Cotton", "Leather Trim"],
        "colors": {
            "neutral": ["ivory", "black", "camel", "charcoal"],
            "accent": ["deep red", "royal blue", "emerald"]
        },
        "product_count": 120,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "TimelessCo": {
        "id": "TMLES",
        "merchant": "TIMELESSCO_HERITAGE",
        "name": "TimelessCo",
        "description": "Classic heritage pieces built to last",
        "style_dna": "classic heritage timeless traditional quality",
        "price_multiplier": 2.8,
        "target_demo": "Traditionalists, quality seekers",
        "materials": ["Heavy Cotton", "Wool Blend", "Oxford Cloth", "Canvas"],
        "colors": {
            "neutral": ["navy", "khaki", "oxford grey", "cream"],
            "accent": ["burgundy", "forest", "rust"]
        },
        "product_count": 130,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "TechUrban": {
        "id": "TCHUR",
        "merchant": "TECHURBAN_WEAR",
        "name": "TechUrban",
        "description": "Technical wear meets urban aesthetics",
        "style_dna": "technical futuristic functional urban",
        "price_multiplier": 2.2,
        "target_demo": "Tech enthusiasts",
        "materials": ["Tech Fabric", "Softshell", "Water-Resistant Nylon", "Ripstop"],
        "colors": {
            "neutral": ["black", "graphite", "carbon", "slate"],
            "accent": ["neon yellow", "cyber blue", "volt green"]
        },
        "product_count": 110,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "FreeSpirit": {
        "id": "FRSPT",
        "merchant": "FREESPIRIT_BOHO",
        "name": "FreeSpirit",
        "description": "Bohemian lifestyle with artistic flair",
        "style_dna": "bohemian flowing artistic free-spirited",
        "price_multiplier": 1.3,
        "target_demo": "Free spirits, artists",
        "materials": ["Rayon", "Cotton Gauze", "Linen Blend", "Crochet"],
        "colors": {
            "neutral": ["cream", "sand", "taupe", "olive"],
            "accent": ["mustard", "terracotta", "teal", "plum"]
        },
        "product_count": 100,
        "gender_split": {"female": 0.70, "unisex": 0.30, "male": 0.0}  # More feminine
    },
    
    "CoreBasics": {
        "id": "CRBSC",
        "merchant": "COREBASICS_ESSENTIALS",
        "name": "CoreBasics",
        "description": "Essential wardrobe pieces done right",
        "style_dna": "essential basic simple reliable",
        "price_multiplier": 0.9,
        "target_demo": "Minimalists, value shoppers",
        "materials": ["Cotton Jersey", "Basic Fleece", "Cotton Blend"],
        "colors": {
            "neutral": ["white", "black", "grey", "navy"],
            "accent": ["red", "green", "blue"]
        },
        "product_count": 140,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "StreetVibe": {
        "id": "STVIB",
        "merchant": "STREETVIBE_CULTURE",
        "name": "StreetVibe",
        "description": "Youth culture expressed through fashion",
        "style_dna": "trendy vibrant youth culture street",
        "price_multiplier": 1.5,
        "target_demo": "Young trendsetters",
        "materials": ["French Terry", "Denim", "Graphic Print Cotton"],
        "colors": {
            "neutral": ["black", "white", "grey"],
            "accent": ["hot pink", "electric yellow", "purple", "orange"]
        },
        "product_count": 120,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "ComfortZone": {
        "id": "CMFTZ",
        "merchant": "COMFORTZONE_EASY",
        "name": "ComfortZone",
        "description": "Everyday comfort meets effortless style",
        "style_dna": "comfortable soft relaxed cozy",
        "price_multiplier": 1.2,
        "target_demo": "Comfort seekers",
        "materials": ["Soft Cotton", "Fleece", "Jersey Knit", "Lounge Fabric"],
        "colors": {
            "neutral": ["grey", "beige", "soft pink", "light blue"],
            "accent": ["lavender", "mint", "peach"]
        },
        "product_count": 150,
        "gender_split": {"female": 0.50, "unisex": 0.30, "male": 0.20}  # Slightly more feminine
    },
    
    "BoldHues": {
        "id": "BLDHUE",
        "merchant": "BOLDHUES_COLOR",
        "name": "BoldHues",
        "description": "Express yourself with vibrant colors",
        "style_dna": "colorful bright bold expressive playful",
        "price_multiplier": 1.3,
        "target_demo": "Bold personalities",
        "materials": ["Cotton Jersey", "French Terry", "Cotton Blend"],
        "colors": {
            "neutral": ["white", "black"],
            "accent": ["bright red", "electric blue", "yellow", "orange", "purple", "hot pink"]
        },
        "product_count": 90,
        "gender_split": {"female": 0.50, "unisex": 0.35, "male": 0.15}
    },
    
    "SimpleStack": {
        "id": "SMPST",
        "merchant": "SIMPLESTACK_BASICS",
        "name": "SimpleStack",
        "description": "Basics at accessible prices",
        "style_dna": "basic affordable functional simple",
        "price_multiplier": 0.8,
        "target_demo": "Value shoppers",
        "materials": ["Cotton Blend", "Basic Fleece", "Jersey"],
        "colors": {
            "neutral": ["white", "black", "grey", "navy", "khaki"],
            "accent": ["red", "green"]
        },
        "product_count": 110,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    },
    
    "ModernHeritage": {
        "id": "MDHER",
        "merchant": "MODERNHERITAGE_STYLE",
        "name": "ModernHeritage",
        "description": "Classic styles updated for today",
        "style_dna": "contemporary classic updated refined",
        "price_multiplier": 2.0,
        "target_demo": "Style-conscious professionals",
        "materials": ["Premium Cotton", "Wool Blend", "Structured Knit"],
        "colors": {
            "neutral": ["navy", "charcoal", "ivory", "camel"],
            "accent": ["burgundy", "forest green", "dusty blue"]
        },
        "product_count": 100,
        "gender_split": {"female": 0.45, "unisex": 0.35, "male": 0.20}
    }
}

# Color hex codes library
COLOR_HEX = {
    "black": "#000000",
    "white": "#FFFFFF",
    "grey": "#808080",
    "grey heather": "#8C8C8C",
    "charcoal": "#36454F",
    "navy": "#000080",
    "deep navy": "#00008B",
    "sand": "#E4D1B9",
    "forest green": "#228B22",
    "burgundy": "#58151C",
    "olive": "#808000",
    "rust orange": "#B7410E",
    "electric blue": "#7DF9FF",
    "acid green": "#B0BF1A",
    "stone grey": "#928E85",
    "off-white": "#FAF9F6",
    "taupe": "#483C32",
    "sage green": "#9DC183",
    "dusty rose": "#DCAE96",
    "steel blue": "#4682B4",
    "natural": "#F5F5DC",
    "earth brown": "#654321",
    "sage": "#B2AC88",
    "terracotta": "#E2725B",
    "ocean blue": "#4F42B5",
    "electric lime": "#CCFF00",
    "coral": "#FF7F50",
    "cyan": "#00FFFF",
    "ivory": "#FFFFF0",
    "camel": "#C19A6B",
    "deep red": "#8B0000",
    "royal blue": "#4169E1",
    "emerald": "#50C878",
    "khaki": "#F0E68C",
    "cream": "#FFFDD0",
    "oxford grey": "#8C92AC",
    "rust": "#B7410E",
    "graphite": "#251607",
    "carbon": "#1C1C1C",
    "slate": "#708090",
    "neon yellow": "#FFFF00",
    "cyber blue": "#00BFFF",
    "volt green": "#CEFF00",
    "mustard": "#FFDB58",
    "teal": "#008080",
    "plum": "#8E4585",
    "hot pink": "#FF69B4",
    "purple": "#800080",
    "yellow": "#FFFF00",
    "orange": "#FFA500",
    "bright red": "#FF0000",
    "red": "#FF0000",
    "green": "#008000",
    "blue": "#0000FF",
    "soft pink": "#FFB6C1",
    "light blue": "#ADD8E6",
    "lavender": "#E6E6FA",
    "mint": "#98FF98",
    "peach": "#FFDAB9",
    "beige": "#F5F5DC",
    "dusty blue": "#6B8E97"
}
