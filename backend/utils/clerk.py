"""
Clerk JWT token verification utilities.
Validates Clerk session tokens using JWKS public keys.
"""
import jwt
import requests
import logging
from jwt import algorithms
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings

logger = logging.getLogger(__name__)

# Get Clerk configuration from settings (fallback to hardcoded for backward compat)
CLERK_DOMAIN = getattr(settings, 'CLERK_FRONTEND_API', 'pretty-colt-1.clerk.accounts.dev')
CLERK_PEM_URL = f"https://{CLERK_DOMAIN}/.well-known/jwks.json"
EXPECTED_AUDIENCE = getattr(settings, 'CLERK_AUDIENCE', 'http://localhost:3000')
ISSUER = f"https://{CLERK_DOMAIN}"

# Cache for public keys (refreshed on failure)
_public_keys_cache = None


def get_public_keys(force_refresh=False):
    """
    Fetch Clerk's public keys from JWKS endpoint.
    
    Args:
        force_refresh: Force refresh even if cached
        
    Returns:
        Dict mapping kid -> RSA public key
        
    Raises:
        AuthenticationFailed: If unable to fetch keys
    """
    global _public_keys_cache
    
    if _public_keys_cache and not force_refresh:
        return _public_keys_cache
    
    try:
        response = requests.get(CLERK_PEM_URL, timeout=5)
        response.raise_for_status()
        jwks = response.json()
        
        keys = {
            key["kid"]: algorithms.RSAAlgorithm.from_jwk(key) 
            for key in jwks.get("keys", [])
        }
        
        _public_keys_cache = keys
        logger.info(f"Loaded {len(keys)} public keys from Clerk JWKS")
        return keys
        
    except requests.RequestException as e:
        logger.error(f"Failed to fetch Clerk JWK: {e}")
        raise AuthenticationFailed("Unable to fetch Clerk public keys")
    except Exception as e:
        logger.error(f"Error parsing JWKS: {e}")
        raise AuthenticationFailed("Invalid JWKS response")


def verify_clerk_token(token: str, verify_audience: bool = False):
    """
    Verify and decode a Clerk JWT token.
    
    Args:
        token: JWT token string
        verify_audience: Whether to verify audience claim (default: False for compatibility)
        
    Returns:
        Decoded JWT payload
        
    Raises:
        AuthenticationFailed: If token is invalid
    """
    if not token:
        raise AuthenticationFailed("Token is required")
    
    try:
        # Get token header to find key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        if not kid:
            raise AuthenticationFailed("Token missing key ID")
        
        # Get public keys
        public_keys = get_public_keys()
        key = public_keys.get(kid)
        
        if key is None:
            # Try refreshing keys in case rotation happened
            logger.warning(f"Key ID {kid} not found, refreshing JWKS")
            public_keys = get_public_keys(force_refresh=True)
            key = public_keys.get(kid)
            
            if key is None:
                raise AuthenticationFailed("Public key not found for token")
        
        # Decode and verify
        decoded = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=ISSUER,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": verify_audience,
            },
            audience=EXPECTED_AUDIENCE if verify_audience else None,
            leeway=60  # Allow 60 seconds clock skew
        )
        
        logger.debug(f"Successfully verified token for user: {decoded.get('sub')}")
        return decoded
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise AuthenticationFailed("Token has expired")
    except jwt.InvalidAudienceError:
        logger.warning(f"Invalid audience in token")
        raise AuthenticationFailed("Invalid audience")
    except jwt.InvalidIssuerError:
        logger.warning(f"Invalid issuer in token")
        raise AuthenticationFailed("Invalid issuer")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Token verification failed: {e}")
        raise AuthenticationFailed("Invalid token")
    except Exception as e:
        logger.error(f"Unexpected error verifying token: {e}", exc_info=True)
        raise AuthenticationFailed("Authentication failed")


def get_clerk_user_id_from_token(token: str) -> str:
    """
    Extract Clerk user ID from token.
    
    Args:
        token: JWT token string
        
    Returns:
        Clerk user ID (sub claim)
        
    Raises:
        AuthenticationFailed: If token is invalid
    """
    payload = verify_clerk_token(token)
    user_id = payload.get('sub')
    
    if not user_id:
        raise AuthenticationFailed("Token missing user ID")
    
    return user_id
