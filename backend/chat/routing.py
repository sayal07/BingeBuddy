"""
WebSocket URL routing for chat app.
"""

from django.urls import re_path
from .consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/?ws/room/(?P<room_code>\w+)/chat/$', ChatConsumer.as_asgi()),
    re_path(r'ws/room/(?P<room_code>\w+)/chat/$', ChatConsumer.as_asgi()),
]
