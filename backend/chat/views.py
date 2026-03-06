"""
Views for BingeBuddy chat app.
REST endpoint for chat history retrieval.
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from rooms.models import Room
from .models import ChatMessage
from .serializers import ChatMessageSerializer


class ChatHistoryView(APIView):
    """Get recent chat messages for a room (last 100)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, room_code):
        try:
            room = Room.objects.get(code=room_code.upper())
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not room.participants.filter(id=request.user.id).exists():
            return Response(
                {'error': 'You are not in this room.'},
                status=status.HTTP_403_FORBIDDEN
            )

        messages = ChatMessage.objects.filter(room=room).order_by('-created_at')[:100]
        messages = reversed(list(messages))  # oldest first
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
