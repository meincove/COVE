"""
Standardized response utilities.
Provides consistent response formats across the API.
"""
from rest_framework.response import Response
from django.http import JsonResponse


def error_response(message: str, status: int = 400, **extra):
    """
    Create standardized error response.
    
    Args:
        message: Error message
        status: HTTP status code
        **extra: Additional fields to include
        
    Returns:
        DRF Response object
    """
    return Response(
        {
            "error": message,
            "success": False,
            **extra
        },
        status=status
    )


def success_response(data=None, message=None, status=200):
    """
    Create standardized success response.
    
    Args:
        data: Response data
        message: Success message
        status: HTTP status code
        
    Returns:
        DRF Response object
    """
    response = {"success": True}
    
    if message:
        response["message"] = message
    
    if data is not None:
        response["data"] = data
    
    return Response(response, status=status)


def json_error(message: str, status: int = 400, **extra):
    """
    Create standardized JSON error response (for non-DRF views).
    
    Args:
        message: Error message
        status: HTTP status code
        **extra: Additional fields
        
    Returns:
        JsonResponse object
    """
    return JsonResponse(
        {
            "error": message,
            "success": False,
            **extra
        },
        status=status
    )


def json_success(data=None, message=None, status=200):
    """
    Create standardized JSON success response (for non-DRF views).
    
    Args:
        data: Response data
        message: Success message
        status: HTTP status code
        
    Returns:
        JsonResponse object
    """
    response = {"success": True}
    
    if message:
        response["message"] = message
    
    if data is not None:
        response["data"] = data
    
    return JsonResponse(response, status=status)
