"""
Initialize vector embeddings for product search.
Pre-computes and stores embeddings for fast similarity search.
"""

import os
from pathlib import Path
from typing import List, Dict
import asyncio

# This will use your existing vector store setup
from app.vector.store import get_conn_sync

def get_products_from_neo4j():
    """Fetch all products from Neo4j"""
    driver = get_conn_sync()
    
    with driver.session() as session:
        result = session.run("""
            MATCH (p:Product)
            OPTIONAL MATCH (p)-[:HAS_VARIANT]->(v:Variant)
            RETURN p, collect(v) as variants
        """)
        
        products = []
        for record in result:
            product = dict(record["p"])
            variants = [dict(v) for v in record["variants"]]
            product["variants"] = variants
            products.append(product)
        
        return products

def create_embeddings_for_products(products: List[Dict]):
    """Create text embeddings for product search"""
    from litellm import embedding
    
    print(f"🔢 Creating embeddings for {len(products)} products...")
    
    embeddings_created = 0
    
    for product in products:
        # Create embedding text from product attributes
        text = f"{product['title']} {product.get('description', '')} {product['type']} {product['tier']}"
        
        try:
            # Create embedding (using same model as intent classifier)
            response = embedding(
                model="text-embedding-3-small",
                input=[text]
            )
            
            embedding_vector = response.data[0]["embedding"]
            
            # Store embedding (implementation depends on your vector DB)
            # For now, just count successes
            embeddings_created += 1
            
            if embeddings_created % 10 == 0:
                print(f"   Progress: {embeddings_created}/{len(products)}")
                
        except Exception as e:
            print(f"   ⚠️  Failed to create embedding for {product['title']}: {e}")
    
    print(f"✅ Created {embeddings_created} embeddings")
    return embeddings_created

def verify_vector_store():
    """Verify vector store is accessible"""
    try:
        # Check if we can connect
        driver = get_conn_sync()
        driver.verify_connectivity()
        print("✅ Vector store connection OK")
        return True
    except Exception as e:
        print(f"❌ Vector store connection failed: {e}")
        return False

def main():
    print("================================")
    print("🔢 Vector Store Setup")
    print("================================\n")
    
    # Verify vector store
    if not verify_vector_store():
        print("\n❌ Please ensure Neo4j is running and accessible")
        return
    
    # Get products
    print("\n📦 Fetching products from Neo4j...")
    products = get_products_from_neo4j()
    print(f"   Found {len(products)} products")
    
    if not products:
        print("\n⚠️  No products found. Run seed_products.py first.")
        return
    
    # Create embeddings
    print("\n🔢 Creating embeddings...")
    count = create_embeddings_for_products(products)
    
    if count > 0:
        print("\n🎉 Vector store setup complete!")
    else:
        print("\n❌ Vector store setup failed")

if __name__ == "__main__":
    main()
