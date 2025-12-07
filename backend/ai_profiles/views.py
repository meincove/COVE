# backend/ai_profiles/views.py
import json

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import get_user_model

from .models import AiUserProfile, ChatSession, ChatMessage

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_user_by_clerk_id(clerk_user_id: str):
    """
    Resolve a Django User from a Clerk user ID.

    Assumes your CustomUser model has `user_id` that stores the Clerk ID,
    as in sync_user() in api/views.py.
    """
    if not clerk_user_id:
        return None
    try:
        return User.objects.get(user_id=clerk_user_id)
    except User.DoesNotExist:
        return None


# ---------------------------------------------------------------------------
# AI user profile (sizes, colors, preferences)
# ---------------------------------------------------------------------------

@csrf_exempt
def ai_profile_get(request):
    """
    GET  /ai_profiles/profile.get?clerkUserId=...

    You can expose it under any prefix you like, e.g.:

      path("ai_profiles/", include("ai_profiles.urls"))

    and in ai_profiles/urls.py:

      path("profile.get", views.ai_profile_get, name="ai_profile_get")
    """
    if request.method != "GET":
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    clerk_user_id = request.GET.get("clerkUserId")
    if not clerk_user_id:
        return JsonResponse({"error": "Missing clerkUserId"}, status=400)

    user = _get_user_by_clerk_id(clerk_user_id)
    if not user:
        return JsonResponse({"error": "User not found for clerkUserId"}, status=404)

    profile, _ = AiUserProfile.objects.get_or_create(user=user)

    return JsonResponse(
        {
            "clerkUserId": clerk_user_id,
            "preferred_size_top": profile.preferred_size_top,
            "preferred_size_bottom": profile.preferred_size_bottom,
            "preferred_fit": profile.preferred_fit,
            "preferred_colors": profile.preferred_colors,
            "disliked_colors": profile.disliked_colors,
            "style_tags": profile.style_tags,
            "extra": profile.extra,
        }
    )


