from django.db import models

# --------------------------------------
# Brand: Multi-brand support
# --------------------------------------
class Brand(models.Model):
    # ===== EXISTING CORE FIELDS =====
    brand_id = models.CharField(max_length=50, primary_key=True)
    brand_name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    logo_url = models.CharField(max_length=500, blank=True, null=True)
    theme_colors = models.JSONField(blank=True, null=True, help_text="Brand theme configuration (colors, fonts)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)
    
    # ===== NEW: BRAND TYPE & INTEGRATION =====
    brand_type = models.CharField(
        max_length=20,
        choices=[
            ('direct', 'Direct Seller'),      # Ships from own inventory
            ('affiliate', 'Affiliate'),        # Redirects to external site
        ],
        default='direct',
        db_index=True,
        help_text="Direct brands ship products; Affiliates redirect to external sites"
    )
    
    integration_method = models.CharField(
        max_length=20,
        choices=[
            ('manual', 'Manual Entry'),
            ('csv', 'CSV Upload'),
            ('api', 'API Integration'),
            ('shopify', 'Shopify Sync'),
            ('woocommerce', 'WooCommerce Sync'),
            ('affiliate_feed', 'Affiliate Feed'),
        ],
        default='manual',
        db_index=True,
        help_text="How brand uploads/syncs product data"
    )
    
    # ===== NEW: AFFILIATE TRACKING =====
    affiliate_network = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Affiliate network name: Awin, ShareASale, CJ, etc."
    )
    affiliate_program_id = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Program ID within the affiliate network"
    )
    affiliate_commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        blank=True, 
        null=True,
        help_text="Commission percentage (e.g., 10.50 for 10.5%)"
    )
    
    # ===== NEW: DATA SYNC =====
    feed_url = models.URLField(
        blank=True, 
        null=True, 
        max_length=500,
        help_text="Product feed URL for automated sync"
    )
    api_endpoint = models.URLField(
        blank=True, 
        null=True, 
        max_length=500,
        help_text="Custom API endpoint for product data"
    )
    api_key_encrypted = models.CharField(
        max_length=500, 
        blank=True, 
        null=True,
        help_text="Encrypted API key for authentication"
    )
    last_sync_at = models.DateTimeField(
        blank=True, 
        null=True,
        help_text="Last successful data sync timestamp"
    )
    sync_frequency = models.CharField(
        max_length=20,
        choices=[
            ('manual', 'Manual Only'),
            ('hourly', 'Every Hour'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
        ],
        default='manual',
        help_text="How often to automatically sync product data"
    )
    sync_status = models.CharField(
        max_length=20,
        choices=[
            ('never', 'Never Synced'),
            ('success', 'Success'),
            ('pending', 'In Progress'),
            ('failed', 'Failed'),
        ],
        default='never',
        db_index=True,
        help_text="Current sync status"
    )
    sync_error_log = models.TextField(
        blank=True, 
        null=True,
        help_text="Log of last sync error if failed"
    )
    
    # ===== NEW: BUSINESS INFORMATION =====
    contact_name = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Primary contact person name"
    )
    contact_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Primary contact email for notifications"
    )
    contact_phone = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        help_text="Contact phone number"
    )
    company_registration = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="VAT/Business registration number"
    )
    country = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        help_text="ISO country code (DE, FR, IT, etc.)"
    )
    
    # ===== NEW: ONBOARDING STATUS =====
    onboarding_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Application Pending'),
            ('info_complete', 'Info Submitted'),
            ('products_added', 'Products Added'),
            ('live', 'Live on Platform'),
            ('suspended', 'Suspended'),
        ],
        default='pending',
        db_index=True,
        help_text="Current onboarding progress stage"
    )
    onboarding_completed_at = models.DateTimeField(
        blank=True, 
        null=True,
        help_text="When brand completed onboarding and went live"
    )
    
    # ===== NEW: PAYMENT & SHIPPING =====
    stripe_account_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Stripe Connect account ID for payouts"
    )
    payment_method_verified = models.BooleanField(
        default=False,
        help_text="Whether Stripe Connect setup is complete"
    )
    ships_from_country = models.CharField(
        max_length=2, 
        blank=True, 
        null=True,
        help_text="Primary shipping origin country (ISO code)"
    )

    class Meta:
        verbose_name = "Brand"
        verbose_name_plural = "Brands"
        ordering = ['brand_name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
            models.Index(fields=['brand_type']),
            models.Index(fields=['integration_method']),
            models.Index(fields=['onboarding_status']),
            models.Index(fields=['sync_status']),
        ]

    def __str__(self):
        return self.brand_name


