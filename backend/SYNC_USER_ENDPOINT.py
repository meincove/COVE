# api/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import UserProfile

User = get_user_model()

@api_view(['POST'])
def sync_user(request):
    """
    Sync user from Clerk to Django backend
    Called after sign-in/sign-up from frontend
    
    Expected payload:
    {
        "clerk_user_id": "user_xxx",
        "email": "user@example.com",
        "full_name": "John Doe",
        "signup_source": "shop" or "platform"
    }
    """
    data = request.data
    clerk_user_id = data.get('clerk_user_id')
    email = data.get('email')
    full_name = data.get('full_name', '')
    signup_source = data.get('signup_source', 'shop')
    
    if not clerk_user_id or not email:
        return Response({
            'error': 'Missing required fields: clerk_user_id and email'
        }, status=400)
    
    try:
        # Get or create Django user
        user, user_created = User.objects.get_or_create(
            email=email,
            defaults={'username': email}
        )
        
        # Update name if provided and user was just created
        if full_name and user_created:
            parts = full_name.split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()
        
        # Get or create profile
        # NOTE: Change 'clerk_id' to 'clerk_user_id' after migration
        profile, profile_created = UserProfile.objects.get_or_create(
            clerk_id=clerk_user_id,  # TODO: Change to clerk_user_id after migration
            defaults={
                'user': user,
                # Add these fields after you update the model:
                # 'signup_source': signup_source,
                # 'user_type': 'brand' if signup_source == 'platform' else 'shopper'
            }
        )
        
        # Update last login (add this field to model)
        # profile.last_login_date = timezone.now()
        # profile.save()
        
        return Response({
            'success': True,
            'user_id': user.id,
            'profile_id': profile.id,
            'created': user_created,
            'message': 'User synced successfully'
        })
        
    except Exception as e:
        return Response({
            'error': f'Failed to sync user: {str(e)}'
        }, status=500)
