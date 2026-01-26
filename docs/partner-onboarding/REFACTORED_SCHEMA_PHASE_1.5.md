# Phase 1.5: Refactored Schema Design (ChatGPT Recommendations)

> **Status**: Planned for implementation BEFORE Phase 3 (API Integrations)  
> **Reason**: Current schema works for manual/CSV onboarding but won't scale for multiple integrations  
> **Decision**: Implement in Phase 1.5 to avoid "god table" anti-pattern

---

## 🎯 Why Refactor?

### Current Problem ("God Table")
The `Brand` model has 35 fields, many of which are NULL for most brands:
- Affiliate brands don't use Shopify/API fields
- Direct brands don't use affiliate fields  
- Can't support "brand has multiple integrations" (e.g., Shopify + API + Feed)

### Solution: Split into 4 Tables

---

## 📊 New Schema Design

### 1. Brand (Core Identity)
**Purpose**: Essential brand information only

```python
class Brand(models.Model):
    # Identity
    brand_id = models.CharField(max_length=50, primary_key=True)
    brand_name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    logo_url = models.CharField(max_length=500, blank=True, null=True)
    
    # Display & Branding
    theme_colors = models.JSONField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    # Status & Type
    brand_type = models.CharField(
        max_length=20,
        choices=[('direct', 'Direct'), ('affiliate', 'Affiliate')],
        default='direct'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Onboarding Progress
    onboarding_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('info_complete', 'Info Complete'),
            ('products_added', 'Products Added'),
            ('live', 'Live'),
            ('suspended', 'Suspended'),
        ],
        default='pending',
        db_index=True
    )
    onboarding_completed_at = models.DateTimeField(blank=True, null=True)
    
    # Compliance
    country = models.CharField(max_length=2, help_text="ISO country code")
    company_registration = models.CharField(max_length=100, blank=True, null=True)
```

**Fields Reduced**: 35 → 14 fields ✅

---

### 2. BrandProfile (Operations & Policies)
**Purpose**: Shipping, returns, support contact

```python
class BrandProfile(models.Model):
    brand = models.OneToOneField(Brand, on_delete=models.CASCADE, related_name='profile')
    
    # Contact
    contact_name = models.CharField(max_length=100)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    support_email = models.EmailField(blank=True, null=True)
    
    # Shipping
    ships_from_country = models.CharField(max_length=2)
    processing_days = models.IntegerField(default=3)
    shipping_policy = models.TextField(blank=True, null=True)
    
    # Returns
    return_policy = models.TextField(blank=True, null=True)
    return_window_days = models.IntegerField(default=30)
    
    # Warehouse/Fulfillment
    warehouse_address = models.TextField(blank=True, null=True)
```

---

### 3. BrandIntegration (1 Brand → Many Integrations) ⭐ **KEY CHANGE**
**Purpose**: Support multiple data sources per brand

```python
class BrandIntegration(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='integrations')
    
    # Integration Type
    integration_type = models.CharField(
        max_length=20,
        choices=[
            ('manual', 'Manual Entry'),
            ('csv', 'CSV Upload'),
            ('api', 'Custom API'),
            ('shopify', 'Shopify'),
            ('woocommerce', 'WooCommerce'),
            ('affiliate_feed', 'Affiliate Feed'),
        ],
        db_index=True
    )
    
    # Credentials (encrypted)
    api_endpoint = models.URLField(blank=True, null=True, max_length=500)
    api_key_encrypted = models.CharField(max_length=500, blank=True, null=True)
    feed_url = models.URLField(blank=True, null=True, max_length=500)
    oauth_token_encrypted = models.TextField(blank=True, null=True)
    
    # Sync Configuration
    sync_frequency = models.CharField(
        max_length=20,
        choices=[
            ('manual', 'Manual'),
            ('hourly', 'Hourly'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
        ],
        default='manual'
    )
    is_active = models.BooleanField(default=True)
    
    # Sync Status
    last_sync_at = models.DateTimeField(blank=True, null=True)
    last_sync_status = models.CharField(
        max_length=20,
        choices=[
            ('never', 'Never'),
            ('success', 'Success'),
            ('pending', 'Pending'),
            ('failed', 'Failed'),
        ],
        default='never'
    )
    last_sync_error = models.TextField(blank=True, null=True)
    last_sync_product_count = models.IntegerField(default=0)
    
    # Affiliate-specific
    affiliate_network = models.CharField(max_length=50, blank=True, null=True)
    affiliate_program_id = models.CharField(max_length=100, blank=True, null=True)
    affiliate_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['integration_type', 'is_active']),
            models.Index(fields=['last_sync_status']),
        ]
```

**💡 This enables**:
- Brand can have Shopify + API + Affiliate Feed simultaneously
- Easy to add new integration types (TikTok Shop, Amazon, etc.)
- Per-integration sync monitoring

---

### 4. BrandPayout (Payment & Billing)
**Purpose**: Stripe Connect, KYC, payouts

```python
class BrandPayout(models.Model):
    brand = models.OneToOneField(Brand, on_delete=models.CASCADE, related_name='payout')
    
    # Stripe Connect
    stripe_account_id = models.CharField(max_length=255, unique=True)
    payment_method_verified = models.BooleanField(default=False)
    kyc_status = models.CharField(
        max_length=20,
        choices=[
            ('not_started', 'Not Started'),
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
        ],
        default='not_started'
    )
    
    # Payout Settings
    payout_schedule = models.CharField(
        max_length=20,
        choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly')],
        default='weekly'
    )
    minimum_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    
    # Currency
    payout_currency = models.CharField(max_length=3, default='EUR')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## 🆕 Additional Tables (ChatGPT Recommendations)

### 5. IngestionRun (Observability)
**Purpose**: Track each sync/import attempt

```python
class IngestionRun(models.Model):
    integration = models.ForeignKey(BrandIntegration, on_delete=models.CASCADE, related_name='runs')
    
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('running', 'Running'),
            ('success', 'Success'),
            ('partial', 'Partial Success'),
            ('failed', 'Failed'),
        ]
    )
    
    # Counts
    total_items = models.IntegerField(default=0)
    created_count = models.IntegerField(default=0)
    updated_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    
    # Errors
    error_summary = models.TextField(blank=True, null=True)
    
    class Meta:
        indexes = [models.Index(fields=['started_at'])]
        ordering = ['-started_at']
