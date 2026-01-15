from django.contrib import admin
from .models import Room, SyncLog


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'host', 'participant_count', 'is_locked', 'created_at']
    list_filter = ['is_locked', 'created_at']
    search_fields = ['code', 'name', 'host__username']


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ['room', 'initiator', 'event_type', 'timestamp', 'created_at']
    list_filter = ['event_type']
