from __future__ import annotations
import base64, json

from rest_framework.decorators import api_view, permission_classes, authentication_classes, renderer_classes
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from .serializers import IdentityResolveOut

def _b64url_decode(seg: str) -> bytes:
    seg += "=" * ((4 - len(seg) % 4) % 4)
    return base64.urlsafe_b64decode(seg.encode("utf-8"))

def _parse_jwt_noverify(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        payload = json.loads(_b64url_decode(parts[1]).decode("utf-8"))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}

def _extract_user_email_from_payload(p: dict) -> tuple[str|None, str|None]:
    # Common Clerk-ish keys: sub / user_id / id for user; email in 'email' or in identities
    uid = p.get("sub") or p.get("user_id") or p.get("id") or None
    email = p.get("email")
    if not email:
        # sometimes emails are nested
        try:
            ids = p.get("email_addresses") or []
            if ids and isinstance(ids, list):
                email = ids[0].get("email_address")
        except Exception:
            pass
    return uid, email

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([])
@renderer_classes([JSONRenderer])
def identity_resolve(request):
    """
    Resolve identity from:
      1) Authorization: Bearer <JWT>   (best-effort parse, no verify)
      2) params/body: userId / email
    """
    auth = request.headers.get("Authorization", "")
    user_id = None
    email = None
    source = "none"

    if auth.startswith("Bearer "):
        payload = _parse_jwt_noverify(auth.split(" ", 1)[1])
        uid, em = _extract_user_email_from_payload(payload)
        if uid or em:
            user_id = uid or None
            email = em or None
            source = "jwt"

    # Fallback to params/body
    if source == "none":
        data = request.data if request.method == "POST" else request.query_params
        uid = (data.get("userId") or "").strip()
        eml = (data.get("email") or "").strip()
        if uid or eml:
            user_id = uid or None
            email = eml or None
            source = "params"

    out = IdentityResolveOut(data={"userId": user_id or "", "email": email or "", "source": source})
    out.is_valid(raise_exception=True)
    return Response(out.validated_data)
