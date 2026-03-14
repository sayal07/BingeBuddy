"""
WebSocket consumer for WebRTC voice chat signaling.
Handles offer/answer/ICE candidate exchange and host mute controls.
Tracks host-muted users per room so mute persists across voice reconnects.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class VoiceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for voice chat signaling.
    Each room has its own channel group: voice_{room_code}
    """

    # Class-level dict: { room_code: set(user_id_strings) }
    # Tracks which users the host has muted — persists across reconnects
    _host_muted_users = {}

    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.group_name = f'voice_{self.room_code}'
        self.user = self.scope.get('user')

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        user_id = str(self.user.id)

        # Check if this user was previously host-muted — re-apply immediately
        muted_set = VoiceConsumer._host_muted_users.get(self.room_code, set())
        if user_id in muted_set:
            await self.send(text_data=json.dumps({
                'type': 'force_mute',
                'muted': True,
                'by_host': True,
            }))

        # Notify others that a new peer joined voice
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'voice_peer_joined',
                'user_id': user_id,
                'username': self.user.username,
                'channel': self.channel_name,
                'is_host_muted': user_id in muted_set,
            }
        )

    async def disconnect(self, close_code):
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'voice_peer_left',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                }
            )
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type', '')
        user_id = str(self.user.id) if self.user and self.user.is_authenticated else None

        if event_type == 'offer':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'voice_offer',
                    'offer': data.get('offer'),
                    'from_user_id': user_id,
                    'to_user_id': data.get('to_user_id'),
                    'username': self.user.username,
                }
            )

        elif event_type == 'answer':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'voice_answer',
                    'answer': data.get('answer'),
                    'from_user_id': user_id,
                    'to_user_id': data.get('to_user_id'),
                }
            )

        elif event_type == 'ice_candidate':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'voice_ice_candidate',
                    'candidate': data.get('candidate'),
                    'from_user_id': user_id,
                    'to_user_id': data.get('to_user_id'),
                }
            )

        elif event_type == 'mute_user':
            # Host mutes/unmutes another user's mic
            is_host = await self.check_is_host()
            if not is_host:
                return
            target_user_id = data.get('target_user_id')
            muted = data.get('muted', True)
            if target_user_id:
                # Persist the mute state in class-level dict
                if self.room_code not in VoiceConsumer._host_muted_users:
                    VoiceConsumer._host_muted_users[self.room_code] = set()

                if muted:
                    VoiceConsumer._host_muted_users[self.room_code].add(target_user_id)
                else:
                    VoiceConsumer._host_muted_users[self.room_code].discard(target_user_id)

                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'voice_mute_user',
                        'target_user_id': target_user_id,
                        'muted': muted,
                        'by_host': True,
                    }
                )

        elif event_type == 'mic_status':
            # User broadcasts their own mic status (self-mute/unmute)
            is_self_muted = data.get('is_muted', False)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'voice_mic_status',
                    'user_id': user_id,
                    'username': self.user.username,
                    'is_muted': is_self_muted,
                    'is_self_muted': True,
                }
            )

    # ── Group message handlers ──

    async def voice_peer_joined(self, event):
        if self.user and str(self.user.id) == event['user_id']:
            return
        await self.send(text_data=json.dumps({
            'type': 'peer_joined',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_host_muted': event.get('is_host_muted', False),
        }))

    async def voice_peer_left(self, event):
        if self.user and str(self.user.id) == event['user_id']:
            return
        await self.send(text_data=json.dumps({
            'type': 'peer_left',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    async def voice_offer(self, event):
        if self.user and str(self.user.id) == event['to_user_id']:
            await self.send(text_data=json.dumps({
                'type': 'offer',
                'offer': event['offer'],
                'from_user_id': event['from_user_id'],
                'username': event['username'],
            }))

    async def voice_answer(self, event):
        if self.user and str(self.user.id) == event['to_user_id']:
            await self.send(text_data=json.dumps({
                'type': 'answer',
                'answer': event['answer'],
                'from_user_id': event['from_user_id'],
            }))

    async def voice_ice_candidate(self, event):
        if self.user and str(self.user.id) == event['to_user_id']:
            await self.send(text_data=json.dumps({
                'type': 'ice_candidate',
                'candidate': event['candidate'],
                'from_user_id': event['from_user_id'],
            }))

    async def voice_mute_user(self, event):
        # Send to the target user AND broadcast status to all
        if self.user and str(self.user.id) == event['target_user_id']:
            await self.send(text_data=json.dumps({
                'type': 'force_mute',
                'muted': event['muted'],
                'by_host': event['by_host'],
            }))
        else:
            # Inform other peers about host-mute status change
            await self.send(text_data=json.dumps({
                'type': 'host_mute_status',
                'user_id': event['target_user_id'],
                'is_host_muted': event['muted'],
            }))

    async def voice_mic_status(self, event):
        if self.user and str(self.user.id) == event['user_id']:
            return
        await self.send(text_data=json.dumps({
            'type': 'mic_status',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_muted': event['is_muted'],
            'is_self_muted': event.get('is_self_muted', False),
        }))

    # ── Database helpers ──

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
