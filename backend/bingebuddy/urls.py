"""
BingeBuddy URL Configuration
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from rooms.streaming import stream_video

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/rooms/', include('rooms.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/explorer/', include('explorer.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/contact/', include('contact.urls')),
]

# Serve media files with Range request support (for video seeking)
if settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', stream_video, name='stream-video'),
    ]

