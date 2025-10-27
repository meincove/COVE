from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = (
        "id", "email", "username", "first_name", "last_name", "user_id", "is_staff"
    )
    search_fields = ("email", "username", "first_name", "last_name", "user_id")
    ordering = ("id",)
    
    readonly_fields = ("user_id", "last_login")

    fieldsets = (
        (None, {"fields": ("email", "password", "user_id", "image_url")}),
        ("Personal info", {"fields": ("first_name", "last_name", "username")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login",)}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email", "password1", "password2",
                "user_id", "username", "first_name", "last_name", "image_url"
            ),
        }),
    )
