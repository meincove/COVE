from django.contrib import admin
from django.contrib.auth.models import User
from .models import UserProfile




# Customize UserProfile display in admin
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number', 'clerk_id', 'created_at')
    search_fields = ('user__email', 'user__username', 'phone_number', 'clerk_id')


