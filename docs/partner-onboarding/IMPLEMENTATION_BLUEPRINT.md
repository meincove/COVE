# COVE Brand Onboarding - Implementation Blueprint

> **Purpose**: Step-by-step implementation guide from database to live production  
> **Status**: Master Blueprint - Follow This Exactly  
> **Last Updated**: January 2026

---

## 🔍 Critical Architecture Analysis

Before we code, let's address your concerns about **scalability, UX, enterprise readiness, and data structure**.

---

### ✅ What's Strong in Our Architecture

| Aspect | Strength | Evidence |
|--------|----------|----------|
| **Scalability** | Horizontal scaling ready | • Stateless API design<br>• Background job queue (Celery)<br>• Database indexing on all query fields<br>• CDN for images |
| **Data Normalization** | Single source of truth | • Universal COVE schema<br>• All sources map to same structure<br>• No data duplication |
| **Separation of Concerns** | Clean architecture | • Data ingestion layer separate from business logic<br>• Parser abstraction allows infinite source types<br>• Frontend decoupled from backend |
| **Automation** | Minimal human intervention | • AI auto-fills missing fields<br>• Smart auto-approval for verified brands<br>• Scheduled syncs for updates |
| **Flexibility** | Multi-path onboarding | • Manual, CSV, API, Shopify, Affiliate<br>• Each path optimized for brand type |

---

### ⚠️ Architecture Concerns & Solutions

#### Concern 1: Database Performance at Scale

**Issue**: With 1,000+ brands and 100,000+ products, query performance may degrade.

**Solutions Implemented**:
- ✅ Database indexes on all frequently queried fields (`brand_id`, `slug`, `is_active`, `sync_status`)
- ✅ Separate tables for brands, products, variants, sizes (normalized)
- ✅ Redis caching for hot data (popular products, brand info)

**Additional Recommendations**:
```python
# Add to models.py
class Meta:
    indexes = [
        models.Index(fields=['brand_id', 'is_active']),  # Composite index
        models.Index(fields=['sync_status', 'last_sync_at']),  # For cron jobs
        models.Index(fields=['onboarding_status']),  # For admin dashboard
    ]
```

**Testing Plan**: Load test with 10,000 products before launch

---

#### Concern 2: Image Storage Costs

**Issue**: Rehosting all images for direct brands could cost $$$

**Current Strategy**: Hybrid (link for affiliates, rehost for direct)

**Cost Optimization**:
- Use Cloudflare Images: $5/month for 100k images
- Lazy-load images on frontend
- Compress images on upload (WebP format, 85% quality)
- CDN caching reduces bandwidth

**Estimated Cost**: ~$10-20/month for 1,000 brands (assuming avg 5 products each)

---

#### Concern 3: UX Friction in Onboarding

**Issue**: Multi-step registration might cause drop-off

**Solutions**:
- ✅ **Save progress automatically** (no "lose your work" scenario)
- ✅ **Skip optional steps** (only require core info)
- ✅ **Email magic links** to resume onboarding
- ✅ **Progress indicator** shows % complete
- ✅ **Pre-fill data** where possible (e.g., from company VAT lookup)

**UX Improvements to Add**:
```typescript
// Auto-save draft every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    saveDraftToLocalStorage(formData);
  }, 30000);
  return () => clearInterval(interval);
}, [formData]);
```

---

#### Concern 4: Data Quality from External Sources

**Issue**: Affiliate feeds may have incomplete/messy data

**Solutions**:
- ✅ **AI enrichment** fills missing fields
- ✅ **Validation rules** reject critically incomplete products
- ✅ **Manual review queue** for flagged items
- ✅ **Brand feedback loop** (notify brands of quality issues)

**Quality Metrics to Track**:
- % of products with AI-generated fields
- % of products requiring manual review
- Average data completeness score per source

---

#### Concern 5: Enterprise Brand Requirements

**Issue**: Large brands may need advanced features

**Enterprise Features to Add Later** (Phase 3+):
- Dedicated account manager assignment
- Bulk product management (edit 100s at once)
- Advanced analytics dashboard
- API webhooks for inventory changes
- Multi-user access (team accounts)
- White-label partner portal
- SLA guarantees (99.9% uptime)

