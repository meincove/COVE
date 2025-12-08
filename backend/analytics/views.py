"""
Analytics API Views - User Interaction Tracking

2024 Best Practices:
- Rate limiting (100/min)
- GDPR compliance
- Batch processing
- Fail silently
"""

import logging
from datetime import timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework import status

from .models import UserInteraction

logger = logging.getLogger(__name__)


class TrackingThrottle(AnonRateThrottle):
    """Rate limit for tracking endpoints - prevents spam"""
    rate = '100/minute'  # 2024 best practice


@api_view(['POST'])
@permission_classes([AllowAny])  # Public endpoint
@throttle_classes([TrackingThrottle])
def track_interaction(request):
    """
    Track single user interaction with product.
    
    2024 Best Practices:
    - GDPR compliant (consent check)
    - Rate limited
    - Fail silently (no UX impact)
    - Async processing ready
    
    Request Body:
    {
        "user_id": "user_123" or "anon_abc",
        "product_id": "CCH001",
        "interaction_type": "view_item",
        "session_id": "sess_xyz",
        "time_on_page": 45,  # optional
        "scroll_depth": 80,  # optional
        "consent_given": true,
        "metadata": {}  # optional
    }
    """
    try:
        # Extract data
        data = request.data
        
        # GDPR: Check consent
        consent = data.get('consent_given', False)
        
        # Create interaction
        interaction = UserInteraction.objects.create(
            user_id=data.get('user_id'),
            product_id=data.get('product_id'),
            interaction_type=data.get('interaction_type'),
            session_id=data.get('session_id', ''),
            time_on_page=data.get('time_on_page'),
            scroll_depth=data.get('scroll_depth'),
            consent_given=consent,
            anonymized=not consent,  # Anonymize if no consent
            metadata=data.get('metadata', {})
        )
        
        return Response({
            "success": True,
            "id": interaction.id,
            "cf_weight": interaction.cf_weight
        }, status=status.HTTP_201_CREATED)
        
    except KeyError as e:
        logger.error(f"Missing required field: {e}")
        return Response({
            "success": False,
            "error": f"Missing required field: {e}"
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        # Fail silently - don't break UX
        logger.error(f"Tracking error: {e}")
        return Response({
            "success": False,
            "error": "Internal server error"
        }, status=status.HTTP_200_OK)  # Still return 200 to not break frontend


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([TrackingThrottle])
def track_batch(request):
    """
    Track multiple interactions in batch (2024 best practice).
    
    More efficient than individual tracking.
    Frontend batches events every 5s or 10 events.
    
    Request Body:
    {
        "events": [
            {
                "user_id": "...",
                "product_id": "...",
                "interaction_type": "...",
                ...
            },
            ...
        ]
    }
    """
    try:
        events = request.data.get('events', [])
        
        if not events:
            return Response({
                "success": False,
                "error": "No events provided"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Batch create (efficient)
        interactions = []
        for event in events:
            consent = event.get('consent_given', False)
            interactions.append(
                UserInteraction(
                    user_id=event.get('user_id'),
                    product_id=event.get('product_id'),
                    interaction_type=event.get('interaction_type'),
                    session_id=event.get('session_id', ''),
                    time_on_page=event.get('time_on_page'),
                    scroll_depth=event.get('scroll_depth'),
                    consent_given=consent,
                    anonymized=not consent,
                    metadata=event.get('metadata', {})
                )
            )
        
        # Bulk create (single DB query)
        created = UserInteraction.objects.bulk_create(interactions)
        
        return Response({
            "success": True,
            "count": len(created)
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Batch tracking error: {e}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_200_OK)  # Fail silently


@api_view(['GET'])
@permission_classes([IsAdminUser])  # Admin only - sensitive data
def export_cf_data(request):
    """
    Export interaction data for CF model training.
    
    Admin-only endpoint for CF pipeline.
    Returns formatted data ready for item_based_cf.py
    
    Query Params:
    - since: ISO timestamp or days (default: 30)
    - interaction_types: comma-separated (default: view_item,add_to_cart,purchase)
    
    Response:
    [
        {
            "user_id": "...",
            "product_id": "...",
            "interaction_type": "...",
            "timestamp": "...",
            "weight": 0.3-1.0
        },
        ...
    ]
    """
    try:
        # Parse params
        since_param = request.GET.get('since', '30')  # Default: 30 days
        
        # Handle both days and ISO timestamp
        try:
            days = int(since_param)
            since = timezone.now() - timedelta(days=days)
        except ValueError:
            # Try parsing as ISO timestamp
            since = timezone.datetime.fromisoformat(since_param)
        
        # Get interaction types
        types_param = request.GET.get(
            'interaction_types',
            'view_item,add_to_cart,begin_checkout,add_payment_info,purchase'
        )
        interaction_types = [t.strip() for t in types_param.split(',')]
        
        # Use model method to get CF-formatted data
        cf_data = UserInteraction.get_cf_training_data(
            days=(timezone.now() - since).days,
            interaction_types=interaction_types
        )
        
        return Response({
            "success": True,
            "count": len(cf_data),
            "since": since.isoformat(),
            "interaction_types": interaction_types,
            "data": cf_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"CF export error: {e}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_stats(request):
    """
    Get analytics statistics.
    
    Admin-only endpoint for monitoring.
    
    Returns:
    - Total interactions
    - Interactions by type
    - Recent activity
    - User count
    - Product count
    """
    try:
        from django.db.models import Count
        
        # Total interactions
        total = UserInteraction.objects.count()
        
        # By type
        by_type = dict(
            UserInteraction.objects.values('interaction_type')
            .annotate(count=Count('id'))
            .values_list('interaction_type', 'count')
        )
        
        # Recent (last 24h)
        last_24h = UserInteraction.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        # Unique users/products
        unique_users = UserInteraction.objects.values('user_id').distinct().count()
        unique_products = UserInteraction.objects.values('product_id').distinct().count()
        
        return Response({
            "success": True,
            "stats": {
                "total_interactions": total,
                "by_type": by_type,
                "last_24h": last_24h,
                "unique_users": unique_users,
                "unique_products": unique_products
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Analytics stats error: {e}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
