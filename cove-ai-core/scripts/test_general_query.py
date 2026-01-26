
import asyncio
import httpx
import json

AGENT_API = "http://localhost:8000/ai/recs/suggest"

async def test_general_query():
    print(f"🔍 Testing General Query for 'Aura Minimalist' at {AGENT_API}...")
    
    payload = {
        "query": "show me Vortex Streetwear products",
        "top_k": 5,
        "filters": {
            "brand": "Vortex Streetwear"
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(AGENT_API, json=payload)
            
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])
            print(f"✅ Status 200. Found {len(items)} items.")
            
            aura_count = 0
            for item in items:
                title = item.get("title", "")
                slug = item.get("slug", "")
                img = item.get("imageUrl", "")
                print(f"   - {title}")
                print(f"     Slug: {slug}")
                print(f"     Img: {img}")
                brand_in_title = "Vortex" in title
                if brand_in_title:
                    aura_count += 1
            
            if aura_count > 0:
                print(f"\n🎉 Success! General chat found {aura_count} Aura Minimalist items.")
            else:
                print("\n⚠️  No Aura items found in top results. Search might need tuning.")
                
        else:
            print(f"❌ Error {resp.status_code}: {resp.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_general_query())