```

### 6. IngestionItemError
**Purpose**: Detailed error tracking per item

```python
class IngestionItemError(models.Model):
    run = models.ForeignKey(IngestionRun, on_delete=models.CASCADE, related_name='item_errors')
    
    row_number = models.IntegerField(blank=True, null=True)
    external_product_id = models.CharField(max_length=200)
    error_type = models.CharField(max_length=50)  # validation, mapping, duplicate, etc.
    error_message = models.TextField()
    field_errors = models.JSONField(default=dict)  # {field: error}
    
    created_at = models.DateTimeField(auto_now_add=True)
```

### 7. ExternalProductMapping
**Purpose**: Track external IDs to prevent duplicates

```python
class ExternalProductMapping(models.Model):
    integration = models.ForeignKey(BrandIntegration, on_delete=models.CASCADE)
    external_product_id = models.CharField(max_length=200, db_index=True)
    external_variant_id = models.CharField(max_length=200, blank=True, null=True)
    
    # Internal references
    product = models.ForeignKey('ProductMasterGroup', on_delete=models.CASCADE)
    variant = models.ForeignKey('ColorGroup', on_delete=models.CASCADE, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [('integration', 'external_product_id', 'external_variant_id')]
        indexes = [
            models.Index(fields=['external_product_id']),
        ]
```

### 8. BrandUser (RBAC for Multi-User Teams)
**Purpose**: Team access control

```python
class BrandUser(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='users')
    user_id = models.CharField(max_length=100, db_index=True)  # Clerk user ID
    
    role = models.CharField(
        max_length=20,
        choices=[
            ('owner', 'Owner'),
            ('admin', 'Admin'),
            ('editor', 'Editor'),
            ('viewer', 'Viewer'),
        ],
        default='editor'
    )
    
    invited_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.CharField(max_length=100)
    
    class Meta:
        unique_together = [('brand', 'user_id')]
```

### 9. AuditLog (For AI Automation Trust)
**Purpose**: Track all actions (critical for XMail/XVoice automation)

```python
class AuditLog(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='audit_logs')
    
    actor_type = models.CharField(
        max_length=20,
        choices=[
            ('user', 'User'),
            ('ai', 'AI Agent'),
            ('system', 'System'),
        ]
    )
    actor_id = models.CharField(max_length=100)  # user_id or 'cove-ai' or 'system'
    
    action = models.CharField(max_length=100)  # 'product.created', 'order.refunded', etc.
    resource_type = models.CharField(max_length=50)  # 'product', 'order', 'brand'
    resource_id = models.CharField(max_length=100)
    
    before_state = models.JSONField(blank=True, null=True)
    after_state = models.JSONField(blank=True, null=True)
    
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['brand', 'created_at']),
            models.Index(fields=['actor_id', 'created_at']),
        ]
        ordering = ['-created_at']
```

---

## 🔄 Migration Strategy (Phase 1.5)

### Step 1: Create New Tables
```bash
python manage.py makemigrations --name create_refactored_brand_structure
```

### Step 2: Data Migration
```python
# Migrate existing Brand data
for brand in Brand.objects.all():
    # Create BrandProfile
    BrandProfile.objects.create(
        brand=brand,
        contact_name=brand.contact_name,
        contact_email=brand.contact_email,
        # ... other fields
    )
    
    # Create BrandIntegration (based on current integration_method)
    BrandIntegration.objects.create(
        brand=brand,
        integration_type=brand.integration_method,
        # ... migrate sync fields
    )
    
    # Create BrandPayout if stripe_account_id exists
    if brand.stripe_account_id:
        BrandPayout.objects.create(
            brand=brand,
            stripe_account_id=brand.stripe_account_id,
            # ...
        )
```

### Step 3: Remove Old Fields
```bash
python manage.py makemigrations --name remove_old_brand_fields
```

---

## 📈 Benefits of Refactored Schema

### Scalability
- ✅ Support unlimited integrations per brand
- ✅ Add new integration types without migrations
- ✅ No sparse NULL fields

### Observability
- ✅ Track every sync attempt with `IngestionRun`
- ✅ Detailed error logs per item
- ✅ Audit trail for all actions

### Extensibility
- ✅ Easy to add TikTok Shop, Amazon Seller, etc.
- ✅ Multi-user brand teams ready
- ✅ Currency/tax fields prepared

### Data Integrity
- ✅ External ID mapping prevents duplicates
- ✅ Idempotent webhooks via `ExternalProductMapping`
- ✅ Clean separation of concerns

---

## ⏱️ Implementation Timeline

**When**: Before Phase 3 (API Integrations)  
**Duration**: ~6-8 hours  
**Impact**: Breaking change, requires frontend updates  

**Dependencies**:
- Complete Phase 2 (manual onboarding) first
- Test with real brands before migration
- Backup production data

---

**Status**: 📝 Documented, Ready for Implementation in Phase 1.5  
**Priority**: High (must do before Shopify/WooCommerce integration)  
**Related**: See `IMPLEMENTATION_BLUEPRINT.md` Phase 3