@csrf_exempt
def ai_profile_update(request):
    """
    POST /ai_profiles/profile.update

    Body JSON:
    {
      "clerkUserId": "usr_...",
      "preferred_size_top": "M",
      "preferred_size_bottom": "32",
      "preferred_fit": "slim",
      "preferred_colors": ["black", "olive"],
      "disliked_colors": ["neon"],
      "style_tags": ["minimal", "street"],
      "extra": {...}
    }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    clerk_user_id = data.get("clerkUserId")
    if not clerk_user_id:
        return JsonResponse({"error": "Missing clerkUserId"}, status=400)

    user = _get_user_by_clerk_id(clerk_user_id)
    if not user:
        return JsonResponse({"error": "User not found for clerkUserId"}, status=404)

    profile, _ = AiUserProfile.objects.get_or_create(user=user)

    # Simple field-upsert, but only if present in the payload
    for field in [
        "preferred_size_top",
        "preferred_size_bottom",
        "preferred_fit",
        "preferred_colors",
        "disliked_colors",
        "style_tags",
        "extra",
    ]:
        if field in data:
            setattr(profile, field, data[field])

    profile.save()

    return JsonResponse({"status": "ok"})


# ---------------------------------------------------------------------------
# Chat logging (sessions + messages)
# ---------------------------------------------------------------------------

# backend/ai_profiles/views.py (only the core of log_chat)

@csrf_exempt
def log_chat(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    clerk_user_id = data.get("clerkUserId")
    guest_session_id = data.get("guestSessionId")
    role = data.get("role") or "user"
    content = data.get("content") or ""
    agent_kind = data.get("agent_kind") or ""
    cart_id = data.get("cartId")
    meta = data.get("meta") or {}

    # resolve user from clerk id if possible
    user = None
    if clerk_user_id:
        try:
            user = User.objects.get(user_id=clerk_user_id)
        except User.DoesNotExist:
            user = None

    session = ChatSession.objects.create(
        user=user,
        clerk_user_id=clerk_user_id,
        guest_session_id=guest_session_id,
        cart_id=cart_id,
        last_agent_kind=agent_kind,
        metadata=meta,
    )

    ChatMessage.objects.create(
        session=session,
        role=role,
        content=content,
        agent_kind=agent_kind,
        turn_index=0,
        payload=meta,
    )

    return JsonResponse(
        {
            "status": "ok",
            "session_id": session.id,
        }
    )

from django.views.decorators.http import require_http_methods


@csrf_exempt
@require_http_methods(["GET"])
def get_history(request):
    """
    GET /ai_profiles/history/?guestSessionId=...&clerkUserId=...&limit=...

    - If clerkUserId is provided, we use that (signed-in user).
    - Else we fall back to guestSessionId.
    - Returns the most recent messages in reverse-chronological order,
      already grouped as a flat list suitable for feeding into the LLM.
    """
    guest_session_id = request.GET.get("guestSessionId") or None
    clerk_user_id = request.GET.get("clerkUserId") or None
    try:
        limit = int(request.GET.get("limit", "20"))
    except ValueError:
        limit = 20
    limit = max(1, min(limit, 100))

    if not guest_session_id and not clerk_user_id:
        return JsonResponse(
            {"error": "Provide guestSessionId or clerkUserId"},
            status=400,
        )

    # Build a filter for ChatSession
    session_filter = {}
    if clerk_user_id:
        session_filter["clerk_user_id"] = clerk_user_id
    if guest_session_id and not clerk_user_id:
        # only fall back to guest when no clerk id is given
        session_filter["guest_session_id"] = guest_session_id

    # All sessions for this user (guest or signed-in)
    sessions = ChatSession.objects.filter(**session_filter)

    if not sessions.exists():
        return JsonResponse({"messages": []})

    # Pull messages across those sessions, newest first
    qs = (
        ChatMessage.objects.filter(session__in=sessions)
        .select_related("session")
        .order_by("-created_at")[:limit]
    )

    msgs = []
    for m in qs:
        # Build a merged metadata dict:
        # - message-level payload
        # - plus session-level metadata (namespaced under "session")
        meta = {}

        if isinstance(m.payload, dict):
            meta.update(m.payload)

        if isinstance(m.session.metadata, dict):
            # keep session metadata separate so we don't overwrite payload keys
            meta.setdefault("session", m.session.metadata)

        msgs.append(
            {
                "session_id": m.session.id,
                "guestSessionId": m.session.guest_session_id,
                "clerkUserId": m.session.clerk_user_id,
                "role": m.role,
                "content": m.content,
                "agent_kind": m.agent_kind,
                # cart_id is on the *session*, not the message
                "cartId": m.session.cart_id,
                "meta": meta,
                "created_at": m.created_at.isoformat(),
            }
        )

    # Return in chronological order (oldest → newest) for the LLM
    msgs.reverse()

    return JsonResponse({" messages": msgs})


# ---------------------------------------------------------------------------
# Conversation History API (for AI Core)
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET"])
def conversation_history_get(request):
    """
    GET /ai_profiles/history/?guestSessionId=...&clerkUserId=...&limit=N
    
    Returns last N conversation events for the user/session in chronological order.
    Used by cove-ai-core to fetch conversation context.
    """
    from .models import AiConversationEvent
    
    guest_session_id = request.GET.get("guestSessionId", "").strip()
    clerk_user_id = request.GET.get("clerkUserId", "").strip()
    limit_raw = request.GET.get("limit", "20")
    
    try:
        limit = max(1, min(int(limit_raw), 100))
    except ValueError:
        limit = 20
    
    if not guest_session_id and not clerk_user_id:
        # No identifiers => nothing to return
        return JsonResponse({"items": []}, status=200)
    
    qs = AiConversationEvent.objects.all()
    if guest_session_id:
        qs = qs.filter(guest_session_id=guest_session_id)
    if clerk_user_id:
        qs = qs.filter(clerk_user_id=clerk_user_id)
    
    # newest first in DB → reverse to chronological for LLM
    events = list(qs.order_by("-created_at")[:limit])
    events.reverse()
    
    items = []
    for event in events:
        items.append({
            "id": str(event.id),
            "guest_session_id": event.guest_session_id,
            "clerk_user_id": event.clerk_user_id,
            "email": event.email,
            "role": event.role,
            "kind": event.kind,
            "content": event.content,
            "meta": event.meta,
            "source": event.source,
            "created_at": event.created_at.isoformat(),
        })
    
    return JsonResponse({"items": items}, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def conversation_event_log(request):
    """
    POST /ai_profiles/history/log/
    
    Body: AiConversationEvent fields (except id/created_at which are auto-generated).
    Used by cove-ai-core to log each user/assistant turn.
    """
    from .models import AiConversationEvent
    
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse(
            {"error": "invalid_json", "details": "Could not parse request body"},
            status=400
        )
    
    # Validate required fields
    role = data.get("role")
    if role not in ["user", "assistant"]:
        return JsonResponse(
            {"error": "invalid_role", "details": "role must be 'user' or 'assistant'"},
            status=400
        )
    
    content = data.get("content", "")
    if not content:
        return JsonResponse(
            {"error": "missing_content", "details": "content is required"},
            status=400
        )
    
    # Create event
    event = AiConversationEvent.objects.create(
        guest_session_id=data.get("guest_session_id", ""),
        clerk_user_id=data.get("clerk_user_id", ""),
        email=data.get("email", ""),
        role=role,
        kind=data.get("kind", ""),
        content=content,
        meta=data.get("meta", {}),
        source=data.get("source", "cove-ai-core"),
    )
    
    return JsonResponse({
        "id": str(event.id),
        "guest_session_id": event.guest_session_id,
        "clerk_user_id": event.clerk_user_id,
        "email": event.email,
        "role": event.role,
        "kind": event.kind,
        "content": event.content,
        "meta": event.meta,
        "source": event.source,
        "created_at": event.created_at.isoformat(),
    }, status=201)
