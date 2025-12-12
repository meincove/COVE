from django.contrib import admin
from .models import UserInteraction


@admin.register(UserInteraction)
class UserInteractionAdmin(admin.ModelAdmin):
    """
    Django admin for UserInteraction.
    Production-grade admin with filters, search, and readonly fields.
    """
    
    list_display = [
        'id',
        'user_id_short',
        'product_id',
        'interaction_type',
        'timestamp',
        'cf_weight',
        'session_id_short',
        'consent_given',
    ]
    
    list_filter = [
        'interaction_type',
        'consent_given',
        'anonymized',
        'timestamp',
    ]
    
    search_fields = [
        'user_id',
        'product_id',
        'session_id',
    ]
    
    readonly_fields = [
        'timestamp',
        'cf_weight',
    ]
    
    date_hierarchy = 'timestamp'
    
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Identification', {
            'fields': ('user_id', 'product_id', 'session_id')
        }),
        ('Interaction', {
            'fields': ('interaction_type', 'timestamp', 'cf_weight')
        }),
        ('Engagement', {
            'fields': ('time_on_page', 'scroll_depth'),
            'classes': ('collapse',)
        }),
        ('Privacy & Compliance', {
            'fields': ('consent_given', 'anonymized')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
    )
    
    def user_id_short(self, obj):
        """Truncate user_id for display"""
        return obj.user_id[:25] + '...' if len(obj.user_id) > 25 else obj.user_id
    user_id_short.short_description = 'User'
    
    def session_id_short(self, obj):
        """Truncate session_id for display"""
        return obj.session_id[:20] + '...' if len(obj.session_id) > 20 else obj.session_id
    session_id_short.short_description = 'Session'
    
    def has_add_permission(self, request):
        """Disable manual creation (should come from API)"""
        return False