**For MVP**: Focus on solo founders and mid-size brands first

---

### ⚠️ CRITICAL: Missing Database Fields

After review, we need to add these fields to ensure **testability and production readiness**:

#### Brand Model Additions:
```python
# For testing and monitoring
test_mode = models.BooleanField(default=False, help_text="Sandbox brand for testing")
total_products = models.IntegerField(default=0, help_text="Cached product count")
total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
last_product_sync_count = models.IntegerField(default=0, help_text="Products synced in last run")

# For enterprise features
account_manager_email = models.EmailField(blank=True, null=True)
tier = models.CharField(
    max_length=20,
    choices=[
        ('free', 'Free'),
        ('starter', 'Starter'),
        ('growth', 'Growth'),
        ('enterprise', 'Enterprise'),
    ],
    default='free'
)
```

#### ProductMasterGroup Additions:
```python
# For affiliate tracking
is_affiliate = models.BooleanField(default=False, db_index=True)
affiliate_click_count = models.IntegerField(default=0)
affiliate_conversion_count = models.IntegerField(default=0)

# For quality control
data_quality_score = models.IntegerField(default=100, help_text="0-100 quality score")
ai_generated_fields = models.JSONField(default=list, help_text="Which fields were AI-filled")
manual_review_required = models.BooleanField(default=False, db_index=True)
```

---

## 📊 Testing Strategy

### Required Test Data Before Launch:

1. **Test Brands** (Create 3 types):
   - Solo founder brand (manual entry)
   - Shopify brand (API integration)
   - Affiliate brand (feed sync)

2. **Test Products** (Create varied data):
   - Complete products (all fields filled)
   - Incomplete products (missing optional fields)
   - Edge cases (no images, single size, etc.)

3. **Test Scenarios**:
   - Brand registration with validation errors
   - CSV upload with malformed data
   - API sync failure and retry
   - Out-of-stock affiliate product
   - Price change in affiliate feed

---

## 🏗️ Phase-by-Phase Implementation Blueprint

---

## Phase 1: Database Foundation (Days 1-3)

### Day 1: Model Enhancement

#### Step 1.1: Backup Current Database
```bash
# Django
python manage.py dumpdata > backup_before_brand_onboarding.json

# PostgreSQL
pg_dump cove_db > backup_before_brand_onboarding.sql
```

**✅ Validation**: Backup file exists and is non-empty

---

#### Step 1.2: Update Brand Model

**File**: `backend/catalog/models.py`

**Changes**:
```python
# Add all fields from architecture doc + critical additions above
# Total new fields: ~35
```

**✅ Validation**: No syntax errors, model passes linting

---

#### Step 1.3: Create Migration

```bash
cd backend
python manage.py makemigrations catalog
```

**Expected Output**:
```
Migrations for 'catalog':
  catalog/migrations/0XXX_enhance_brand_model.py
    - Add field brand_type to brand
    - Add field integration_method to brand
    ... (35 more fields)
```

**✅ Validation**: Migration file created successfully

---

#### Step 1.4: Test Migration (Local)

```bash
# Dry run first
python manage.py migrate catalog --plan

# If looks good, apply
python manage.py migrate catalog
```

**✅ Validation**: 
- Migration applies without errors
- Run `python manage.py showmigrations` - should show migration as applied
- Open Django shell: `Brand.objects.first()` should have new fields

---

#### Step 1.5: Create Test Brands

```python
# backend/catalog/management/commands/create_test_brands.py
from django.core.management.base import BaseCommand
from catalog.models import Brand

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        # Create 3 test brands
        Brand.objects.create(
            brand_id='TEST-SOLO-001',
            brand_name='Solo Designer Co',
            brand_type='direct',
            integration_method='manual',
            test_mode=True,
            # ... all required fields
        )
        # ... create 2 more test brands
        self.stdout.write(self.style.SUCCESS('Created 3 test brands'))
```

**Run**:
```bash
python manage.py create_test_brands
```

**✅ Validation**: `Brand.objects.filter(test_mode=True).count() == 3`

---

### Day 2: API Endpoints (Backend)

