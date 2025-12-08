"""
Seed Neo4j database with product catalog data.
Standalone script - no app dependencies needed.
"""

import json
import os
from pathlib import Path

try:
    from neo4j import GraphDatabase
except ImportError:
    print("❌ neo4j package not installed")
    print("   Install with: pip install neo4j")
    exit(1)

# Get Neo4j credentials from environment
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not NEO4J_PASSWORD:
    print("❌ NEO4J_PASSWORD environment variable not set")
    exit(1)

def load_product_data():
    """Load product data from JSON file"""
    data_path = Path(__file__).parent.parent / "data" / "products.json"
    
    if not data_path.exists():
        print(f"⚠️  Product data not found at {data_path}")
        print("   Using sample data...")
        return create_sample_products()
    
    with open(data_path) as f:
        return json.load(f)

def create_sample_products():
    """Create sample product data if JSON doesn't exist"""
    return {
        "products": [
            {
                "id": "prod_hoodie_designer",
                "slug": "hoodie-designer-fleece-59.99",
                "title": "Cove Designer Hoodie",
                "type": "hoodie",
                "tier": "designer",
                "price": 59.99,
                "currency": "EUR",
                "colors": ["jet black", "deep charcoal", "stone beige"],
                "sizes": ["XS", "S", "M", "L", "XL"],
                "description": "Premium fleece hoodie with modern silhouette",
                "in_stock": True
            },
            {
                "id": "prod_tee_designer",
                "slug": "tee-designer-structured-34.99",
                "title": "Cove Designer Structured Tee",
                "type": "tee",
                "tier": "designer",
                "price": 34.99,
                "currency": "EUR",
                "colors": ["jet black", "ink navy", "stone grey"],
                "sizes": ["XS", "S", "M", "L", "XL"],
                "description": "Structured cotton tee with refined details",
                "in_stock": True
            }
        ]
    }

def seed_products(session, products):
    """Seed products into Neo4j"""
    
    # Clear existing products (CAUTION: removes all products!)
    print("🗑️  Clearing existing products...")
    session.run("MATCH (p:Product) DETACH DELETE p")
    
    # Create products
    print(f"📦 Creating {len(products)} products...")
    
    for product in products:
        query = """
        CREATE (p:Product {
            id: $id,
            slug: $slug,
            title: $title,
            type: $type,
            tier: $tier,
            price: $price,
            currency: $currency,
            description: $description,
            in_stock: $in_stock
        })
        """
        
        session.run(query, **product)
        print(f"   ✅ {product['title']}")

def verify_seed(session):
    """Verify products were seeded correctly"""
    result = session.run("MATCH (p:Product) RETURN count(p) as count")
    count = result.single()["count"]
    
    print(f"\n📊 Verification: {count} products in database")
    return count > 0

def main():
    print("\n" + "="*50)
    print("🌱 Neo4j Product Seeding")
    print("="*50 + "\n")
    
    # Load data
    data = load_product_data()
    products = data.get("products", [])
    
    if not products:
        print("❌ No products to seed")
        return 1
    
    # Connect to Neo4j
    print(f"🔌 Connecting to {NEO4J_URI}...")
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        print("✅ Connected to Neo4j\n")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return 1
    
    try:
        with driver.session() as session:
            # Seed products
            seed_products(session, products)
            
            # Verify
            if verify_seed(session):
                print("\n🎉 Seeding complete!")
                return 0
            else:
                print("\n❌ Seeding verification failed")
                return 1
                
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        driver.close()

if __name__ == "__main__":
    exit(main())


def load_product_data():
    """Load product data from JSON file"""
    data_path = Path(__file__).parent.parent / "data" / "products.json"
    
    if not data_path.exists():
        print(f"❌ Product data not found at {data_path}")
        print("   Creating sample data...")
        return create_sample_products()
    
    with open(data_path) as f:
        return json.load(f)

def create_sample_products():
    """Create sample product data if JSON doesn't exist"""
    return {
        "products": [
            {
                "id": "prod_001",
                "slug": "hoodie-designer-fleece-59.99",
                "title": "Cove Designer Hoodie",
                "type": "hoodie",
                "tier": "designer",
                "price": 59.99,
                "currency": "EUR",
                "colors": ["jet black", "deep charcoal", "stone beige"],
                "sizes": ["XS", "S", "M", "L", "XL"],
                "description": "Premium fleece hoodie with modern silhouette",
                "in_stock": True
            },
            {
                "id": "prod_002",
                "slug": "tee-designer-structured-34.99",
                "title": "Cove Designer Structured Tee",
                "type": "tee",
                "tier": "designer",
                "price": 34.99,
                "currency": "EUR",
                "colors": ["jet black", "ink navy", "stone grey"],
                "sizes": ["XS", "S", "M", "L", "XL"],
                "description": "Structured cotton tee with refined details",
                "in_stock": True
            }
        ]
    }

def seed_products(driver, products):
    """Seed products into Neo4j"""
    
    with driver.session() as session:
        # Clear existing products (optional - remove in production)
        print("🗑️  Clearing existing products...")
        session.run("MATCH (p:Product) DETACH DELETE p")
        
        # Create products
        print(f"📦 Creating {len(products)} products...")
        
        for product in products:
            query = """
            CREATE (p:Product {
                id: $id,
                slug: $slug,
                title: $title,
                type: $type,
                tier: $tier,
                price: $price,
                currency: $currency,
                description: $description,
                in_stock: $in_stock
            })
            """
            
            session.run(query, **product)
            
            # Create color variants
            for color in product.get("colors", []):
                variant_query = """
                MATCH (p:Product {id: $product_id})
                CREATE (v:Variant {
                    id: $variant_id,
                    color: $color,
                    product_id: $product_id
                })
                CREATE (p)-[:HAS_VARIANT]->(v)
                """
                
                variant_id = f"{product['id']}_{color.replace(' ', '_')}"
                session.run(variant_query, 
                           product_id=product["id"],
                           variant_id=variant_id,
                           color=color)
            
            print(f"   ✅ {product['title']}")

def verify_seed(driver):
    """Verify products were seeded correctly"""
    with driver.session() as session:
        result = session.run("MATCH (p:Product) RETURN count(p) as count")
        count = result.single()["count"]
        
        print(f"\n✅ Verification: {count} products in database")
        return count > 0

def main():
    print("================================")
    print("🌱 Neo4j Product Seeding")
    print("================================\n")
    
    # Load data
    data = load_product_data()
    products = data.get("products", [])
    
    if not products:
        print("❌ No products to seed")
        return
    
    # Connect to Neo4j using existing connection
    print(f"🔌 Connecting to Neo4j...")
    driver = get_conn_sync()
    
    try:
        # Test connection
        driver.verify_connectivity()
        print("✅ Connected to Neo4j\n")
        
        # Seed products
        seed_products(driver, products)
        
        # Verify
        if verify_seed(driver):
            print("\n🎉 Seeding complete!")
        else:
            print("\n❌ Seeding verification failed")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise
    finally:
        driver.close()

if __name__ == "__main__":
    main()
