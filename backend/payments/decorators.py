# payments/decorators.py
"""
Security decorators and utilities for payment endpoints.
"""
from functools import wraps
from django.http import JsonResponse


def require_https(view_func):
    """
    Decorator to enforce HTTPS on webhooks and sensitive endpoints.
    
    Returns 400 if request is not secure (except in DEBUG mode).
    """
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        from django.conf import settings
        
        # Skip check in development
        if settings.DEBUG:
            return view_func(request, *args, **kwargs)
            
        if not request.is_secure():
            return JsonResponse(
                {"error": "https_required", "details": "This endpoint requires HTTPS"},
                status=400
            )
        return view_func(request, *args, **kwargs)
    return wrapped


def validate_stripe_event_age(event, max_age_seconds=300):
    """
    Validate that a Stripe event is recent (within max_age_seconds).
    
    Args:
        event: Stripe event dict
        max_age_seconds: Maximum age in seconds (default: 5 minutes)
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    from django.utils import timezone
    from datetime import datetime, timedelta
    
    event_timestamp = event.get("created")
    if not event_timestamp:
        return False, "event_missing_timestamp"
        
    try:
        event_time = datetime.fromtimestamp(event_timestamp, tz=timezone.utc)
        event_age = timezone.now() - event_time
        
        if event_age > timedelta(seconds=max_age_seconds):
            return False, f"event_too_old (age: {event_age.total_seconds():.0f}s)"
            
        # Also reject events from the future (clock skew attack)
        if event_age < timedelta(seconds=-60):  # Allow 1 min future tolerance
            return False, "event_from_future"
            
        return True, None
    except (ValueError, TypeError, OverflowError):
        return False, "invalid_event_timestamp"
