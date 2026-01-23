"""
Brand Onboarding API Views

REST API endpoints for the multi-step brand registration wizard.

Endpoints:
- POST   /api/brands/register/              → Step 1: Create account
- PATCH  /api/brands/{id}/business-info/    → Step 2: Business details
- PATCH  /api/brands/{id}/shipping/         → Step 3: Shipping settings
- PATCH  /api/brands/{id}/stripe-connect/   → Step 4: Payment setup
- PATCH  /api/brands/{id}/integration/      → Final: Choose integration method
- GET    /api/brands/{id}/                  → View brand details
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from catalog.models import Brand
from catalog.serializers_brand_onboarding import (
    BrandRegistrationSerializer,
    BrandBusinessInfoSerializer,
    BrandShippingSerializer,
    BrandStripeConnectSerializer,
    BrandIntegrationChoiceSerializer,
    BrandDetailSerializer,
)


class BrandRegistrationView(APIView):
    """
    POST /api/brands/register/
    
    Step 1: Create new brand account
    
    Request body:
    {
        "brand_name": "Awesome Fashion Co",
        "contact_email": "contact@awesome.com",
        "country": "DE",
        "brand_type": "direct"
    }
    
    Response:
    {
        "brand_id": "BRAND-ABC123",
        "onboarding_status": "pending",
        "next_step": "/api/brands/BRAND-ABC123/business-info/"
    }
    """
    
    def post(self, request):
        serializer = BrandRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            brand = serializer.save()
            
            return Response({
                'brand_id': brand.brand_id,
                'slug': brand.slug,
                'onboarding_status': brand.onboarding_status,
                'next_step': f'/api/brands/{brand.brand_id}/business-info/',
                'message': 'Brand account created successfully'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BrandBusinessInfoView(APIView):
    """
    PATCH /api/brands/{brand_id}/business-info/
    
    Step 2: Add business details
    
    Request body:
    {
        "contact_name": "John Doe",
        "contact_phone": "+49123456789",
        "company_registration": "DE123456789",
        "description": "Premium sustainable fashion brand"
    }
    """
    
    def patch(self, request, brand_id):
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BrandBusinessInfoSerializer(brand, data=request.data, partial=True)
        
        if serializer.is_valid():
            brand = serializer.save()
            
            return Response({
                'brand_id': brand.brand_id,
                'onboarding_status': brand.onboarding_status,
                'next_step': f'/api/brands/{brand.brand_id}/shipping/',
                'message': 'Business information updated'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BrandShippingView(APIView):
    """
    PATCH /api/brands/{brand_id}/shipping/
    
    Step 3: Shipping settings
    
    Request body:
    {
        "ships_from_country": "DE"
    }
    """
    
    def patch(self, request, brand_id):
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BrandShippingSerializer(brand, data=request.data, partial=True)
        
        if serializer.is_valid():
            brand = serializer.save()
            
            return Response({
                'brand_id': brand.brand_id,
                'onboarding_status': brand.onboarding_status,
                'next_step': f'/api/brands/{brand.brand_id}/stripe-connect/',
                'message': 'Shipping settings updated'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BrandStripeConnectView(APIView):
    """
    PATCH /api/brands/{brand_id}/stripe-connect/
    
    Step 4: Payment setup (Stripe Connect)
    
    For MVP, this can be skipped or mocked.
    Production: Integrate Stripe Connect OAuth flow
    
    Request body:
    {
        "stripe_account_id": "acct_xxxxx",
        "payment_method_verified": true
    }
    """
    
    def patch(self, request, brand_id):
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BrandStripeConnectSerializer(brand, data=request.data, partial=True)
        
        if serializer.is_valid():
            brand = serializer.save()
            
            return Response({
                'brand_id': brand.brand_id,
                'onboarding_status': brand.onboarding_status,
                'next_step': f'/api/brands/{brand.brand_id}/integration/',
                'message': 'Payment setup complete'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request, brand_id):
        """
        POST endpoint to skip Stripe Connect for MVP
        Marks as verified so brand can proceed
        """
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # For MVP: Allow skipping Stripe Connect
        brand.payment_method_verified = True
        brand.save()
        
        return Response({
            'brand_id': brand.brand_id,
            'onboarding_status': brand.onboarding_status,
            'next_step': f'/api/brands/{brand.brand_id}/integration/',
            'message': 'Payment setup skipped (MVP mode)'
        })


class BrandIntegrationChoiceView(APIView):
    """
    PATCH /api/brands/{brand_id}/integration/
    
    Final step: Choose how to add products
    
    Request body:
    {
        "integration_method": "manual"  // or "csv", "shopify", etc.
    }
    """
    
    def patch(self, request, brand_id):
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BrandIntegrationChoiceSerializer(brand, data=request.data, partial=True)
        
        if serializer.is_valid():
            brand = serializer.save()
            
            # Determine next action based on integration method
            next_actions = {
                'manual': f'/partner/products/add',
                'csv': f'/partner/products/bulk',
                'shopify': f'/partner/integration/shopify',
                'woocommerce': f'/partner/integration/woocommerce',
                'api': f'/partner/integration/api',
            }
            
            next_action = next_actions.get(brand.integration_method, '/partner/dashboard')
            
            return Response({
                'brand_id': brand.brand_id,
                'onboarding_status': brand.onboarding_status,
                'integration_method': brand.integration_method,
                'next_action': next_action,
                'message': 'Onboarding complete! Ready to add products.'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BrandDetailView(APIView):
    """
    GET /api/brands/{brand_id}/
    
    Retrieve full brand details
    """
    
    def get(self, request, brand_id):
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BrandDetailSerializer(brand)
        return Response(serializer.data)
