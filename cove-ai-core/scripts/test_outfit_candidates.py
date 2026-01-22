"""
Quick test to see what candidates are being generated for outfit queries
"""
import asyncio
import sys
import json
from pathlib import Path

# Adjust path to import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import after path adjustment
import os
os.environ.setdefault("DATABASE_URL", os.getenv("PG_DSN", ""))

from app.agents.stylist_agent import StylistAgent

async def test_outfit_candidates():
    """Test what candidates are generated for an outfit request"""
    
    # Create agent without passing store - it will initialize its own
    agent = StylistAgent(name="test_stylist")
    
    # Test 1: Casual date outfit
    print("\n" + "="*80)
    print("TEST 1: 'I need a casual date outfit for my girlfriend'")
    print("="*80)
    
    try:
        result = await agent.execute(
            query="I need a casual date outfit for my girlfriend",
            context={}
        )
        
        print(f"\n📊 RESULT:")
        print(f"   Status: {result.get('status')}")
        print(f"   Next Action: {result.get('next_action')}")
        
        if result.get('data'):
            data = result['data']
            print(f"\n📋 DATA:")
            print(f"   Occasion: {data.get('occasion')}")
            print(f"   Gender: {data.get('gender')}")
            
            if 'candidates' in data:
                print(f"\n🎯 CANDIDATES ({len(data['candidates'])} total):")
                for i, cand in enumerate(data['candidates'][:15], 1):  # Show first 15
                    print(f"   {i}. {cand.get('title')} - {cand.get('type')} ({cand.get('color')})")
            
            if 'search_payload' in data:
                print(f"\n🔍 SEARCH_PAYLOAD:")
                payload = data['search_payload']
                print(f"   Query: {payload.get('natural_query')}")
                print(f"   Filters: {json.dumps(payload.get('filters'), indent=2)}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 2: Formal outfit for men
    print("\n" + "="*80)
    print("TEST 2: 'I need a formal outfit for a wedding'")
    print("="*80)
    
    try:
        result2 = await agent.execute(
            query="I need a formal outfit for a wedding",
            context={}
        )
        
        print(f"\n📊 RESULT:")
        print(f"   Status: {result2.get('status')}")
        print(f"   Next Action: {result2.get('next_action')}")
        
        if result2.get('data'):
            data2 = result2['data']
            print(f"\n📋 DATA:")
            print(f"   Occasion: {data2.get('occasion')}")
            print(f"   Gender: {data2.get('gender')}")
            
            if 'candidates' in data2:
                print(f"\n🎯 CANDIDATES ({len(data2['candidates'])} total):")
                for i, cand in enumerate(data2['candidates'][:15], 1):
                    print(f"   {i}. {cand.get('title')} - {cand.get('type')} ({cand.get('color')})")
            
            if 'search_payload' in data2:
                print(f"\n🔍 SEARCH_PAYLOAD:")
                payload2 = data2['search_payload']
                print(f"   Query: {payload2.get('natural_query')}")
                print(f"   Filters: {json.dumps(payload2.get('filters'), indent=2)}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_outfit_candidates())
