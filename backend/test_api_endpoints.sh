#!/bin/bash
# API endpoint tests for security improvements

echo "======================================================"
echo "Testing Cart API with Validation"
echo "======================================================"

BASE_URL="http://localhost:8001"

# Test 1: Valid cart add
echo -e "\n✓ Test 1: Add valid quantity to cart"
curl -s -X POST "${BASE_URL}/tools/cart.add" \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "TEST001",
    "size": "M",
    "quantity": 5,
    "clerkUserId": "user_test123"
  }' | python3 -m json.tool 2>/dev/null || echo "{response}"

# Test 2: Over-limit quantity
echo -e "\n\n✗ Test 2: Try adding over-limit quantity (should fail)"
curl -s -X POST "${BASE_URL}/tools/cart.add" \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "TEST001",
    "size": "M",
    "quantity": 150,
    "clerkUserId": "user_test123"
  }' | python3 -m json.tool 2>/dev/null || echo "{response}"

# Test 3: Negative quantity  
echo -e "\n\n✗ Test 3: Try adding negative quantity (should fail)"
curl -s -X POST "${BASE_URL}/tools/cart.add" \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "TEST001",
    "size": "M",
    "quantity": -5,
    "clerkUserId": "user_test123"
  }' | python3 -m json.tool 2>/dev/null || echo "{response}"

# Test 4: Zero quantity
echo -e "\n\n✗ Test 4: Try adding zero quantity (should fail)"
curl -s -X POST "${BASE_URL}/tools/cart.add" \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "TEST001",
    "size": "M",
    "quantity": 0,
    "clerkUserId": "user_test123"
  }' | python3 -m json.tool 2>/dev/null || echo "{response}"

echo -e "\n\n======================================================"
echo "Testing Health Endpoints"
echo "======================================================"

# Test 5: Health check
echo -e "\n✓ Test 5: Health check"
curl -s "${BASE_URL}/api/healthz" | python3 -m json.tool 2>/dev/null || echo "{response}"

# Test 6: Readiness check
echo -e "\n\n✓ Test 6: Readiness check"
curl -s "${BASE_URL}/api/readiness" | python3 -m json.tool 2>/dev/null || echo "{response}"

echo -e "\n\n======================================================"
echo "Test Complete!"
echo "======================================================"
echo "Check the responses above:"
echo "- Valid requests should succeed"
echo "- Invalid quantities should return validation errors"
echo "- Health endpoints should return OK"
