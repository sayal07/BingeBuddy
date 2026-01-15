"""
Room model for BingeBuddy watch parties.
Supports unique room codes, host controls, participant management.
"""

import random
import string
from django.db import models
from django.conf import settings


def generate_room_code():
    """Generate a unique 8-character alphanumeric room code."""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not Room.objects.filter(code=code).exists():
            return code


class Room(models.Model):
    """Watch party room model."""

    code = models.CharField(max_length=8, unique=True, default=generate_room_code)
    name = models.CharField(max_length=100, default='Watch Party')
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hosted_rooms'
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='joined_rooms',
        blank=True
    )

    # Video state
    current_video_url = models.CharField(max_length=500, blank=True, default='')
    current_video_title = models.CharField(max_length=300, blank=True, default='')
    is_playing = models.BooleanField(default=False)
    current_timestamp = models.FloatField(default=0.0)

    # Room settings
    is_locked = models.BooleanField(default=False)
    max_participants = models.IntegerField(default=20)

    # Muted / kicked users (store user IDs)
    muted_users = models.JSONField(default=list, blank=True)
    kicked_users = models.JSONField(default=list, blank=True)

    # Rejoin rejection tracking: {"<user_id>": <count>}
    rejected_users = models.JSONField(default=dict, blank=True)

    # Pending join requests: [{"user_id": <id>, "username": "..."}]
    pending_requests = models.JSONField(default=list, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rooms'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.code}) — Host: {self.host.username}'

    @property
    def participant_count(self):
        return self.participants.count()

    @property
    def is_full(self):
        return self.participant_count >= self.max_participants


class SyncLog(models.Model):
    """Log of synchronization events in a room."""

    EVENT_TYPES = [
        ('play', 'Play'),
        ('pause', 'Pause'),
        ('seek', 'Seek'),
        ('video_change', 'Video Change'),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='sync_logs')
    initiator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sync_actions'
    )
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    timestamp = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sync_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event_type} by {self.initiator.username} in {self.room.code}'
