"""
Views for BingeBuddy rooms app.
Handles room CRUD, joining, host controls (kick, mute, lock).
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
import os
import uuid

from .models import Room
from .serializers import (
    RoomSerializer, CreateRoomSerializer,
    JoinRoomSerializer, UpdateVideoSerializer
)


class CreateRoomView(APIView):
    """Create a new watch party room."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateRoomSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        return Response(
            {
                'message': 'Room created successfully.',
                'room': RoomSerializer(room).data
            },
            status=status.HTTP_201_CREATED
        )


class JoinRoomView(APIView):
    """Join an existing room by its 8-digit code."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code'].upper()

        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # If user is already a participant, just let them in
        if room.participants.filter(id=request.user.id).exists():
            return Response(
                {
                    'message': 'Joined room successfully.',
                    'room': RoomSerializer(room).data
                },
                status=status.HTTP_200_OK
            )

        if room.is_locked:
            return Response(
                {'error': 'This room is locked by the host.'},
                status=status.HTTP_403_FORBIDDEN
            )

        uid = request.user.id
        uid_str = str(uid)

        # Check if permanently blocked (3+ rejections)
        rejections = room.rejected_users.get(uid_str, 0)
        if rejections >= 3:
            return Response(
                {'error': 'You have been permanently blocked from this room.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Kicked user → needs approval
        # Use str comparison to avoid int/str type mismatch from JSON
        kicked_ids = [str(k) for k in room.kicked_users]
        if uid_str in kicked_ids:
            # Check if already pending
            already_pending = any(str(r.get('user_id')) == uid_str for r in room.pending_requests)
            if already_pending:
                return Response(
                    {'status': 'pending', 'message': 'Your request is pending approval from the host.'},
                    status=status.HTTP_202_ACCEPTED
                )
            # Add to pending
            room.pending_requests.append({
                'user_id': uid,
                'username': request.user.username,
            })
            room.save()
            return Response(
                {'status': 'pending', 'message': 'Join request sent to the host.'},
                status=status.HTTP_202_ACCEPTED
            )

        if room.is_full:
            return Response(
                {'error': 'Room is full.'},
                status=status.HTTP_403_FORBIDDEN
            )

        room.participants.add(request.user)
        return Response(
            {
                'message': 'Joined room successfully.',
                'room': RoomSerializer(room).data
            },
            status=status.HTTP_200_OK
        )


class RoomDetailView(APIView):
    """Get details of a specific room."""
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not room.participants.filter(id=request.user.id).exists():
            return Response(
                {'error': 'You are not a participant of this room.'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = RoomSerializer(room).data
        # Include pending requests for the host
        if room.host == request.user:
            data['pending_requests'] = room.pending_requests
        return Response(data, status=status.HTTP_200_OK)


class LeaveRoomView(APIView):
    """Leave a room. If host leaves, the room is deleted."""
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if room.host == request.user:
            room.delete()
            return Response(
                {'message': 'Room closed (host left).'},
                status=status.HTTP_200_OK
            )

        room.participants.remove(request.user)
        return Response(
            {'message': 'Left the room.'},
            status=status.HTTP_200_OK
        )


class KickUserView(APIView):
    """Host kicks a participant from the room."""
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if room.host != request.user:
            return Response(
                {'error': 'Only the host can kick users.'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_id == request.user.id:
            return Response(
                {'error': 'You cannot kick yourself.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        room.participants.remove(user_id)
        kicked_ids_str = [str(k) for k in room.kicked_users]
        if str(user_id) not in kicked_ids_str:
            room.kicked_users.append(user_id)
            room.save()

        return Response(
            {'message': 'User kicked from the room.'},
            status=status.HTTP_200_OK
        )

class CheckRequestStatusView(APIView):
    """Kicked user polls this to check if host accepted/rejected their request."""
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        uid = request.user.id
        uid_str = str(uid)

        # Already a participant → accepted
        if room.participants.filter(id=uid).exists():
            return Response({'status': 'accepted'}, status=status.HTTP_200_OK)

        # Still in pending_requests → waiting
        is_pending = any(str(r.get('user_id')) == uid_str for r in room.pending_requests)
        if is_pending:
            return Response({'status': 'pending'}, status=status.HTTP_200_OK)

        # Not pending and not participant → host rejected (or never requested)
        rejections = room.rejected_users.get(uid_str, 0)
        if rejections >= 3:
            return Response({
                'status': 'blocked',
                'message': 'You have been permanently blocked from this room.',
            }, status=status.HTTP_200_OK)

        # Was kicked, request was removed but not accepted → rejected
        kicked_ids = [str(k) for k in room.kicked_users]
        if uid_str in kicked_ids:
            return Response({
                'status': 'rejected',
                'message': 'The host did not let you in.',
                'rejections': rejections,
                'remaining': 3 - rejections,
            }, status=status.HTTP_200_OK)

        return Response({'status': 'none'}, status=status.HTTP_200_OK)


class HandleJoinRequestView(APIView):
    """Host accepts or rejects a pending join request."""
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        if room.host != request.user:
            return Response({'error': 'Only the host can manage requests.'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        action = request.data.get('action')  # 'accept' or 'reject'

        if not user_id or action not in ('accept', 'reject'):
            return Response({'error': 'user_id and action (accept/reject) required.'}, status=status.HTTP_400_BAD_REQUEST)

        uid_str = str(user_id)

        # Remove from pending (type-safe comparison)
        room.pending_requests = [r for r in room.pending_requests if str(r.get('user_id')) != uid_str]

        if action == 'accept':
            # Remove from kicked list using type-safe comparison
            room.kicked_users = [k for k in room.kicked_users if str(k) != uid_str]

            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                target_user = User.objects.get(id=user_id)
                room.participants.add(target_user)
            except User.DoesNotExist:
                pass
            room.save()
            return Response({'message': 'User accepted and added to room.'}, status=status.HTTP_200_OK)
        else:
            # Increment rejection count
            count = room.rejected_users.get(uid_str, 0) + 1
            room.rejected_users[uid_str] = count
            room.save()
            remaining = 3 - count
            msg = f'Request rejected. User has {remaining} attempt(s) remaining.' if remaining > 0 else 'User permanently blocked.'
            return Response({'message': msg, 'rejections': count}, status=status.HTTP_200_OK)


class MuteUserView(APIView):
    """Host mutes/unmutes a participant."""
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if room.host != request.user:
            return Response(
                {'error': 'Only the host can mute users.'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_id in room.muted_users:
            room.muted_users.remove(user_id)
            msg = 'User unmuted.'
        else:
            room.muted_users.append(user_id)
            msg = 'User muted.'
        room.save()

        return Response({'message': msg}, status=status.HTTP_200_OK)


class LockRoomView(APIView):
    """Host locks/unlocks the room."""
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if room.host != request.user:
            return Response(
                {'error': 'Only the host can lock/unlock the room.'},
                status=status.HTTP_403_FORBIDDEN
            )

        room.is_locked = not room.is_locked
        room.save()

        state = 'locked' if room.is_locked else 'unlocked'
        return Response(
            {'message': f'Room {state}.', 'is_locked': room.is_locked},
            status=status.HTTP_200_OK
        )


class UpdateVideoView(APIView):
    """Host updates the video being watched."""
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if room.host != request.user:
            return Response(
                {'error': 'Only the host can change the video.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = UpdateVideoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        room.current_video_url = serializer.validated_data['video_url']
        room.current_video_title = serializer.validated_data.get('video_title', '')
        room.current_timestamp = 0.0
        room.is_playing = False
        room.save()

        return Response(
            {
                'message': 'Video updated.',
                'room': RoomSerializer(room).data
            },
            status=status.HTTP_200_OK
        )

    def put(self, request, code):
        return self.post(request, code)


class MyRoomsView(APIView):
    """Get all rooms the user is part of."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hosted = Room.objects.filter(host=request.user)
        joined = request.user.joined_rooms.exclude(host=request.user)
        return Response({
            'hosted': RoomSerializer(hosted, many=True).data,
            'joined': RoomSerializer(joined, many=True).data,
        }, status=status.HTTP_200_OK)


