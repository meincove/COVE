"""
Comprehensive Multi-Turn Context Test with Rich Product Details

Tests:
- 10-15 turn conversation
- Multiple products from different brands
- Detailed questions about material, fabric, care, style
- Product comparisons
- Context switching
- Long-term memory
"""

import asyncio
import httpx
import json
from typing import List, Dict, Any

SESSION_ID = "comprehensive_context_test"
AI_CORE_URL = "http://localhost:8000"
DJANGO_URL = "http://localhost:8001"

class ConversationTester:
    def __init__(self):
        self.turn_number = 0
        self.all_facts = []
        
    async def send_message(self, message: str, client: httpx.AsyncClient) -> Dict[str, Any]:
        """Send a message and return the response"""
        self.turn_number += 1
        print(f"\n{'='*80}")
        print(f"TURN {self.turn_number}: {message}")
        print('='*80)
        
        try:
            r = await client.post(
                f"{AI_CORE_URL}/ai/agent/query",
                json={"message": message, "guestSessionId": SESSION_ID},
                timeout=60.0
            )
            data = r.json()
            
            # Print response
            answer = data.get('answer', '')
            items = data.get('items', [])
            
            print(f"\n🤖 AI Response:")
            print(f"   {answer[:200]}{'...' if len(answer) > 200 else ''}")
            
            if items:
                print(f"\n📦 Showed {len(items)} products:")
                for i, item in enumerate(items[:3], 1):
                    print(f"   {i}. {item.get('title')} - {item.get('tier')} tier")
                    if item.get('material'):
                        print(f"      Material: {item.get('material')}")
                    if item.get('fit'):
                        print(f"      Fit: {item.get('fit')}")
            
            return data
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return {}
    
    async def check_facts(self, client: httpx.AsyncClient) -> Dict[str, Any]:
        """Check what facts have been extracted"""
        try:
            r = await client.get(
                f"{DJANGO_URL}/ai_profiles/session/facts/get/",
                params={"guest_session_id": SESSION_ID},
                timeout=5.0
            )
            facts = r.json().get("facts", {})
            self.all_facts.append(facts)
            return facts
        except Exception as e:
            print(f"⚠️  Couldn't fetch facts: {e}")
            return {}
    
    def analyze_facts(self, facts: Dict[str, Any]):
        """Analyze and print fact quality"""
        products = facts.get("product_focus", {}).get("current_products", [])
        
        print(f"\n📊 FACTS ANALYSIS:")
        print(f"   Products in memory: {len(products)}")
        
        if products:
            # Check first product details
            product = products[0]
            details = product.get("full_details", {})
            
            print(f"\n   First product: {product.get('name')}")
            print(f"   Has material? {'✅' if details.get('material') else '❌'}")
            print(f"   Has fit? {'✅' if details.get('fit') else '❌'}")
            print(f"   Has fabric? {'✅' if details.get('fabric') else '❌'}")
            print(f"   Has style? {'✅' if details.get('style') else '❌'}")
            print(f"   Has care? {'✅' if details.get('care') else '❌'}")
            
            # Count rich details
            rich_count = sum([
                bool(details.get('material')),
                bool(details.get('fit')),
                bool(details.get('fabric')),
                bool(details.get('style')),
                bool(details.get('care'))
            ])
            
            print(f"\n   Rich detail score: {rich_count}/5 ({rich_count*20}%)")

async def run_comprehensive_test():
    print("\n" + "="*80)
    print("COMPREHENSIVE MULTI-TURN CONTEXT TEST")
    print("Testing: Rich product details, multi-brand, context switching")
    print("="*80)
    
    tester = ConversationTester()
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        
        # Turn 1: Discover hoodies
        await tester.send_message("show me hoodies", client)
        await asyncio.sleep(3)
        
        # Turn 2: Ask about material of first hoodie
        await tester.send_message("what's the material of the first one?", client)
        await asyncio.sleep(3)
        
        # Turn 3: Ask about care instructions
        await tester.send_message("how do I care for it?", client)
        await asyncio.sleep(3)
        
        # Turn 4: Ask about fabric details
        await tester.send_message("tell me about the fabric - is it warm?", client)
        await asyncio.sleep(3)
        
        # Turn 5: Compare with second hoodie
        await tester.send_message("how does it compare to the second hoodie you showed?", client)
        await asyncio.sleep(3)
        
        # Turn 6: Switch to tees
        await tester.send_message("now show me some tees", client)
        await asyncio.sleep(3)
        
        # Turn 7: Ask about tee material
        await tester.send_message("what's the material of the first tee?", client)
        await asyncio.sleep(3)
        
        # Turn 8: Go back to hoodies
        await tester.send_message("go back to the hoodies - what was the fit of the first one?", client)
        await asyncio.sleep(3)
        
        # Turn 9: Ask about style
        await tester.send_message("what's the style/vibe of that hoodie?", client)
        await asyncio.sleep(3)
        
        # Turn 10: Show bombers
        await tester.send_message("show me bombers", client)
        await asyncio.sleep(3)
        
        # Turn 11: Compare bomber to hoodie
        await tester.send_message("how does the first bomber compare to the hoodie I liked earlier?", client)
        await asyncio.sleep(3)
        
        # Turn 12: Ask about bomber fabric
        await tester.send_message("what's the fabric weight of this bomber?", client)
        await asyncio.sleep(3)
        
        # Turn 13: Show pants
        await tester.send_message("show me pants", client)
        await asyncio.sleep(3)
        
        # Turn 14: Ask about pants material
        await tester.send_message("what material are these pants?", client)
        await asyncio.sleep(3)
        
        # Turn 15: Final context check - reference multiple products
        await tester.send_message("which of all the items you showed me would be best for winter?", client)
        await asyncio.sleep(5)
        
        # Final fact check
        print("\n" + "="*80)
        print("FINAL FACT CHECK")
        print("="*80)
        
        facts = await tester.check_facts(client)
        tester.analyze_facts(facts)
        
        # Print summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"✅ Completed {tester.turn_number} turns")
        print(f"✅ Tested multiple product types (hoodies, tees, bombers, pants)")
        print(f"✅ Asked detailed questions (material, fabric, care, style)")
        print(f"✅ Tested context switching and comparisons")
        
        products = facts.get("product_focus", {}).get("current_products", [])
        print(f"\n📊 Final Results:")
        print(f"   Products in memory: {len(products)}")
        
        if products:
            rich_products = sum(1 for p in products if p.get("full_details", {}).get("material"))
            print(f"   Products with rich details: {rich_products}/{len(products)}")
            print(f"   Rich detail rate: {(rich_products/len(products)*100):.0f}%")

if __name__ == "__main__":
    asyncio.run(run_comprehensive_test())
