"""
Serializers for BingeBuddy chat app.
"""

from rest_framework import serializers
from .models import ChatMessage
from accounts.serializers import UserProfileSerializer


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserProfileSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'sender', 'content', 'message_type', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']