class UploadVideoView(APIView):
    """Host uploads a local video file. Returns a streamable URL."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code.upper())
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        if room.host != request.user:
            return Response({'error': 'Only the host can upload videos.'}, status=status.HTTP_403_FORBIDDEN)

        video_file = request.FILES.get('video')
        if not video_file:
            return Response({'error': 'No video file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        allowed_types = ['video/mp4', 'video/webm', 'video/ogg', 'video/mkv', 'video/x-matroska']
        if video_file.content_type not in allowed_types:
            ext = os.path.splitext(video_file.name)[1].lower()
            if ext not in ['.mp4', '.webm', '.ogg', '.mkv', '.mov', '.avi']:
                return Response({'error': 'Unsupported video format.'}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(video_file.name)[1].lower()
        filename = f"{uuid.uuid4().hex}{ext}"
        rel_path = os.path.join('videos', code.upper(), filename)
        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)

        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'wb') as f:
            for chunk in video_file.chunks():
                f.write(chunk)

        video_url = request.build_absolute_uri(settings.MEDIA_URL + rel_path.replace(os.sep, '/'))

        room.current_video_url = video_url
        room.current_video_title = video_file.name
        room.current_timestamp = 0.0
        room.is_playing = False
        room.save()

        return Response({
            'video_url': video_url,
            'video_title': video_file.name,
            'video_source': 'local',
        }, status=status.HTTP_200_OK)
