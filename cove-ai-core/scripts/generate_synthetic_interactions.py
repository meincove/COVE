"""
Generate synthetic user-item interaction data for testing collaborative filtering.
Creates realistic e-commerce interaction patterns.
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Product IDs from our embedded products
PRODUCT_IDS = [
    "CCH001", "CCT007", "CCB013", "CCJ017", "CCH101",
    "COH202", "COT208", "COB214", "COJ218", "CDH301",
    "CDT307", "CDB313", "CDJ317", "CLH401", "CLT407",
    "CLB413", "CLJ418", "COH501", "COT507", "COB513",
    "COJ517", "CDH601", "CDT607", "CDB613"
]

# User segments with different behavior patterns
USER_SEGMENTS = {
    "hoodie_lovers": {
        "size": 50,
        "preferences": ["hoodie"],
        "avg_interactions": 8
    },
    "tee_collectors": {
        "size": 40,
        "preferences": ["tee"],
        "avg_interactions": 12
    },
    "bomber_fans": {
        "size": 30,
        "preferences": ["bomber"],
        "avg_interactions": 6
    },
    "diverse_shoppers": {
        "size": 60,
        "preferences": ["hoodie", "tee", "bomber", "jacket"],
        "avg_interactions": 10
    },
    "casual_browsers": {
        "size": 100,
        "preferences": ["hoodie", "tee"],
        "avg_interactions": 3
    }
}

# Product type mapping (inferred from IDs)
PRODUCT_TYPES = {
    "CCH": "hoodie", "COH": "hoodie", "CDH": "hoodie", "CLH": "hoodie",
    "CCT": "tee", "COT": "tee", "CDT": "tee", "CLT": "tee",
    "CCB": "bomber", "COB": "bomber", "CDB": "bomber", "CLB": "bomber",
    "CCJ": "jacket", "COJ": "jacket", "CDJ": "jacket", "CLJ": "jacket"
}

INTERACTION_TYPES = ["view", "cart_add", "purchase"]
INTERACTION_WEIGHTS = {
    "view": 0.3,
    "cart_add": 0.6,
    "purchase": 1.0
}


def get_product_type(product_id: str) -> str:
    """Get product type from ID"""
    prefix = product_id[:3]
    return PRODUCT_TYPES.get(prefix, "unknown")


def generate_user_interactions(
    user_id: str,
    segment: Dict[str, Any],
    n_interactions: int
) -> List[Dict[str, Any]]:
    """Generate interactions for a single user based on their segment"""
    interactions = []
    preferred_types = segment["preferences"]
    
    # Filter products by user preferences
    if preferred_types:
        candidate_products = [
            p for p in PRODUCT_IDS 
            if get_product_type(p) in preferred_types
        ]
    else:
        candidate_products = PRODUCT_IDS
    
    if not candidate_products:
        candidate_products = PRODUCT_IDS
    
    # Generate interactions
    for _ in range(n_interactions):
        product_id = random.choice(candidate_products)
        
        # Interaction type probability (60% view, 30% cart, 10% purchase)
        rand = random.random()
        if rand < 0.6:
            interaction_type = "view"
        elif rand < 0.9:
            interaction_type = "cart_add"
        else:
            interaction_type = "purchase"
        
        # Timestamp (random within last 30 days)
        days_ago = random.randint(0, 30)
        timestamp = datetime.now() - timedelta(days=days_ago)
        
        interactions.append({
            "user_id": user_id,
            "item_id": product_id,
            "interaction_type": interaction_type,
            "weight": INTERACTION_WEIGHTS[interaction_type],
            "timestamp": timestamp.isoformat()
        })
    
    return interactions


def generate_synthetic_data() -> List[Dict[str, Any]]:
    """Generate complete synthetic dataset"""
    all_interactions = []
    user_counter = 1
    
    print("\n🎲 Generating Synthetic User-Item Interactions")
    print("=" * 70)
    
    for segment_name, segment_config in USER_SEGMENTS.items():
        print(f"\n📊 Segment: {segment_name}")
        print(f"   Users: {segment_config['size']}")
        print(f"   Preferences: {segment_config['preferences']}")
        print(f"   Avg interactions: {segment_config['avg_interactions']}")
        
        for i in range(segment_config['size']):
            user_id = f"user_{user_counter:04d}"
            user_counter += 1
            
            # Vary interactions around average
            n_interactions = max(1, int(random.gauss(
                segment_config['avg_interactions'],
                segment_config['avg_interactions'] * 0.3
            )))
            
            user_interactions = generate_user_interactions(
                user_id,
                segment_config,
                n_interactions
            )
            
            all_interactions.extend(user_interactions)
    
    print(f"\n{'='*70}")
    print(f"✅ Generated {len(all_interactions)} interactions for {user_counter-1} users")
    print(f"   Unique products: {len(set(i['item_id'] for i in all_interactions))}")
    print(f"{'='*70}\n")
    
    return all_interactions


if __name__ == "__main__":
    # Generate data
    interactions = generate_synthetic_data()
    
    # Save to file
    output_file = "synthetic_interactions.json"
    with open(output_file, 'w') as f:
        json.dump(interactions, f, indent=2)
    
    print(f"💾 Saved to {output_file}")
    
    # Quick stats
    print(f"\n📈 Quick Stats:")
    print(f"   Total interactions: {len(interactions)}")
    print(f"   Views: {sum(1 for i in interactions if i['interaction_type'] == 'view')}")
    print(f"   Cart adds: {sum(1 for i in interactions if i['interaction_type'] == 'cart_add')}")
    print(f"   Purchases: {sum(1 for i in interactions if i['interaction_type'] == 'purchase')}")
