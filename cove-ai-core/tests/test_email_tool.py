#!/usr/bin/env python3
"""
Test script for email tool functionality.

Tests the email_send_order_confirmation tool to understand how it works.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.cove_ai_tools import emails


async def test_email_tool():
    """Test the email tool with sample data."""
    print("\n" + "="*60)
    print("EMAIL TOOL TEST - How It Works")
    print("="*60)
    
    print("\n📧 Email Tool: email_send_order_confirmation")
    print("   Purpose: Send order confirmation emails to customers")
    print("   Backend: Calls Django /api/orders/email endpoint")
    
    # Test 1: Show required fields
    print("\n1️⃣  Required Fields:")
    print("   - orderId: The order ID to send confirmation for")
    print("   - email: Recipient email address")
    
    # Test 2: Show optional fields
    print("\n2️⃣  Optional Fields:")
    print("   - clerkUserId: For authenticated users")
    print("   - guestSessionId: For guest users")
    
    # Test 3: Show what it does
    print("\n3️⃣  What It Does:")
    print("   Step 1: Validates inputs (orderId + email required)")
    print("   Step 2: Calls Django backend: POST /api/orders/email")
    print("   Step 3: Backend fetches order details")
    print("   Step 4: Backend generates email template")
    print("   Step 5: Backend queues email for sending")
    print("   Step 6: Returns success/failure status")
    
    # Test 4: Example call
    print("\n4️⃣  Example Usage:")
    print("""
    result = await emails.email_send_order_confirmation({
        "orderId": 123,
        "email": "customer@example.com",
        "clerkUserId": "user_abc123"  # optional
    })
    
    # Success response:
    {
        "ok": True,
        "data": {
            "message": "Order confirmation email sent",
            "orderId": 123,
            "emailSent": True
        },
        "error": None
    }
    """)
    
    # Test 5: Actual test (if backend is running)
    print("\n5️⃣  Live Test (requires backend running):")
    print("   Testing with sample data...")
    
    try:
        result = await emails.email_send_order_confirmation({
            "orderId": 999999,  # Fake order ID
            "email": "test@example.com"
        })
        
        if result["ok"]:
            print(f"   ✅ Success: {result['data']['message']}")
        else:
            print(f"   ℹ️  Expected error (fake order): {result['error']}")
            print("   This is normal - test order doesn't exist")
    
    except Exception as e:
        print(f"   ℹ️  Backend not responding: {e}")
        print("   Make sure Django backend is running on http://localhost:8001")
    
    # Test 6: How to use in agent
    print("\n6️⃣  How Agent Uses It:")
    print("""
    User: "Send me a confirmation email"
    
    Agent Process:
    1. Identifies user (clerkUserId or email)
    2. Finds recent order (via order_get_status)
    3. Calls email_send_order_confirmation with:
       - orderId from step 2
       - email from user profile
    4. Responds: "✓ Confirmation email sent to your@email.com"
    """)
    
    # Test 7: Error cases
    print("\n7️⃣  Error Handling:")
    print("   Missing orderId → Error: 'orderId required'")
    print("   Missing email → Error: 'email required'")
    print("   Invalid order → Backend error: 'Order not found'")
    print("   Backend down → Error: 'Failed to send email'")
    
    print("\n" + "="*60)
    print("✅ Email Tool Overview Complete!")
    print("="*60)
    
    return True


async def test_integration_flow():
    """Test realistic integration flow."""
    print("\n" + "="*60)
    print("REALISTIC INTEGRATION TEST")
    print("="*60)
    
    print("\nScenario: User wants order confirmation email")
    print("\nStep 1: Get user's recent orders")
    
    try:
        from app.cove_ai_tools import orders
        
        # Simulate getting orders
        orders_result = await orders.order_get_status({
            "clerkUserId": "test_user_123",
            "limit": 1
        })
        
        if orders_result["ok"] and orders_result["data"]["orders"]:
            order = orders_result["data"]["orders"][0]
            print(f"   ✅ Found order #{order['orderId']}")
            
            print("\nStep 2: Send confirmation email")
            email_result = await emails.email_send_order_confirmation({
                "orderId": order["orderId"],
                "email": "user@example.com",
                "clerkUserId": "test_user_123"
            })
            
            if email_result["ok"]:
                print(f"   ✅ {email_result['data']['message']}")
            else:
                print(f"   ⚠️  {email_result['error']}")
        else:
            print("   ℹ️  No orders found (expected if testing)")
    
    except Exception as e:
        print(f"   ℹ️  Integration test skipped: {e}")
        print("   (Requires Django backend running)")


async def main():
    """Run all tests."""
    await test_email_tool()
    await test_integration_flow()


if __name__ == "__main__":
    asyncio.run(main())
