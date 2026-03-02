"""
Chat message model for BingeBuddy watch party rooms.
"""

from django.db import models
from django.conf import settings


class ChatMessage(models.Model):
    """Stores chat messages within a watch party room."""

    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('emoji', 'Emoji Reaction'),
        ('system', 'System Notification'),
    ]

    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages',
        null=True, blank=True  # null for system messages
    )
    content = models.TextField(max_length=1000)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']

    def __str__(self):
        sender_name = self.sender.username if self.sender else 'System'
        return f'[{self.room.code}] {sender_name}: {self.content[:50]}'
