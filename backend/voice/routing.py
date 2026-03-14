"""
WebSocket URL routing for voice chat signaling.
"""

from django.urls import re_path
from .consumers import VoiceConsumer

websocket_urlpatterns = [
    re_path(r'ws/?ws/room/(?P<room_code>\w+)/voice/$', VoiceConsumer.as_asgi()),
    re_path(r'ws/room/(?P<room_code>\w+)/voice/$', VoiceConsumer.as_asgi()),
]
