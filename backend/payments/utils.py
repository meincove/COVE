# payments/utils.py
"""
Utility functions for payment processing and validation.
"""
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import hashlib


def sanitize_email(email_input):
    """
    Validate and sanitize email addresses.
    
    Args:
        email_input: Email string from user input or metadata
        
    Returns:
        str or None: Validated email or None if invalid
    """
    if not email_input:
        return None
        
    email = str(email_input).strip()
    
    try:
        validate_email(email)
        return email
    except ValidationError:
        return None


def generate_fallback_email(user_id):
    """
    Generate a privacy-preserving fallback email for users without email.
    
    Args:
        user_id: User identifier (clerk_user_id or similar)
        
    Returns:
        str: Hashed fallback email address
    """
    if not user_id:
        return "unknown@noemail.local"
        
    # Hash to prevent user ID enumeration
    hash_short = hashlib.sha256(str(user_id).encode()).hexdigest()[:8]
    return f"user_{hash_short}@noemail.local"


def validate_shipping_input(country, weight_g):
    """
    Validate shipping-related inputs.
    
    Args:
        country: ISO 2-letter country code
        weight_g: Weight in grams
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None, sanitized_values: dict)
    """
    errors = []
    
    # Validate country code
    country = (country or "").strip().upper()
    if len(country) != 2:
        errors.append("Country must be 2-letter ISO code")
    
    # Validate weight
    try:
        weight_g = int(weight_g)
        if not (0 <= weight_g <= 50000):  # Max 50kg
            errors.append("Weight must be between 0 and 50000 grams")
    except (ValueError, TypeError):
        errors.append("Invalid weight format")
        weight_g = 0
    
    if errors:
        return False, "; ".join(errors), None
        
    return True, None, {"country": country, "weight_g": weight_g}