#### Step 2.1: Create Brand Serializers

**File**: `backend/catalog/serializers.py`

```python
class BrandDetailSerializer(serializers.ModelSerializer):
    """Full brand details with all fields"""
    class Meta:
        model = Brand
        fields = '__all__'

class BrandRegistrationSerializer(serializers.ModelSerializer):
    """Step 1: Basic registration"""
    class Meta:
        model = Brand
        fields = ['brand_name', 'contact_email', 'country', 'brand_type']

class BrandBusinessInfoSerializer(serializers.ModelSerializer):
    """Step 2: Business details"""
    class Meta:
        model = Brand
        fields = ['contact_name', 'company_registration', 'contact_phone']

# ... create serializers for each onboarding step
```

**✅ Validation**: Serializers can serialize/deserialize without errors

---

#### Step 2.2: Create Onboarding Views

**File**: `backend/catalog/views_brand_onboarding.py` (NEW)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class BrandRegistrationView(APIView):
    """
    POST /api/brands/register/
    Step 1: Create new brand account
    """
    def post(self, request):
        serializer = BrandRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            brand = serializer.save()
            return Response({
                'brand_id': brand.brand_id,
                'onboarding_status': brand.onboarding_status,
                'next_step': '/api/brands/{}/business-info/'.format(brand.brand_id)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BrandBusinessInfoView(APIView):
    """
    PATCH /api/brands/{id}/business-info/
    Step 2: Add business details
    """
    def patch(self, request, brand_id):
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response({'error': 'Brand not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = BrandBusinessInfoSerializer(brand, data=request.data, partial=True)
        if serializer.is_valid():
            brand = serializer.save()
            brand.onboarding_status = 'info_complete'
            brand.save()
            return Response({
                'brand_id': brand.brand_id,
                'onboarding_status': brand.onboarding_status,
                'next_step': '/api/brands/{}/shipping/'.format(brand.brand_id)
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ... create views for shipping, stripe connect, etc.
```

**✅ Validation**: Views accessible, return proper responses

---

#### Step 2.3: Add URL Routes

**File**: `backend/urls.py`

```python
from catalog.views_brand_onboarding import (
    BrandRegistrationView,
    BrandBusinessInfoView,
    BrandShippingView,
    BrandStripeConnectView,
)

urlpatterns = [
    # ... existing routes
    
    # Brand Onboarding
    path('api/brands/register/', BrandRegistrationView.as_view(), name='brand-register'),
    path('api/brands/<str:brand_id>/business-info/', BrandBusinessInfoView.as_view(), name='brand-business-info'),
    path('api/brands/<str:brand_id>/shipping/', BrandShippingView.as_view(), name='brand-shipping'),
    path('api/brands/<str:brand_id>/stripe-connect/', BrandStripeConnectView.as_view(), name='brand-stripe'),
]
```

**✅ Validation**: 
```bash
python manage.py show_urls | grep brand
```
Should show all 4 endpoints

---

#### Step 2.4: Test Endpoints (Postman/Curl)

**Test Script**: `backend/tests/test_brand_onboarding.sh`

```bash
#!/bin/bash

# Test 1: Register brand
echo "Testing brand registration..."
RESPONSE=$(curl -X POST http://localhost:8000/api/brands/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "Test Brand",
    "contact_email": "test@brand.com",
    "country": "DE",
    "brand_type": "direct"
  }')
echo $RESPONSE

BRAND_ID=$(echo $RESPONSE | jq -r '.brand_id')
echo "Created brand: $BRAND_ID"

# Test 2: Add business info
echo "Testing business info update..."
curl -X PATCH http://localhost:8000/api/brands/$BRAND_ID/business-info/ \
  -H "Content-Type: application/json" \
  -d '{
    "contact_name": "John Doe",
    "company_registration": "DE123456789",
    "contact_phone": "+49123456789"
  }'

# ... test remaining endpoints
```

**Run**:
```bash
chmod +x backend/tests/test_brand_onboarding.sh
./backend/tests/test_brand_onboarding.sh
```

**✅ Validation**: All API calls return 200/201 status

---

### Day 3: Frontend Foundation

#### Step 3.1: Create Partner Portal Structure

```bash
cd frontend/src/app
mkdir -p partner/register/components
mkdir -p partner/dashboard/components
mkdir -p partner/products/add/components
mkdir -p partner/products/bulk/components
```

**✅ Validation**: Directory structure matches architecture doc

---

#### Step 3.2: Create Multi-Step Wizard Component

**File**: `frontend/src/app/partner/register/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import StepIndicator from './components/StepIndicator';
import BusinessInfoForm from './components/BusinessInfoForm';
import ShippingForm from './components/ShippingForm';
import PaymentSetup from './components/PaymentSetup';
import IntegrationChoice from './components/IntegrationChoice';

export default function BrandRegistration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [brandId, setBrandId] = useState<string | null>(null);
  const totalSteps = 4;
  
  const handleStep1Complete = async (data: any) => {
    // POST to /api/brands/register/
    const response = await fetch('/api/brands/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      const result = await response.json();
      setBrandId(result.brand_id);
      setCurrentStep(2);
    }
  };
  
  const handleStep2Complete = async (data: any) => {
    // PATCH to /api/brands/{id}/business-info/
    const response = await fetch(`/api/brands/${brandId}/business-info/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      setCurrentStep(3);
    }
  };
  
  // ... handle steps 3 and 4
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <StepIndicator current={currentStep} total={totalSteps} />
        
        {currentStep === 1 && <BusinessInfoForm onNext={handleStep1Complete} />}
        {currentStep === 2 && <ShippingForm onNext={handleStep2Complete} />}
        {currentStep === 3 && <PaymentSetup onNext={() => setCurrentStep(4)} />}
        {currentStep === 4 && <IntegrationChoice brandId={brandId} />}
      </div>
    </div>
  );
}
```

**✅ Validation**: Page loads without errors, step indicator visible

---

#### Step 3.3: Create Form Components

**File**: `frontend/src/app/partner/register/components/BusinessInfoForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface BusinessInfoFormProps {
  onNext: (data: any) => void;
}

export default function BusinessInfoForm({ onNext }: BusinessInfoFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onSubmit = (data: any) => {
    onNext(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Brand Information</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Brand Name *</label>
        <input
          {...register('brand_name', { required: 'Brand name is required' })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
          placeholder="e.g., Awesome Fashion Co"
        />
        {errors.brand_name && (
          <p className="text-red-500 text-sm mt-1">{errors.brand_name.message}</p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Contact Email *</label>
        <input
          {...register('contact_email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
          placeholder="contact@yourbrand.com"
        />
        {errors.contact_email && (
          <p className="text-red-500 text-sm mt-1">{errors.contact_email.message}</p>
        )}
      </div>
      
      {/* Add remaining fields: country, brand_type */}
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
      >
        Continue to Business Details
      </button>
    </form>
  );
}
```

**✅ Validation**: Form renders, validation works, submission calls API

---

### Day 3 End: Manual Onboarding E2E Test

**Test Flow**:
1. Navigate to `/partner/register`
2. Fill Step 1 (Business Info) → Should POST to API
3. Fill Step 2 (Shipping) → Should PATCH to API
4. (Mock) Step 3 (Payment) → Just advance step
5. Select "Manual Entry" in Step 4
6. Should redirect to `/partner/dashboard`

**✅ Validation**: Can complete full registration without errors

---

## Phase 2: Product Management (Days 4-7)

### Day 4: Product Entry Backend

#### Step 4.1: Create Product Serializers

**File**: `backend/catalog/serializers_products.py` (NEW)

```python
class ProductCreateSerializer(serializers.ModelSerializer):
    """Create new product with variants"""
    variants = ColorVariantSerializer(many=True)
    
    class Meta:
        model = ProductMasterGroup
        fields = ['name', 'description', 'type', 'material', 'gender', 'fit', 'base_price', 'variants']
    
    def create(self, validated_data):
        variants_data = validated_data.pop('variants')
        product = ProductMasterGroup.objects.create(**validated_data)
        
        for variant_data in variants_data:
            sizes_data = variant_data.pop('sizes')
            images_data = variant_data.pop('images', [])
            
            variant = ColorGroup.objects.create(product=product, **variant_data)
            
            for size_data in sizes_data:
                SizeStockPrice.objects.create(variant=variant, **size_data)
            
            for image_url in images_data:
                ProductImage.objects.create(variant=variant, image_name=image_url)
        
        return product
```

**✅ Validation**: Serializer creates product + variants + sizes atomically

---

#### Step 4.2: Create Product Management Views

**File**: `backend/catalog/views_products.py` (NEW)

```python
class BrandProductListView(APIView):
    """
    GET /api/brands/{brand_id}/products/
    List all products for a brand
    """
    def get(self, request, brand_id):
        products = ProductMasterGroup.objects.filter(brand_id=brand_id)
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)

class BrandProductCreateView(APIView):
    """
    POST /api/brands/{brand_id}/products/
    Create new product manually
    """
    def post(self, request, brand_id):
        data = request.data.copy()
        data['brand_id'] = brand_id
        
        serializer = ProductCreateSerializer(data=data)
        if serializer.is_valid():
            product = serializer.save()
            return Response({
                'product_id': product.product_id,
                'slug': product.slug,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**✅ Validation**: Can create product via API with nested data

---

### Day 5: CSV Upload

#### Step 5.1: CSV Parser Implementation

**File**: `backend/data_ingestion/parsers/csv_parser.py` (NEW)

```python
import csv
import io
from typing import List, Dict

class CSVProductParser:
    """Parse CSV uploads into COVE product schema"""
    
    REQUIRED_FIELDS = ['product_name', 'description', 'base_price', 'color_name', 'sizes_stock']
    
    def parse(self, csv_file) -> tuple[List[Dict], List[str]]:
        """
        Returns: (valid_products, errors)
        """
        valid_products = []
        errors = []
        
        decoded_file = csv_file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded_file))
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
            # Validate required fields
            missing_fields = [f for f in self.REQUIRED_FIELDS if not row.get(f)]
            if missing_fields:
                errors.append(f"Row {row_num}: Missing required fields: {', '.join(missing_fields)}")
                continue
            
            # Parse sizes_stock format: "S:50:19.99|M:100:19.99|L:75:19.99"
            try:
                sizes = self._parse_sizes(row['sizes_stock'])
            except ValueError as e:
                errors.append(f"Row {row_num}: Invalid sizes_stock format: {str(e)}")
                continue
            
            # Build product object
            product = {
                'name': row['product_name'],
                'description': row['description'],
                'type': row.get('type', 'unknown'),
                'material': row.get('material', ''),
                'gender': row.get('gender', 'unisex'),
                'fit': row.get('fit', 'regular'),
                'base_price': float(row['base_price']),
                'variants': [{
                    'color_name': row['color_name'],
                    'hex': row.get('hex', '#000000'),
                    'images': row.get('image_urls', '').split('|') if row.get('image_urls') else [],
                    'sizes': sizes,
                }]
            }
            
            valid_products.append(product)
        
        return valid_products, errors
    
    def _parse_sizes(self, sizes_str: str) -> List[Dict]:
        """Parse 'S:50:19.99|M:100:19.99' into list of dicts"""
        sizes = []
        for size_entry in sizes_str.split('|'):
            parts = size_entry.split(':')
            if len(parts) != 3:
                raise ValueError(f"Invalid format: {size_entry}")
            
            sizes.append({
                'size': parts[0].strip(),
                'quantity': int(parts[1]),
                'price': float(parts[2]),
            })
        return sizes
```

**✅ Validation**: Parser handles valid CSV, returns helpful errors for invalid data

---

#### Step 5.2: CSV Upload Endpoint

**File**: `backend/catalog/views_products.py`

```python
class BrandProductCSVUploadView(APIView):
    """
    POST /api/brands/{brand_id}/products/csv/
    Bulk upload products via CSV
    """
    def post(self, request, brand_id):
        csv_file = request.FILES.get('csv')
        if not csv_file:
            return Response({'error': 'No CSV file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        parser = CSVProductParser()
        valid_products, errors = parser.parse(csv_file)
        
        if errors:
            return Response({
                'status': 'validation_failed',
                'valid_count': len(valid_products),
                'error_count': len(errors),
                'errors': errors,
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create products
        created_products = []
        for product_data in valid_products:
            product_data['brand_id'] = brand_id
            serializer = ProductCreateSerializer(data=product_data)
            if serializer.is_valid():
                product = serializer.save()
                created_products.append(product.product_id)
        
        return Response({
            'status': 'success',
            'created_count': len(created_products),
            'product_ids': created_products,
        }, status=status.HTTP_201_CREATED)
```

**✅ Validation**: CSV upload creates multiple products in one request

---

### Day 6-7: Frontend Product Management

**Create these pages**:
1. `/partner/products/add` - Manual product entry wizard
2. `/partner/products/bulk` - CSV upload interface
3. `/partner/dashboard` - Overview of products, sales, etc.

**Testing**: Create 5 products manually, 10 via CSV for test brand

---

## Phase 3: Testing & Validation (Days 8-10)

### Day 8: Integration Testing

**Test Scenarios**:

```python
# backend/tests/test_onboarding_flow.py
import pytest
from django.test import TestCase, Client
from catalog.models import Brand, ProductMasterGroup

class BrandOnboardingFlowTest(TestCase):
    def setUp(self):
        self.client = Client()
    
    def test_full_onboarding_flow(self):
        # Step 1: Register
        response = self.client.post('/api/brands/register/', {
            'brand_name': 'Integration Test Brand',
            'contact_email': 'test@integration.com',
            'country': 'DE',
            'brand_type': 'direct',
        })
        self.assertEqual(response.status_code, 201)
        brand_id = response.json()['brand_id']
        
        # Step 2: Business info
        response = self.client.patch(f'/api/brands/{brand_id}/business-info/', {
            'contact_name': 'Test User',
            'company_registration': 'DE999999',
        })
        self.assertEqual(response.status_code, 200)
        
        # Step 3: Add product
        response = self.client.post(f'/api/brands/{brand_id}/products/', {
            'name': 'Test Product',
            'description': 'Test description',
            'base_price': 29.99,
            'variants': [{
                'color_name': 'Black',
                'hex': '#000000',
                'sizes': [
                    {'size': 'M', 'quantity': 10, 'price': 29.99}
                ]
            }]
        })
        self.assertEqual(response.status_code, 201)
        
        # Verify brand has 1 product
        brand = Brand.objects.get(brand_id=brand_id)
        self.assertEqual(brand.total_products, 1)
```

**Run**:
```bash
python manage.py test backend.tests.test_onboarding_flow
```

**✅ Validation**: All tests pass

---

### Day 9: UI/UX Testing

**Manual Testing Checklist**:

- [ ] Registration flow completes without errors
- [ ] Form validation shows helpful error messages
- [ ] Step indicator updates correctly
- [ ] Can go back to previous steps
- [ ] Progress is saved (refresh page mid-flow)
- [ ] CSV template downloads correctly
- [ ] CSV upload shows validation results
- [ ] Dashboard shows created products
- [ ] Can edit existing products
- [ ] Mobile responsive (test on 375px width)

**✅ Validation**: All checklist items completed

---

### Day 10: Performance Testing

**Load Test Script**:

```python
# backend/tests/load_test.py
import time
import requests
import concurrent.futures

def create_brand():
    response = requests.post('http://localhost:8000/api/brands/register/', json={
        'brand_name': f'Test Brand {time.time()}',
        'contact_email': f'test{time.time()}@example.com',
        'country': 'DE',
        'brand_type': 'direct',
    })
    return response.status_code == 201

# Simulate 100 concurrent brand registrations
with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
    futures = [executor.submit(create_brand) for _ in range(100)]
    results = [f.result() for f in concurrent.futures.as_completed(futures)]

print(f"Success rate: {sum(results)}/{len(results)}")
```

**✅ Validation**: 95%+ success rate under load

---

## Phase 4: Deployment Preparation (Days 11-12)

### Day 11: Production Readiness

**Checklist**:
- [ ] Environment variables configured (Railway)
- [ ] Database backed up
- [ ] Migrations tested on staging
- [ ] API rate limiting enabled
- [ ] Error monitoring (Sentry) configured
- [ ] CDN configured (Cloudflare)
- [ ] SSL certificates valid
- [ ] CORS configured correctly

---

### Day 12: Launch

**Launch Steps**:
1. Deploy backend to production
2. Run migrations
3. Deploy frontend to production
4. Create 1 real test brand (yourself)
5. Invite 3 pilot brands
6. Monitor error logs for 24 hours
7. Collect feedback
8. Iterate

---

## 📊 Success Metrics (First 30 Days)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Brands Onboarded** | 10 | `Brand.objects.filter(onboarding_status='live').count()` |
| **Products Listed** | 100+ | `ProductMasterGroup.objects.count()` |
| **Onboarding Completion Rate** | >70% | Brands that reach 'live' / Total registrations |
| **Average Time to First Product** | <20 mins | Track timestamp from registration to first product |
| **CSV Upload Success Rate** | >85% | Successful uploads / Total uploads |
| **Zero Critical Bugs** | 0 | Check error monitoring dashboard |

---

## 🚨 Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| **Database migration fails in prod** | Low | Critical | Test on staging first, have rollback plan |
| **Brands confused by UX** | Medium | Medium | Add video tutorial, live chat support |
| **CSV format not intuitive** | Medium | Low | Provide example CSV, clear documentation |
| **API performance degrades** | Low | High | Load test before launch, caching layer |
| **Stripe Connect issues** | Low | High | Test with real Stripe account, sandbox mode first |

---

## 📁 File Checklist

Before starting Phase 1, ensure these files exist:

**Backend**:
- [ ] `backend/catalog/models.py` (Brand model)
- [ ] `backend/catalog/serializers.py`
- [ ] `backend/catalog/views_brand_onboarding.py` (NEW)
- [ ] `backend/catalog/views_products.py` (NEW)
- [ ] `backend/data_ingestion/parsers/csv_parser.py` (NEW)
- [ ] `backend/tests/test_onboarding_flow.py` (NEW)
- [ ] `backend/urls.py` (updated)

**Frontend**:
- [ ] `frontend/src/app/partner/register/page.tsx` (NEW)
- [ ] `frontend/src/app/partner/register/components/BusinessInfoForm.tsx` (NEW)
- [ ] `frontend/src/app/partner/dashboard/page.tsx` (NEW)
- [ ] `frontend/src/app/partner/products/add/page.tsx` (NEW)
- [ ] `frontend/src/app/partner/products/bulk/page.tsx` (NEW)

---

## ✅ Final Pre-Launch Checklist

Before going live:

### Functionality
- [ ] Can register new brand
- [ ] Can add products manually
- [ ] Can upload products via CSV
- [ ] CSV validation works
- [ ] Dashboard shows accurate data
- [ ] Can edit existing products
- [ ] Can delete products

### Security
- [ ] API requires authentication
- [ ] Brands can only access their own data
- [ ] Input validation on all fields
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF tokens enabled

### Performance
- [ ] Page load time <2 seconds
- [ ] API response time <500ms
- [ ] Images optimized (WebP, compressed)
- [ ] Database queries optimized (no N+1)
- [ ] Caching enabled

### UX
- [ ] Mobile responsive
- [ ] Error messages helpful
- [ ] Success states clear
- [ ] Loading states implemented
- [ ] Forms validate on blur

---

## 🎯 Next Steps After Blueprint Approval

Once you approve this blueprint:

1. **Create task.md** in artifacts with this exact checklist
2. **Start Day 1, Step 1.1** - Backup database
3. **Follow blueprint sequentially** - Don't skip ahead
4. **Test after each step** - Use ✅ validations
5. **Track progress** - Update task.md daily

---

**Status**: 🔵 Blueprint Ready for Review  
**Action Required**: Review & Approve to Begin Phase 1

---

**Questions to Answer Before Starting**:
1. Do we have PostgreSQL set up locally? (or using SQLite for development?)
2. Should we use Stripe Test Mode for initial development?
3. Do you have a CDN account (Cloudflare/AWS) or should we use local storage initially?
4. Timeline: Are 12 days realistic, or should we extend to 3-4 weeks?
