#!/usr/bin/env python3
"""
Test Analytics Tracking - Generate Sample Data

This script generates test interactions to verify the analytics system works
"""

import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8001"

# Sample test data
test_events = [
    {
        "user_id": "test_user_1",
        "product_id": "CCH001",
        "interaction_type": "view_item",
        "session_id": "test_session_123",
        "time_on_page": 45,
        "scroll_depth": 80,
        "consent_given": True,
        "metadata": {
            "product_name": "Cove Classic Hoodie",
            "price": 89.99,
            "test": True
        }
    },
    {
        "user_id": "test_user_1",
        "product_id": "CCH001",
        "interaction_type": "add_to_cart",
        "session_id": "test_session_123",
        "time_on_page": 60,
        "scroll_depth": 90,
        "consent_given": True,
        "metadata": {
            "product_name": "Cove Classic Hoodie",
            "from_page": "product_detail",
            "test": True
        }
    },
    {
        "user_id": "test_user_2",
        "product_id": "CCT007",
        "interaction_type": "view_item",
        "session_id": "test_session_456",
        "time_on_page": 30,
        "scroll_depth": 50,
        "consent_given": True,
        "metadata": {
            "product_name": "Cove Classic Tee",
            "price": 49.99,
            "test": True
        }
    },
    {
        "user_id": "anon_xyz",
        "product_id": "CCB012",
        "interaction_type": "view_item",
        "session_id": "test_session_789",
        "time_on_page": 20,
        "scroll_depth": 30,
        "consent_given": False,  # No consent - will be anonymized
        "metadata": {
            "product_name": "Cove Bomber Jacket",
            "test": True
        }
    },
]

def test_single_tracking():
    """Test single event tracking"""
    print("\n🧪 Testing single event tracking...")
    
    url = f"{API_BASE}/api/analytics/track"
    response = requests.post(url, json=test_events[0])
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Single event tracked successfully!")
        print(f"   ID: {data.get('id')}")
        print(f"   CF Weight: {data.get('cf_weight')}")
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

def test_batch_tracking():
    """Test batch event tracking"""
    print("\n🧪 Testing batch event tracking...")
    
    url = f"{API_BASE}/api/analytics/track-batch"
    response = requests.post(url, json={"events": test_events})
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Batch tracked successfully!")
        print(f"   Events created: {data.get('count')}")
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")

def test_analytics_stats():
    """Test analytics stats endpoint (requires admin)"""
    print("\n🧪 Testing analytics stats...")
    print("⚠️  Note: This requires admin authentication")
    
    # This will likely fail without auth, which is expected
    url = f"{API_BASE}/api/analytics/stats"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Stats retrieved:")
            print(f"   Total interactions: {data.get('stats', {}).get('total_interactions')}")
            print(f"   Last 24h: {data.get('stats', {}).get('last_24h')}")
        else:
            print(f"⚠️  Auth required (expected): {response.status_code}")
    except Exception as e:
        print(f"⚠️  Error: {e}")

def main():
    print("=" * 60)
    print("🧪 ANALYTICS TRACKING TEST")
    print("=" * 60)
    
    print(f"\n📡 API Base: {API_BASE}")
    print(f"📊 Test Events: {len(test_events)}")
    
    try:
        # Test single tracking
        test_single_tracking()
        
        # Test batch tracking
        test_batch_tracking()
        
        # Test stats
        test_analytics_stats()
        
        print("\n" + "=" * 60)
        print("✅ TEST COMPLETE!")
        print("=" * 60)
        print("\n📊 View data in Django Admin:")
        print(f"   URL: {API_BASE}/admin/analytics/userinteraction/")
        print("   Login: meincove@gmail.com")
        print("   Filter: Look for events with 'test: true' in metadata")
        print()
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend")
        print(f"   Make sure Django is running: python manage.py runserver 8001")
        print()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print()

if __name__ == "__main__":
    main()
