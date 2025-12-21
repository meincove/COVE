from django.db import models
from django.contrib.postgres.fields import ArrayField
import json


class UserProfile(models.Model):
    """
    Store user fashion preferences and style profile.
    
    Week 2: User Preference Learning
    Stores structured data about user preferences that persist across sessions.
    
    Examples:
        - User says "I love navy" → color_preferences = ["navy"]
        - User says "I hate hoodies" → dislikes = ["hoodie"]
        - User buys slim fit → fit_preferences = ["slim"]
    """
    user_id = models.CharField(
        max_length=255, 
        unique=True, 
        db_index=True,
        help_text="Unique identifier for the user (Clerk user ID or guest session ID)"
    )
    
    style_preference = models.CharField(
        max_length=50,
        default='casual',
        help_text="Overall style: casual, professional, streetwear, minimalist, etc."
    )
    
    color_preferences = models.JSONField(
        default=list,
        help_text="List of preferred colors: ['navy', 'black', 'grey']"
    )
    
    dislikes = models.JSONField(
        default=list,
        help_text="List of disliked items/styles: ['hoodies', 'patterns', 'bright_colors']"
    )
    
    fit_preferences = models.JSONField(
        default=list,
        help_text="Preferred fits: ['slim', 'regular', 'oversized']"
    )
    
    size_history = models.JSONField(
        default=dict,
        help_text="Track sizes by product type: {'hoodie': 'M', 'pants': '32', 'tee': 'L'}"
    )
    
    formality_preference = models.IntegerField(
        null=True,
        blank=True,
        help_text="Preferred formality level (1-10): 1=very casual, 10=very formal"
    )
    
    budget_range = models.JSONField(
        default=dict,
        help_text="Typical budget range: {'min': 50, 'max': 200, 'avg': 120}"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['style_preference']),
            models.Index(fields=['updated_at']),
        ]
    
    def __str__(self):
        return f"Profile: {self.user_id} ({self.style_preference})"
    
    def add_color_preference(self, color: str):
        """Add a color to preferences (deduplicate)"""
        if color not in self.color_preferences:
            self.color_preferences.append(color)
            self.save()
    
    def add_dislike(self, item: str):
        """Add an item to dislikes (deduplicate)"""
        if item not in self.dislikes:
            self.dislikes.append(item)
            self.save()
    
    def get_preferences_summary(self) -> dict:
        """Get a summary of all preferences"""
        return {
            'style': self.style_preference,
            'colors': self.color_preferences,
            'dislikes': self.dislikes,
            'fits': self.fit_preferences,
            'sizes': self.size_history,
            'formality': self.formality_preference,
            'budget': self.budget_range
        }
