#!/bin/bash
# Test Brand Onboarding API Endpoints
# Tests the complete 5-step registration flow

BASE_URL="http://127.0.0.1:8001"

echo "========================================="
echo "Testing Brand Onboarding API"
echo "========================================="
echo ""

# Step 1: Register Brand
echo "Step 1: Registering new brand..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/brands/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "Test Fashion Co",
    "contact_email": "test@fashion.com",
    "country": "DE",
    "brand_type": "direct"
  }')

echo "Response: $RESPONSE"
BRAND_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['brand_id'])" 2>/dev/null || echo "")

if [ -z "$BRAND_ID" ]; then
    echo "❌ Failed to create brand"
    exit 1
fi

echo "✅ Brand created: $BRAND_ID"
echo ""

# Step 2: Add Business Info
echo "Step 2: Adding business information..."
curl -s -X PATCH "$BASE_URL/api/brands/$BRAND_ID/business-info/" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_name": "John Doe",
    "contact_phone": "+49123456789",
    "company_registration": "DE123456789",
    "description": "Premium sustainable fashion brand"
  }' |python3 -m json.tool

echo "✅ Business info updated"
echo ""

# Step 3: Add Shipping Settings
echo "Step 3: Configuring shipping..."
curl -s -X PATCH "$BASE_URL/api/brands/$BRAND_ID/shipping/" \
  -H "Content-Type: application/json" \
  -d '{
    "ships_from_country": "DE"
  }' | python3 -m json.tool

echo "✅ Shipping configured"
echo ""

# Step 4: Skip Stripe Connect (MVP)
echo "Step 4: Skipping payment setup (MVP mode)..."
curl -s -X POST "$BASE_URL/api/brands/$BRAND_ID/stripe-connect/" \
  -H "Content-Type: application/json" | python3 -m json.tool

echo "✅ Payment setup skipped"
echo ""

# Step 5: Choose Integration Method
echo "Step 5: Selecting integration method..."
curl -s -X PATCH "$BASE_URL/api/brands/$BRAND_ID/integration/" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_method": "manual"
  }' | python3 -m json.tool

echo "✅ Integration method selected"
echo ""

# Verify: Get Brand Details
echo "========================================="
echo "Verification: Fetching brand details"
echo "========================================="
curl -s -X GET "$BASE_URL/api/brands/$BRAND_ID/" | python3 -m json.tool

echo ""
echo "========================================="
echo "✅ All tests completed successfully!"
echo "========================================="
echo "Brand ID: $BRAND_ID"
echo "Next step: Build frontend registration wizard"