# --------------------------------------
# ProductMasterGroup: Base product info
# --------------------------------------
class ProductMasterGroup(models.Model):
    product_id = models.CharField(max_length=100, primary_key=True)  # e.g., G-HOODIE-CASUAL-BRUSHEDFLEECE-19.99
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, db_index=True)
    brand_id = models.CharField(max_length=50, db_index=True, default='COVE')  # NEW: Brand identifier
    tier = models.CharField(max_length=50)
    type = models.CharField(max_length=50)
    material = models.CharField(max_length=100)
    gender = models.CharField(max_length=20)
    fit = models.CharField(max_length=50)
    description = models.TextField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Outfit Builder Enhancement Fields
    style_tags = models.JSONField(default=list, help_text="Style tags for outfit matching (e.g., ['minimalist', 'streetwear'])")
    pattern = models.CharField(max_length=50, default='solid', help_text="Pattern type: solid, striped, graphic, etc.")
    season = models.JSONField(default=list, help_text="Suitable seasons: ['spring', 'summer', 'fall', 'winter']")
    use_cases = models.JSONField(default=list, help_text="Use cases: ['casual', 'work', 'outdoor', etc.]")
    formality_score = models.IntegerField(default=5, help_text="Formality level 1-10 (1=gym, 10=black tie)")
    versatility = models.IntegerField(default=5, help_text="Versatility score 1-10 (how many outfits can use this?)")
    statement_piece = models.BooleanField(default=False, help_text="Is this a focal/statement piece?")
    color_family = models.CharField(max_length=20, default='neutral', help_text="Color family: neutral, warm, cool, bold")
    in_stock = models.BooleanField(default=True, help_text="Product availability")
    featured = models.BooleanField(default=False, help_text="Featured product for promotions")
    affiliate_url = models.URLField(max_length=500, blank=True, null=True, help_text="External link for affiliate products (redirects user instead of cart)")
    
    # Soft Delete & Status
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('draft', 'Draft'),
        ('trashed', 'Trashed'),
        ('archived', 'Archived'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    trashed_at = models.DateTimeField(blank=True, null=True, help_text="Time moved to bin")

    class Meta:
        verbose_name = "Product Master Group"
        verbose_name_plural = "Product Master Groups"
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['type']),
            models.Index(fields=['tier']),
            models.Index(fields=['brand_id']),  # NEW: Index for brand filtering
        ]

    def __str__(self):
        return f"{self.name} ({self.tier})"


# --------------------------------------
# ColorGroup: Color variant + SKU
# --------------------------------------
class ColorGroup(models.Model):
    variant_id = models.CharField(max_length=50, primary_key=True)  # e.g., CUHD001
    product = models.ForeignKey(ProductMasterGroup, on_delete=models.CASCADE, related_name='color_variants')
    color_name = models.CharField(max_length=50, db_index=True)
    hex = models.CharField(max_length=7)  # e.g., #000000
    slug = models.SlugField(db_index=True)

    class Meta:
        verbose_name = "Color Variant"
        verbose_name_plural = "Color Variants"
        indexes = [
            models.Index(fields=['color_name']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return f"{self.variant_id} - {self.color_name}"


class ProductImage(models.Model):
    variant = models.ForeignKey(
        ColorGroup, on_delete=models.CASCADE, related_name='images'
    )
    image_name = models.CharField(max_length=500, db_index=True)  # Increased for external URLs like Pexels

    class Meta:
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"
        indexes = [
            models.Index(fields=['image_name']),
        ]
        ordering = ['id']

    def __str__(self):
        return f"{self.variant.variant_id} - {self.image_name}"


class SizeStockPrice(models.Model):
    variant = models.ForeignKey(ColorGroup, on_delete=models.CASCADE, related_name='sizes')
    size = models.CharField(max_length=4, db_index=True)  # e.g., S, M, L, XL
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    # --- NEW: Stripe identifiers for server-side pricing (production-grade) ---
    stripe_product_id = models.CharField(
        max_length=255, blank=True, null=True, db_index=True,
        help_text="Stripe Product ID (prod_...). Optional."
    )
    stripe_price_id = models.CharField(
        max_length=255, blank=True, null=True, db_index=True, unique=True,
        help_text="Stripe Price ID (price_...) used at checkout."
    )

    class Meta:
        verbose_name = "Size Stock Price"
        verbose_name_plural = "Size Stock Prices"
        unique_together = ('variant', 'size')
        indexes = [
            models.Index(fields=['size']),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(quantity__gte=0), name="ssp_quantity_gte_0"),
            models.CheckConstraint(check=models.Q(price__gte=0), name="ssp_price_gte_0"),
        ]

    def __str__(self):
        return f"{self.variant.variant_id} - {self.size} ({self.quantity} pcs)"


# --------------------------------------
# Cart System
# --------------------------------------
class Cart(models.Model):
    cart_id = models.CharField(max_length=100, primary_key=True)  # UUID or session ID
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional user linkage
    clerk_user_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    guest_session_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    email = models.EmailField(blank=True, null=True)

    def __str__(self):
        return f"Cart {self.cart_id}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ColorGroup, on_delete=models.CASCADE)
    size = models.CharField(max_length=10)
    quantity = models.PositiveIntegerField(default=1)
    
    class Meta:
        unique_together = ('cart', 'variant', 'size')

    def __str__(self):
        return f"{self.quantity}x {self.variant.variant_id} ({self.size})"
