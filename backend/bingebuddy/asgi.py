"""
ASGI config for BingeBuddy project.
Configures HTTP + WebSocket routing via Django Channels.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bingebuddy.settings')

django_asgi_app = get_asgi_application()

# Import after Django setup
from bingebuddy.middleware import JWTAuthMiddleware
from rooms.routing import websocket_urlpatterns as room_ws
from chat.routing import websocket_urlpatterns as chat_ws
from voice.routing import websocket_urlpatterns as voice_ws

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(
                room_ws + chat_ws + voice_ws
            )
        )
    ),
})


