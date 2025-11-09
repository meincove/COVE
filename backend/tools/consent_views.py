from __future__ import annotations
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, authentication_classes, renderer_classes
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework import status

from .models import Consent
from .serializers import ConsentGetQuery, ConsentOut, ConsentSetIn

def _make_key(user_id: str|None, guest: str|None, email: str|None) -> tuple[str, dict]:
    if user_id:
        return f"user:{user_id}", {"clerk_user_id": user_id}
    if guest:
        return f"guest:{guest}", {"guest_session_id": guest}
    if email:
        return f"email:{email.lower()}", {"email": email.lower()}
    return "anon:", {}  # should not happen if serializers are enforced

def _shape(c: Consent) -> dict:
    return {
        "key": c.key,
        "userId": c.clerk_user_id or "",
        "guestSessionId": c.guest_session_id or "",
        "email": c.email or "",
        "marketing": c.marketing,
        "analytics": c.analytics,
        "personalized": c.personalized,
        "updated_at": c.updated_at,
    }

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
@renderer_classes([JSONRenderer])
def consent_get(request):
    q = ConsentGetQuery(data=request.query_params)
    q.is_valid(raise_exception=True)
    d = q.validated_data

    key, identity = _make_key(d.get("userId"), d.get("guestSessionId"), d.get("email"))
    try:
        c = Consent.objects.get(key=key)
        out = ConsentOut(data=_shape(c)); out.is_valid(raise_exception=True)
        return Response(out.validated_data)
    except Consent.DoesNotExist:
        # default empty record (not created)
        payload = {
            "key": key, "userId": identity.get("clerk_user_id",""), "guestSessionId": identity.get("guest_session_id",""),
            "email": identity.get("email",""), "marketing": False, "analytics": False, "personalized": False,
            "updated_at": timezone.now(),
        }
        out = ConsentOut(data=payload); out.is_valid(raise_exception=True)
        return Response(out.validated_data)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
@renderer_classes([JSONRenderer])
def consent_set(request):
    inp = ConsentSetIn(data=request.data or {})
    inp.is_valid(raise_exception=True)
    d = inp.validated_data

    key, identity = _make_key(d.get("userId"), d.get("guestSessionId"), d.get("email"))
    c, _created = Consent.objects.get_or_create(key=key, defaults=identity)

    # allow partial updates
    for fld in ("clerk_user_id","guest_session_id","email"):
        if identity.get(fld):
            setattr(c, fld, identity[fld])
    for f in ("marketing","analytics","personalized"):
        if f in d:
            setattr(c, f, bool(d[f]))
    c.save()

    out = ConsentOut(data=_shape(c)); out.is_valid(raise_exception=True)
    return Response(out.validated_data, status=status.HTTP_200_OK)
