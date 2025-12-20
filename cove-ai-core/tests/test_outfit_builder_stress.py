#!/usr/bin/env python3
"""
Comprehensive stress test for the Outfit Builder multi-agent system.
Tests edge cases, budget constraints, and semantic search quality.
"""

import json
import requests
import time
from typing import Dict, List, Any

BASE_URL = "http://localhost:8000"

class OutfitBuilderTester:
    def __init__(self):
        self.test_results = []
        self.passed = 0
        self.failed = 0
        
    def test_scenario(self, name: str, occasion: str, budget: int, style: str, 
                      expected_items: int = 2, max_price: int = None):
        """Test a single outfit scenario"""
        print(f"\n{'='*60}")
        print(f"🧪 TEST: {name}")
        print(f"   Occasion: {occasion} | Budget: €{budget} | Style: {style}")
        print(f"{'='*60}")
        
        # Simulate the Build Outfit query
        query = f"Build me an outfit for {occasion}, budget {budget}, style {style}"
        
        try:
            # Call the orchestrator endpoint
            response = requests.post(
                f"{BASE_URL}/ai/agent/query-stream",
                json={
                    "message": query,
                    "clerkUserId": "test_user",
                    "guestSessionId": "test_session"
                },
                stream=True,
                timeout=30
            )
            
            # Parse streaming response (Server-Sent Events format)
            full_data = {}
            all_items = []
            
            for line in response.iter_lines():
                if line:
                    try:
                        line_str = line.decode('utf-8')
                        
                        # SSE format: "data: {json}"
                        if line_str.startswith('data: '):
                            json_str = line_str[6:]  # Remove "data: " prefix
                            data = json.loads(json_str)
                            
                            # Collect items from batches
                            if 'items' in data:
                                all_items.extend(data['items'])
                            
                            # Get final done data
                            if data.get('kind') == 'recommendations':
                                full_data = data
                                
                    except Exception as e:
                        continue
            
            # Use collected items if available
            items = all_items if all_items else full_data.get('items', [])
            answer = full_data.get('answer', '')
            
            # Validation
            success = True
            issues = []
            
            # Check: Found items
            if len(items) < expected_items:
                success = False
                issues.append(f"Expected {expected_items} items, got {len(items)}")
            
            # Check: Budget respected
            if max_price:
                over_budget = [i for i in items if float(i.get('price', 0) or 0) > max_price]
                if over_budget:
                    success = False
                    issues.append(f"Items over €{max_price}: {[i.get('title') for i in over_budget]}")
            
            # Check: No duplicates
            slugs = [i.get('slug') for i in items]
            if len(slugs) != len(set(slugs)):
                success = False
                issues.append("Duplicate products found!")
            
            # Results
            if success:
                print(f"✅ PASSED")
                self.passed += 1
            else:
                print(f"❌ FAILED: {', '.join(issues)}")
                self.failed += 1
            
            # Details
            print(f"\n📦 Items found: {len(items)}")
            for item in items:
                price = item.get('price', 'N/A')
                print(f"   - {item.get('title', 'Unknown')}: €{price} ({item.get('type', '?')})")
            
            if answer:
                print(f"\n💬 Agent: {answer[:150]}...")
            
            self.test_results.append({
                'name': name,
                'success': success,
                'items_found': len(items),
                'issues': issues
            })
            
            return success
            
        except Exception as e:
            print(f"❌ ERROR: {e}")
            self.failed += 1
            self.test_results.append({
                'name': name,
                'success': False,
                'items_found': 0,
                'issues': [str(e)]
            })
            return False
    
    def run_all_tests(self):
        """Execute comprehensive test suite"""
        print("\n" + "="*60)
        print("🚀 OUTFIT BUILDER STRESS TEST SUITE")
        print("="*60)
        
        # Test 1: Extremely tight budget
        self.test_scenario(
            "Extremely Tight Budget (€30)",
            occasion="casual hangout",
            budget=30,
            style="basic",
            expected_items=1,  # Might only find 1 item
            max_price=30
        )
        
        time.sleep(2)
        
        # Test 2: Very high budget
        self.test_scenario(
            "High Budget (€500)",
            occasion="luxury dinner",
            budget=500,
            style="professional",
            expected_items=2,
            max_price=500
        )
        
        time.sleep(2)
        
        # Test 3: Conflicting style/occasion
        self.test_scenario(
            "Conflicting Style (streetwear for formal)",
            occasion="wedding",
            budget=200,
            style="streetwear",
            expected_items=1  # Might struggle to find matches
        )
        
        time.sleep(2)
        
        # Test 4: Standard case
        self.test_scenario(
            "Standard Case (business meeting)",
            occasion="client meeting",
            budget=150,
            style="professional",
            expected_items=2,
            max_price=150
        )
        
        time.sleep(2)
        
        # Test 5: Budget forces tradeoffs
        self.test_scenario(
            "Budget Tradeoffs (€80)",
            occasion="date night",
            budget=80,
            style="casual",
            expected_items=2,
            max_price=80
        )
        
        time.sleep(2)
        
        # Test 6: Unusual occasion
        self.test_scenario(
            "Unusual Occasion (gym workout)",
            occasion="gym workout",
            budget=100,
            style="casual",
            expected_items=2,
            max_price=100
        )
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"📈 Success Rate: {(self.passed/(self.passed+self.failed)*100):.1f}%")
        print()
        
        # Detailed failures
        if self.failed > 0:
            print("❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['name']}: {result['issues']}")
        
        return self.passed, self.failed

if __name__ == "__main__":
    tester = OutfitBuilderTester()
    passed, failed = tester.run_all_tests()
    
    exit(0 if failed == 0 else 1)
