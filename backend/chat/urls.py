"""
URL routes for BingeBuddy chat app.
"""

from django.urls import path
from .views import ChatHistoryView

urlpatterns = [
    path('<str:room_code>/history/', ChatHistoryView.as_view(), name='chat-history'),
]
