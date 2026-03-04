"""
WebSocket consumer for real-time chat in watch party rooms.
Handles messages, emoji reactions, typing indicators, join/leave notifications.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rooms.models import Room
from chat.models import ChatMessage


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Real-time chat consumer.
    Each room has its own channel group: chat_{room_code}
    """

    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.group_name = f'chat_{self.room_code}'
        self.user = self.scope.get('user')

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Notify room that user joined
        if self.user and self.user.is_authenticated:
            await self.save_system_message(f'{self.user.username} joined the room.')
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'chat_system',
                    'content': f'{self.user.username} joined the room.',
                    'username': self.user.username,
                    'user_id': self.user.id,
                    'event': 'join',
                }
            )

    async def disconnect(self, close_code):
        if self.user and self.user.is_authenticated:
            await self.save_system_message(f'{self.user.username} left the room.')
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'chat_system',
                    'content': f'{self.user.username} left the room.',
                    'username': self.user.username,
                    'user_id': self.user.id,
                    'event': 'leave',
                }
            )
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming chat events."""
        data = json.loads(text_data)
        msg_type = data.get('type', 'text')

        if msg_type == 'text':
            content = data.get('content', '').strip()
            if not content:
                return

            # Check if user is muted
            is_muted = await self.check_muted()
            if is_muted:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'content': 'You are muted by the host.',
                }))
                return

            await self.save_message(content, 'text')
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'chat_message',
                    'content': content,
                    'username': self.user.username if self.user else 'Anonymous',
                    'user_id': self.user.id if self.user else None,
                    'message_type': 'text',
                }
            )

        elif msg_type == 'emoji':
            emoji = data.get('emoji', '')
            if emoji:
                await self.save_message(emoji, 'emoji')
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'chat_message',
                        'content': emoji,
                        'username': self.user.username if self.user else 'Anonymous',
                        'user_id': self.user.id if self.user else None,
                        'message_type': 'emoji',
                    }
                )

        elif msg_type == 'action':
            content = data.get('content', '').strip()
            if content:
                await self.save_system_message(content)
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'chat_system',
                        'content': content,
                        'username': self.user.username if self.user else 'System',
                        'user_id': self.user.id if self.user else None,
                        'event': 'action',
                    }
                )

        elif msg_type == 'typing':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'chat_typing',
                    'username': self.user.username if self.user else 'Anonymous',
                    'is_typing': data.get('is_typing', False),
                }
            )

    # ── Group message handlers ──

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': event['message_type'],
            'content': event['content'],
            'username': event['username'],
            'user_id': event['user_id'],
        }))

    async def chat_system(self, event):
        await self.send(text_data=json.dumps({
            'type': 'system',
            'content': event['content'],
            'username': event['username'],
            'user_id': event['user_id'],
            'event': event['event'],
        }))

    async def chat_typing(self, event):
        # Don't send typing indicator back to the sender
        if self.user and event['username'] != self.user.username:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    # ── Database helpers ──

    @database_sync_to_async
    def save_message(self, content, message_type):
        try:
            room = Room.objects.get(code=self.room_code)
            ChatMessage.objects.create(
                room=room,
                sender=self.user if self.user and self.user.is_authenticated else None,
                content=content,
                message_type=message_type,
            )
        except Room.DoesNotExist:
            pass

    @database_sync_to_async
    def save_system_message(self, content):
        try:
            room = Room.objects.get(code=self.room_code)
            ChatMessage.objects.create(
                room=room,
                sender=None,
                content=content,
                message_type='system',
            )
        except Room.DoesNotExist:
            pass

    @database_sync_to_async
    def check_muted(self):
        try:
            room = Room.objects.get(code=self.room_code)
            return self.user and self.user.id in room.muted_users
        except Room.DoesNotExist:
            return False
