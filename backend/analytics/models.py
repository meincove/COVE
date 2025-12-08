"""
User Interaction Models for Analytics.

2024 Best Practices:
- GA4-compatible event naming
- GDPR compliance baked in
- Engagement metrics
- Optimized indexes for CF queries
"""

from django.db import models
from django.utils import timezone


class UserInteraction(models.Model):
    """
    Track all user-product interactions for CF and analytics.
    
    2024 Best Practices:
    - Privacy-first: Anonymized by default
    - GDPR-compliant: Consent tracking
    - GA4-compatible: Event naming follows Google Analytics 4
    - Performance: Indexed for fast CF queries
    """
    
    # === Identification ===
    user_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="User identifier. Format: 'user_{clerk_id}' or 'anon_{session_id}'"
    )
    
    product_id = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Product variant ID (e.g., 'CCH001')"
    )
    
    # === Interaction Details ===
    # GA4-compatible event types (2024 best practice)
    INTERACTION_TYPES = [
        ('view_item', 'Product View'),
        ('add_to_cart', 'Add to Cart'),
        ('remove_from_cart', 'Remove from Cart'),
        ('begin_checkout', 'Begin Checkout'),
        ('add_payment_info', 'Add Payment Info'),
        ('add_shipping_info', 'Add Shipping Info'),
        ('purchase', 'Purchase'),
        ('search', 'Search'),
    ]
    
    interaction_type = models.CharField(
        max_length=20,
        choices=INTERACTION_TYPES,
        db_index=True,
        help_text="Type of interaction (GA4-compatible)"
    )
    
    # === Context ===
    session_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Session identifier for funnel analysis"
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the interaction occurred"
    )
    
    # === Engagement Metrics (2024 best practice) ===
    time_on_page = models.IntegerField(
        null=True,
        blank=True,
        help_text="Time spent on product page (seconds)"
    )
    
    scroll_depth = models.IntegerField(
        null=True,
        blank=True,
        help_text="Page scroll depth (percentage 0-100)"
    )
    
    # === Privacy & GDPR Compliance ===
    consent_given = models.BooleanField(
        default=False,
        help_text="Whether user gave tracking consent (GDPR)"
    )
    
    anonymized = models.BooleanField(
        default=True,
        help_text="Whether data is anonymized (default: True for privacy)"
    )
    
    # === Metadata ===
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context (AB variant, recommendation source, etc.)"
    )
    # Example: {
    #   "from_recommendation": true,
    #   "ab_variant": "treatment",
    #   "position": 1,
    #   "user_agent": "...",
    #   "referrer": "..."
    # }
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = "User Interaction"
        verbose_name_plural = "User Interactions"
        
        # === Optimized Indexes for CF Queries ===
        indexes = [
            # User history queries
            models.Index(
                fields=['user_id', 'timestamp'],
                name='idx_user_time'
            ),
            # Product popularity queries
            models.Index(
                fields=['product_id', 'timestamp'],
                name='idx_product_time'
            ),
            # Interaction type filtering
            models.Index(
                fields=['interaction_type', 'timestamp'],
                name='idx_type_time'
            ),
            # Session funnel analysis
            models.Index(
                fields=['session_id', 'timestamp'],
                name='idx_session_time'
            ),
            # CF export queries (user + product + type)
            models.Index(
                fields=['user_id', 'product_id', 'interaction_type'],
                name='idx_user_product_type'
            ),
        ]
        
        # === Constraints ===
        constraints = [
            # Scroll depth must be 0-100
            models.CheckConstraint(
                check=models.Q(scroll_depth__isnull=True) | 
                      (models.Q(scroll_depth__gte=0) & models.Q(scroll_depth__lte=100)),
                name='valid_scroll_depth'
            ),
            # Time on page must be non-negative
            models.CheckConstraint(
                check=models.Q(time_on_page__isnull=True) | models.Q(time_on_page__gte=0),
                name='valid_time_on_page'
            ),
        ]
    
    def __str__(self):
        return f"{self.user_id[:20]} - {self.interaction_type} - {self.product_id}"
    
    @property
    def cf_weight(self):
        """
        Calculate confidence weight for CF training.
        Based on 2024 implicit feedback best practices.
        """
        weights = {
            'view_item': 0.3,
            'add_to_cart': 0.6,
            'remove_from_cart': -0.3,  # Negative signal
            'begin_checkout': 0.7,
            'add_payment_info': 0.8,
            'add_shipping_info': 0.9,
            'purchase': 1.0,
            'search': 0.2,
        }
        
        base_weight = weights.get(self.interaction_type, 0.3)
        
        # Boost weight if user spent significant time (engagement signal)
        if self.time_on_page and self.time_on_page > 30:  # 30+ seconds
            base_weight *= 1.2
        
        # Boost if high scroll depth (engaged)
        if self.scroll_depth and self.scroll_depth > 75:  # 75%+ scrolled
            base_weight *= 1.1
        
        # Cap at 1.0
        return min(base_weight, 1.0)
    
    def to_cf_dict(self):
        """
        Convert to CF training format.
        Compatible with existing item_based_cf.py interface.
        """
        return {
            'user_id': self.user_id,
            'product_id': self.product_id,
            'interaction_type': self.interaction_type,
            'timestamp': self.timestamp.isoformat(),
            'weight': self.cf_weight
        }
    
    @classmethod
    def get_cf_training_data(cls, days=30, interaction_types=None):
        """
        Export interactions for CF model training.
        
        Args:
            days: Number of days to look back (default: 30)
            interaction_types: List of types to include (default: all positive signals)
        
        Returns:
            List of dicts ready for CF training
        """
        if interaction_types is None:
            # Default: Only positive signals for CF
            interaction_types = [
                'view_item',
                'add_to_cart',
                'begin_checkout',
                'purchase'
            ]
        
        since = timezone.now() - timezone.timedelta(days=days)
        
        interactions = cls.objects.filter(
            timestamp__gte=since,
            interaction_type__in=interaction_types
        ).select_related().order_by('timestamp')
        
        return [i.to_cf_dict() for i in interactions]
