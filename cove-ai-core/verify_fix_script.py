import requests
import json
import os

# Configuration
BASE_URL = "http://localhost:8000"
QUERY = "need Men's Aura Minimalist outfit casual under 800 euros"

def verify_response():
    print(f"🚀 Sending query: '{QUERY}'...")
    
    payload = {
        "message": QUERY,
        "clerkUserId": "verify_script_user",
        "guestSessionId": "verify_session_123",
        "sessionType": "outfit_builder" # Force outfit builder flow
    }
    
    try:
        r = requests.post(f"{BASE_URL}/ai/agent/query", json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        
        # Verify result structure
        items = data.get("items", [])
        answer = data.get("answer", "")
        
        print(f"\n✅ Response Received!")
        print(f"   Answer: {answer}")
        print(f"   Total Items: {len(items)}\n")
        
        total_price = 0
        categories_seen = set()
        brands_seen = []
        broken_images = []
        
        print("🔍 Inspecting Items:")
        for item in items:
            title = item.get("title", "Unknown")
            price = float(item.get("price") or 0)
            category = item.get("category") or item.get("type", "unknown")
            brand = item.get("brand") or "Unknown"
            image_url = item.get("imageUrl") or ""
            slug = item.get("slug", "")
            
            # Check structure/category mapping
            # Note: category field might not be in AgentItem top level, sometimes injected in description or debug
            # But let's check duplicates
            
            total_price += price
            brands_seen.append(brand)
            
            # Check Image
            img_status = "✅ Valid"
            if not image_url or "http" not in image_url or "/static/" in image_url:
                img_status = "❌ BROKEN/RELATIVE"
                broken_images.append(slug)
            
            print(f"   - [{category.upper()}] {title}")
            print(f"     Price: €{price}")
            print(f"     Brand: {brand}")
            print(f"     Image: {image_url[:50]}... ({img_status})")
            
            # Check duplicates (skip accessories as duplicates are allowed? No, strict mode says 1 per slot)
            # Actually AgentItem doesn't strictly have 'category' field unless we put it there.
            # We'll infer from title/type
            
        print("\n📊 Final Report:")
        
        # 1. Budget
        print(f"   💰 Total Price: €{total_price:.2f}")
        if total_price > 800:
            print("   ❌ FAILED: Budget Exceeded (>800)")
        else:
            print("   ✅ PASSED: Within Budget")
            
        # 2. Brand
        non_aura = [b for b in brands_seen if "aura" not in b.lower()]
        if non_aura:
            print(f"   ❌ FAILED: Brand Leakage Detected! Found: {non_aura}")
        else:
            print(f"   ✅ PASSED: All items are Aura")
            
        # 3. Structure
        if len(items) > 5:
             print(f"   ⚠️ WARNING: High item count ({len(items)}). Potential duplicates?")
        else:
             print(f"   ✅ PASSED: Clean structure ({len(items)} items)")
             
        # 4. Images
        if broken_images:
            print(f"   ❌ FAILED: Broken Images found: {broken_images}")
        else:
            print("   ✅ PASSED: All images valid absolute URLs")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_response()
