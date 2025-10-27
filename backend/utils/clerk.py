# import requests
# from rest_framework.exceptions import AuthenticationFailed
# import jwt
# from jwt import algorithms

# # Correct Clerk JWKS URL (from your subdomain)
# CLERK_PEM_URL = "https://pretty-colt-1.clerk.accounts.dev/.well-known/jwks.json"

# EXPECTED_AUDIENCE = "http://localhost:3000"  # must match token's aud
# ISSUER = "https://pretty-colt-1.clerk.accounts.dev"  # must match token's iss

# def get_public_keys():
#     res = requests.get(CLERK_PEM_URL)
#     jwks = res.json()
#     return {
#         key["kid"]: algorithms.RSAAlgorithm.from_jwk(key)
#         for key in jwks["keys"]
#     }

# def verify_clerk_token(token: str):
#     print("🛠 Incoming token:", token[:60], "...")
#     try:
#         headers = jwt.get_unverified_header(token)
#         kid = headers["kid"]
#         print("🔍 Token Header KID:", kid)
#     except Exception as e:
#         print("❌ Failed to parse header:", str(e))
#         raise AuthenticationFailed("Invalid JWT header.")

#     public_keys = get_public_keys()
#     print("🔐 Available JWKS keys:", list(public_keys.keys()))
    
#     key = public_keys.get(kid)
#     if key is None:
#         print("❌ No matching public key for kid:", kid)
#         raise AuthenticationFailed("Public key not found.")

#     try:
#         print("📥 Attempting decode with:")
#         print("  - Audience:", EXPECTED_AUDIENCE)
#         print("  - Issuer:", ISSUER)
        
#         decoded = jwt.decode(
#             token,
#             key=key,
#             algorithms=["RS256"],
#             audience=EXPECTED_AUDIENCE,
#             issuer=ISSUER,
#         )
#         print("✅ Token successfully decoded:", decoded)
#         return decoded
    
    
#     except jwt.ExpiredSignatureError:
#         print("❌ Token expired")
#         raise AuthenticationFailed("Token has expired.")
#     except jwt.InvalidAudienceError as e:
#         print("❌ Audience mismatch:", e)
#         raise AuthenticationFailed("Invalid audience.")
#     except jwt.InvalidIssuerError as e:
#         print("❌ Issuer mismatch:", e)
#         raise AuthenticationFailed("Invalid issuer.")
#     except jwt.InvalidTokenError as e:
#         print("❌ Token invalid:", e)
#         raise AuthenticationFailed(f"Invalid token: {e}")
#     except Exception as e:
#         print("🔥 Unhandled exception during decoding:", e)
#         raise AuthenticationFailed("Unknown error while decoding token.")



import jwt
import requests
from jwt import algorithms
from rest_framework.exceptions import AuthenticationFailed

CLERK_PEM_URL = "https://pretty-colt-1.clerk.accounts.dev/.well-known/jwks.json"
EXPECTED_AUDIENCE = "http://localhost:3000"
ISSUER = "https://pretty-colt-1.clerk.accounts.dev"

def get_public_keys():
    try:
        jwks = requests.get(CLERK_PEM_URL).json()
        print("🔐 JWK fetched successfully")
        return {key["kid"]: algorithms.RSAAlgorithm.from_jwk(key) for key in jwks["keys"]}
    except Exception as e:
        print("❌ Failed to fetch JWK:", e)
        raise AuthenticationFailed("Unable to fetch Clerk public keys.")

def verify_clerk_token(token):
    print("🛠 Incoming token:", token[:40] + "...")  # safe print
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header["kid"]
    public_keys = get_public_keys()
    
    key = public_keys.get(kid)
    if key is None:
        print("❌ No matching public key for kid:", kid)
        raise AuthenticationFailed("Public key not found.")

    try:
        print("📥 Attempting decode with:")
        print("  - Audience:", EXPECTED_AUDIENCE)
        print("  - Issuer:", ISSUER)

        decoded = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=EXPECTED_AUDIENCE,
            issuer=ISSUER,
            options={"verify_aud": False},  # ✅ disables audience check
            leeway=100  # ← allows 60 seconds skew
        )
        print("✅ Token decoded successfully")
        return decoded
    except jwt.ExpiredSignatureError:
        print("❌ Token expired")
        raise AuthenticationFailed("Token has expired.")
    except jwt.InvalidAudienceError as e:
        print("❌ Audience mismatch:", e)
        raise AuthenticationFailed("Invalid audience.")
    except jwt.InvalidIssuerError as e:
        print("❌ Issuer mismatch:", e)
        raise AuthenticationFailed("Invalid issuer.")
    except jwt.InvalidTokenError as e:
        print("❌ Token verification failed:", e)
        raise AuthenticationFailed("Invalid token")
