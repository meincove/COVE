# backend/ai_profiles/models.py
import uuid
from django.db import models
from django.contrib.auth import get_user_model
User = get_user_model()
class AiUserProfile(models.Model):
    """
    Per-user preference profile that Cove AI can use as a bias
    (sizes, colors, style tags, etc.).
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="ai_profile",
        null=True,
        blank=True,
    )

    clerk_user_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text="Clerk user id, used when user object is not resolved yet.",
    )

    preferred_size_top = models.CharField(
        max_length=8, blank=True, null=True
    )
    preferred_size_bottom = models.CharField(
        max_length=8, blank=True, null=True
    )

    # Gender preference for recommendations (male, female, unisex)
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('unisex', 'Unisex'),
    ]
    gender = models.CharField(
        max_length=16, 
        choices=GENDER_CHOICES,
        blank=True, 
        null=True,
        help_text="User's gender preference for product recommendations"
    )

    preferred_fit = models.CharField(
        max_length=32, blank=True, null=True
    )

    # store as list of strings: ["black", "green"]
    preferred_colors = models.JSONField(
        blank=True, null=True
    )
    disliked_colors = models.JSONField(
        blank=True, null=True
    )

    # free-form tags like ["minimal", "streetwear", "techwear"]
    style_tags = models.JSONField(
        blank=True, null=True
    )

    # anything else we want to stash
    extra = models.JSONField(
        blank=True, null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        base = self.user.email if self.user else self.clerk_user_id or "anonymous"
        return f"AI profile for {base}"


class ChatSession(models.Model):
    """
    Logical chat session for history + analytics.

    A session belongs either to a logged-in Clerk user or to a guestSessionId.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_chat_sessions",
    )

    clerk_user_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
    )

    guest_session_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
    )

    # last known cart id for this session (if any)
    cart_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
    )

    # what the agent last did in this session: "answer", "recommendations",
    # "cart_proposal", etc. This is exactly what your log_chat view passes.
    last_agent_kind = models.CharField(
        max_length=32,
        blank=True,
        null=True,
    )

    # arbitrary metadata about the session
    metadata = models.JSONField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["clerk_user_id"]),
            models.Index(fields=["guest_session_id"]),
        ]

    def __str__(self) -> str:
        if self.clerk_user_id:
            return f"Session for clerk {self.clerk_user_id}"
        if self.guest_session_id:
            return f"Guest session {self.guest_session_id}"
        return f"ChatSession {self.pk}"


class ChatMessage(models.Model):
    """
    Individual messages inside a ChatSession.
    """
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    # "user" | "assistant" | "system"
    role = models.CharField(max_length=16)

    content = models.TextField()

    # optional: which agent pipeline produced this
    agent_kind = models.CharField(
        max_length=32,
        blank=True,
        null=True,
    )

    # 0, 1, 2, ... for ordering within the session
    turn_index = models.IntegerField(default=0)

    # any structured payload we want to retain (debug_plan, cart_payload, etc.)
    payload = models.JSONField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"[{self.role}] {self.content[:40]}..."


class AiConversationEvent(models.Model):
    """
    One message in a conversation between user and Cove AI.
    
    This is the primary source of truth for conversation history,
    used by the AI agent to maintain context across turns.
    """
    
    ROLE_USER = "user"
    ROLE_ASSISTANT = "assistant"
    
    ROLE_CHOICES = (
        (ROLE_USER, "user"),
        (ROLE_ASSISTANT, "assistant"),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Identity / session
    guest_session_id = models.CharField(
        max_length=128,
        blank=True,
        db_index=True,
        help_text="Anonymous session id from frontend (guestSessionId).",
    )
    clerk_user_id = models.CharField(
        max_length=128,
        blank=True,
        db_index=True,
        help_text="Clerk user id if logged in.",
    )
    email = models.EmailField(
        blank=True,
        help_text="Email if available at the time of the event.",
    )
    
    # Message content
    role = models.CharField(
        max_length=16,
        choices=ROLE_CHOICES,
        help_text="'user' or 'assistant'.",
    )
    kind = models.CharField(
        max_length=64,
        blank=True,
        help_text="High-level kind: 'question', 'answer', 'recommendations', 'size_fit', etc.",
    )
    content = models.TextField(
        help_text="Raw text that the user or assistant saw.",
    )
    meta = models.JSONField(
        default=dict,
        blank=True,
        help_text="Optional structured metadata (filters, items, cartId, etc.).",
    )
    
    source = models.CharField(
        max_length=64,
        default="cove-ai-core",
        help_text="Origin service, e.g. 'cove-ai-core', 'frontend', etc.",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=["guest_session_id", "created_at"]),
            models.Index(fields=["clerk_user_id", "created_at"]),
        ]
        ordering = ["-created_at"]
    
    def __str__(self) -> str:
        return f"{self.created_at} {self.role} {self.kind} ({self.guest_session_id or self.clerk_user_id})"
