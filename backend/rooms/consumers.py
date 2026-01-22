"""
WebSocket consumer for real-time video synchronization.
Handles play, pause, seek, video change, and kick events.
All participants can control playback. Only host can change video.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class SyncConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for video playback synchronization.
    Each room has its own channel group: sync_{room_code}
    """

    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.group_name = f'sync_{self.room_code}'
        self.user = self.scope.get('user')

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send current room state to newly connected user
        state = await self.get_room_state()
        if state:
            await self.send(text_data=json.dumps({
                'type': 'sync_state',
                **state,
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming sync events from clients."""
        data = json.loads(text_data)
        event_type = data.get('type', '')
        user_id = str(self.user.id) if self.user and self.user.is_authenticated else None
        username = self.user.username if self.user and self.user.is_authenticated else 'Someone'

        if event_type == 'play':
            timestamp = data.get('timestamp', 0.0)
            await self.update_room_state(is_playing=True, timestamp=timestamp)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'sync_play',
                    'timestamp': timestamp,
                    'initiated_by': user_id,
                    'username': username,
                },
            )

        elif event_type == 'pause':
            timestamp = data.get('timestamp', 0.0)
            await self.update_room_state(is_playing=False, timestamp=timestamp)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'sync_pause',
                    'timestamp': timestamp,
                    'initiated_by': user_id,
                    'username': username,
                },
            )

        elif event_type == 'seek':
            timestamp = data.get('timestamp', 0.0)
            await self.update_room_state(timestamp=timestamp)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'sync_seek',
                    'timestamp': timestamp,
                    'initiated_by': user_id,
                    'username': username,
                },
            )

        elif event_type == 'video_change':
            # Only host can change video
            is_host = await self.check_is_host()
            if not is_host:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Only the host can change the video.',
                }))
                return

            video_url = data.get('video_url', '')
            video_title = data.get('video_title', '')
            video_source = data.get('video_source', 'youtube')

            await self.update_video(video_url, video_title)

            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'sync_video_change',
                    'video_url': video_url,
                    'video_title': video_title,
                    'video_source': video_source,
                    'initiated_by': user_id,
                },
            )

        elif event_type == 'kick':
            # Host kicks a user — broadcast to all so the kicked user's frontend reacts
            is_host = await self.check_is_host()
            if not is_host:
                return
            kicked_user_id = data.get('kicked_user_id')
            kicked_username = data.get('kicked_username', '')
            if kicked_user_id:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'sync_kick',
                        'kicked_user_id': kicked_user_id,
                        'kicked_username': kicked_username,
                        'initiated_by': user_id,
                    },
                )

        elif event_type == 'sync_request':
            state = await self.get_room_state()
            if state:
                await self.send(text_data=json.dumps({
                    'type': 'sync_state',
                    **state,
                }))

        elif event_type == 'buffering':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'sync_buffering',
                    'username': username,
                    'is_buffering': data.get('is_buffering', True),
                },
            )

    # ── Group message handlers ──

    async def sync_play(self, event):
        await self.send(text_data=json.dumps({
            'type': 'play',
            'timestamp': event['timestamp'],
            'initiated_by': event['initiated_by'],
            'username': event.get('username', ''),
        }))

    async def sync_pause(self, event):
        await self.send(text_data=json.dumps({
            'type': 'pause',
            'timestamp': event['timestamp'],
            'initiated_by': event['initiated_by'],
            'username': event.get('username', ''),
        }))

    async def sync_seek(self, event):
        await self.send(text_data=json.dumps({
            'type': 'seek',
            'timestamp': event['timestamp'],
            'initiated_by': event['initiated_by'],
            'username': event.get('username', ''),
        }))

    async def sync_video_change(self, event):
        await self.send(text_data=json.dumps({
            'type': 'video_change',
            'video_url': event['video_url'],
            'video_title': event['video_title'],
            'video_source': event['video_source'],
            'initiated_by': event.get('initiated_by', ''),
        }))

    async def sync_kick(self, event):
        await self.send(text_data=json.dumps({
            'type': 'kick',
            'kicked_user_id': event['kicked_user_id'],
            'kicked_username': event['kicked_username'],
            'initiated_by': event.get('initiated_by', ''),
        }))

    async def sync_buffering(self, event):
        await self.send(text_data=json.dumps({
            'type': 'buffering',
            'username': event['username'],
            'is_buffering': event['is_buffering'],
        }))

    # ── Database helpers ──

    @database_sync_to_async
    def get_room_state(self):
        from rooms.models import Room
        try:
            room = Room.objects.get(code=self.room_code)
            video_url = room.current_video_url or ''
            return {
                'is_playing': room.is_playing,
                'timestamp': room.current_timestamp,
                'video_url': video_url,
                'video_title': room.current_video_title,
                'video_source': 'youtube' if ('youtube.com' in video_url or 'youtu.be' in video_url) else 'local',
            }
        except Room.DoesNotExist:
            return None

    @database_sync_to_async
    def update_room_state(self, is_playing=None, timestamp=None):
        from rooms.models import Room
        try:
            room = Room.objects.get(code=self.room_code)
            if is_playing is not None:
                room.is_playing = is_playing
            if timestamp is not None:
                room.current_timestamp = timestamp
            room.save(update_fields=['is_playing', 'current_timestamp'])
        except Room.DoesNotExist:
            pass

    @database_sync_to_async
    def update_video(self, video_url, video_title):
        from rooms.models import Room
        try:
            room = Room.objects.get(code=self.room_code)
            room.current_video_url = video_url
            room.current_video_title = video_title
            room.current_timestamp = 0.0
            room.is_playing = False
            room.save()
        except Room.DoesNotExist:
            pass

    @database_sync_to_async
    def check_is_host(self):
        from rooms.models import Room
        if not self.user or not self.user.is_authenticated:
            return False
        try:
            room = Room.objects.get(code=self.room_code)
            return room.host_id == self.user.id
        except Room.DoesNotExist:
            return False
