from django.db import models

# --------------------------------------
# Brand: Multi-brand support
# --------------------------------------
class Brand(models.Model):
    brand_id = models.CharField(max_length=50, primary_key=True)
    brand_name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    logo_url = models.CharField(max_length=500, blank=True, null=True)
    theme_colors = models.JSONField(blank=True, null=True, help_text="Brand theme configuration (colors, fonts)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Brand"
        verbose_name_plural = "Brands"
        ordering = ['brand_name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
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
