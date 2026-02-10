
import asyncio
import httpx
import json

async def test_outfit_build():
    url = "http://localhost:8000/ai/agent/query-stream"
    payload = {
        "message": "i need an aura minimalist mens outfit under 1000 euros casual style",
        "sessionType": "outfit_builder"
    }
    
    print(f"🚀 Sending query: {payload['message']}")
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    print(f"❌ Error: {response.status_code}")
                    print(await response.aread())
                    return

                ans = ""
                items = []
                vto_url = None
                
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    if line.startswith("data: "):
                        data = json.loads(line[6:])
                        
                        if data.get("kind") == "recommendations":
                            items = data.get("items", [])
                            ans = data.get("answer", "")
                            vto_url = data.get("vto_image_url")
                        elif data.get("event_type") == "category_candidates":
                            cat = data.get("category")
                            candidates = data.get("candidates", [])
                            print(f"🔍 Candidates for {cat}: {len(candidates)}")
                            for c in candidates:
                                if c.get('brand', '').lower() != 'aura minimalist':
                                    print(f"  ⚠️ Non-brand candidate: {c.get('title')} ({c.get('brand')})")
                
                print("\n✅ Final Outfit Summary:")
                print(f"Reasoning: {ans}")
                print(f"VTO Image: {vto_url}")
                
                total_price = 0
                brand_correct = True
                gender_correct = True
                
                for it in items:
                    print(f"DEBUG item: {it}")
                    price = it.get('price', 0)
                    total_price += price
                    brand = it.get('brand', '')
                    gender = it.get('gender', '')
                    
                    print(f"- {it.get('title')} | Brand: {brand} | Gender: {gender} | Price: €{price}")
                    
                    if brand and brand.lower() != 'aura minimalist':
                        brand_correct = False
                    if gender and (gender.lower() == 'female' or gender.lower() == 'womens'):
                        gender_correct = False
                
                print(f"\n💰 Total Price: €{total_price:.2f}")
                print(f"🏷️ Brand Check (Aura Minimalist): {'✅' if brand_correct else '❌'}")
                print(f"👤 Gender Check (Male): {'✅' if gender_correct else '❌'}")
                print(f"💸 Budget Check (< €1000): {'✅' if total_price <= 1000 else '❌'}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_outfit_build())
