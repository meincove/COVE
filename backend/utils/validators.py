"""
Input validation utilities.
Provides reusable validation functions for common data types.
"""
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError


def validate_email(email: str) -> str:
    """
    Validate and return normalized email.
    
    Args:
        email: Email address to validate
        
    Returns:
        Normalized email (lowercase, trimmed)
        
    Raises:
        DRFValidationError: If email is invalid
    """
    if not email:
        raise DRFValidationError("Email is required")
    
    email = email.strip().lower()
    try:
        django_validate_email(email)
    except ValidationError:
        raise DRFValidationError("Invalid email format")
    
    return email


def validate_quantity(quantity, max_qty: int = 100, min_qty: int = 1) -> int:
    """
    Validate cart/order quantity.
    
    Args:
        quantity: Quantity value to validate
        max_qty: Maximum allowed quantity (default: 100)
        min_qty: Minimum allowed quantity (default: 1)
        
    Returns:
        Validated quantity as integer
        
    Raises:
        DRFValidationError: If quantity is invalid
    """
    try:
        qty = int(quantity)
    except (ValueError, TypeError):
        raise DRFValidationError("Quantity must be a number")
    
    if not min_qty <= qty <= max_qty:
        raise DRFValidationError(f"Quantity must be between {min_qty} and {max_qty}")
    
    return qty


def validate_clerk_user_id(clerk_id: str) -> str:
    """
    Validate Clerk user ID format.
    
    Args:
        clerk_id: Clerk user ID to validate
        
    Returns:
        Validated clerk_id
        
    Raises:
        DRFValidationError: If clerk_id is invalid
    """
    if not clerk_id:
        raise DRFValidationError("Clerk user ID is required")
    
    clerk_id = clerk_id.strip()
    
    # Clerk user IDs start with "user_" and have additional characters
    if not clerk_id.startswith("user_") or len(clerk_id) <= 5:
        raise DRFValidationError("Invalid Clerk user ID format")
    
    return clerk_id


def validate_file_upload(file, allowed_extensions=None, max_size_mb: int = 5):
    """
    Validate uploaded file.
    
    Args:
        file: Django UploadedFile object
        allowed_extensions: List of allowed extensions (e.g., ['.pdf', '.png'])
        max_size_mb: Maximum file size in MB (default: 5)
        
    Returns:
        Validated file object
        
    Raises:
        DRFValidationError: If file is invalid
    """
    import os
    
    if allowed_extensions is None:
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
    
    # Check size
    max_size = max_size_mb * 1024 * 1024
    if file.size > max_size:
        raise DRFValidationError(f"File size exceeds {max_size_mb}MB limit")
    
    # Check extension
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_extensions:
        raise DRFValidationError(
            f"File type {ext} not allowed. Allowed: {', '.join(allowed_extensions)}"
        )
    
    return file


def validate_payment_amount(amount, max_amount: float = 10000.00) -> float:
    """
    Validate payment amount.
    
    Args:
        amount: Amount to validate
        max_amount: Maximum allowed amount (default: 10000.00)
        
    Returns:
        Validated amount as float
        
    Raises:
        DRFValidationError: If amount is invalid
    """
    try:
        amt = float(amount)
    except (ValueError, TypeError):
        raise DRFValidationError("Amount must be a number")
    
    if amt <= 0:
        raise DRFValidationError("Amount must be positive")
    
    if amt > max_amount:
        raise DRFValidationError(f"Amount exceeds maximum of {max_amount}")
    
    return amt


def sanitize_string(value: str, max_length: int = 255) -> str:
    """
    Sanitize string input.
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not value:
        return ""
    
    # Strip whitespace and limit length
    sanitized = str(value).strip()[:max_length]
    
    return sanitized
