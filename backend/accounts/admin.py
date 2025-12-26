from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'username', 'is_verified', 'is_online', 'created_at']
    list_filter = ['is_verified', 'is_online', 'is_staff']
    search_fields = ['email', 'username']
    readonly_fields = ['created_at', 'updated_at']
