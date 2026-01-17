"""
Serializers for BingeBuddy rooms app.
"""

from rest_framework import serializers
from .models import Room, SyncLog
from accounts.serializers import UserProfileSerializer


class RoomSerializer(serializers.ModelSerializer):
    """Full room serializer with host details."""
    host = UserProfileSerializer(read_only=True)
    participants = UserProfileSerializer(many=True, read_only=True)
    participant_count = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()

    class Meta:
        model = Room
        fields = [
            'id', 'code', 'name', 'host', 'participants', 'participant_count',
            'is_full', 'current_video_url', 'current_video_title',
            'is_playing', 'current_timestamp', 'is_locked',
            'max_participants', 'muted_users', 'kicked_users',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'code', 'host', 'created_at', 'updated_at']


class CreateRoomSerializer(serializers.ModelSerializer):
    """Serializer for room creation. Optionally pre-loads a video."""
    video_url = serializers.CharField(max_length=500, required=False, default='', allow_blank=True)
    video_title = serializers.CharField(max_length=300, required=False, default='', allow_blank=True)

    class Meta:
        model = Room
        fields = ['name', 'max_participants', 'video_url', 'video_title']

    def create(self, validated_data):
        video_url = validated_data.pop('video_url', '')
        video_title = validated_data.pop('video_title', '')
        user = self.context['request'].user
        room = Room.objects.create(host=user, **validated_data)
        room.participants.add(user)
        if video_url:
            room.current_video_url = video_url
            room.current_video_title = video_title
            room.save()
        return room


class JoinRoomSerializer(serializers.Serializer):
    """Serializer for joining a room."""
    code = serializers.CharField(max_length=8, min_length=8)


class UpdateVideoSerializer(serializers.Serializer):
    """Serializer for updating the video in a room."""
    video_url = serializers.CharField(max_length=500)
    video_title = serializers.CharField(max_length=300, required=False, default='', allow_blank=True)


class SyncLogSerializer(serializers.ModelSerializer):
    """Serializer for sync event logs."""
    initiator = UserProfileSerializer(read_only=True)

    class Meta:
        model = SyncLog
        fields = ['id', 'room', 'initiator', 'event_type', 'timestamp', 'created_at']
