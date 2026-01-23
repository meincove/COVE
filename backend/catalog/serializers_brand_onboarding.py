"""
Brand Onboarding API Serializers

Handles serialization for the multi-step brand registration wizard:
- Step 1: Basic registration (brand name, email, country)
- Step 2: Business information (contact, VAT, etc.)
- Step 3: Shipping & policies
- Step 4: Payment setup (Stripe Connect)
"""

from rest_framework import serializers
from catalog.models import Brand


class BrandRegistrationSerializer(serializers.ModelSerializer):
    """
    Step 1: Initial brand registration
    Creates new brand account with minimal required info
    """
    class Meta:
        model = Brand
        fields = [
            'brand_name',
            'contact_email',
            'country',
            'brand_type',
        ]
    
    def create(self, validated_data):
        # Auto-generate brand_id and slug
        import uuid
        from django.utils.text import slugify
        
        brand_id = f"BRAND-{uuid.uuid4().hex[:8].upper()}"
        slug = slugify(validated_data['brand_name'])
        
        # Ensure slug uniqueness
        base_slug = slug
        counter = 1
        while Brand.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        brand = Brand.objects.create(
            brand_id=brand_id,
            slug=slug,
            onboarding_status='pending',
            **validated_data
        )
        
        return brand


class BrandBusinessInfoSerializer(serializers.ModelSerializer):
    """
    Step 2: Business details
    Updates brand with contact info, VAT, company registration
    """
    class Meta:
        model = Brand
        fields = [
            'contact_name',
            'contact_phone',
            'company_registration',
            'description',
        ]
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Progress onboarding status
        instance.onboarding_status = 'info_complete'
        instance.save()
        
        return instance


class BrandShippingSerializer(serializers.ModelSerializer):
    """
    Step 3: Shipping settings
    Currently minimal - will expand in Phase 1.5 with BrandProfile table
    """
    class Meta:
        model = Brand
        fields = [
            'ships_from_country',
        ]
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class BrandStripeConnectSerializer(serializers.ModelSerializer):
    """
    Step 4: Payment setup
    Placeholder for Stripe Connect integration
    """
    class Meta:
        model = Brand
        fields = [
            'stripe_account_id',
            'payment_method_verified',
        ]
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class BrandIntegrationChoiceSerializer(serializers.ModelSerializer):
    """
    Final step: Choose how to add products
    Sets integration_method for the brand
    """
    class Meta:
        model = Brand
        fields = [
            'integration_method',
        ]
    
    def update(self, instance, validated_data):
        instance.integration_method = validated_data['integration_method']
        
        # Mark onboarding complete if integration chosen
        if instance.payment_method_verified or validated_data['integration_method'] == 'manual':
            instance.onboarding_status = 'products_added'  # Ready to add products
        
        instance.save()
        return instance


class BrandDetailSerializer(serializers.ModelSerializer):
    """
    Full brand details for dashboard/admin views
    """
    class Meta:
        model = Brand
        fields = '__all__'
        read_only_fields = ['brand_id', 'slug', 'created_at']


class BrandListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for brand listings
    """
    class Meta:
        model = Brand
        fields = [
            'brand_id',
            'brand_name',
            'slug',
            'logo_url',
            'brand_type',
            'country',
            'onboarding_status',
            'is_active',
            'created_at',
        ]
