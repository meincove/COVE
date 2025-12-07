#!/bin/bash
# Test script for send-receipt endpoint
# Run this after creating at least one order in the system

echo "Testing send-receipt endpoint..."
echo ""

# Test 1: Missing orderId (should fail with 400)
echo "Test 1: Missing orderId"
curl -X POST http://127.0.0.1:8001/api/orders/send-receipt/ \
  -H "Content-Type: application/json" \
  -d '{}'
echo -e "\n"

# Test 2: Non-existent order (should fail with 404)
echo "Test 2: Non-existent order"
curl -X POST http://127.0.0.1:8001/api/orders/send-receipt/ \
  -H "Content-Type: application/json" \
  -d '{"orderId": 99999}'
echo -e "\n"

# Test 3: Valid order (REPLACE 1 with actual order ID from your DB)
echo "Test 3: Valid order (you need to replace orderId with a real one)"
curl -X POST http://127.0.0.1:8001/api/orders/send-receipt/ \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "forceResend": false}'
echo -e "\n"

echo "Tests complete!"
