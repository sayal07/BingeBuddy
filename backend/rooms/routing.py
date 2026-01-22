"""
WebSocket URL routing for rooms app (video sync).
"""

from django.urls import re_path
from .consumers import SyncConsumer

websocket_urlpatterns = [
    re_path(r'ws/?ws/room/(?P<room_code>\w+)/sync/$', SyncConsumer.as_asgi()),
    re_path(r'ws/room/(?P<room_code>\w+)/sync/$', SyncConsumer.as_asgi()),
]
