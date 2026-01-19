"""
URL routes for BingeBuddy rooms app.
"""

from django.urls import path
from .views import (
    CreateRoomView, JoinRoomView, RoomDetailView, LeaveRoomView,
    KickUserView, MuteUserView, LockRoomView, UpdateVideoView,
    MyRoomsView, UploadVideoView, HandleJoinRequestView, CheckRequestStatusView
)

urlpatterns = [
    path('create/', CreateRoomView.as_view(), name='create-room'),
    path('join/', JoinRoomView.as_view(), name='join-room'),
    path('my-rooms/', MyRoomsView.as_view(), name='my-rooms'),
    path('<str:code>/', RoomDetailView.as_view(), name='room-detail'),
    path('<str:code>/leave/', LeaveRoomView.as_view(), name='leave-room'),
    path('<str:code>/kick/', KickUserView.as_view(), name='kick-user'),
    path('<str:code>/mute/', MuteUserView.as_view(), name='mute-user'),
    path('<str:code>/lock/', LockRoomView.as_view(), name='lock-room'),
    path('<str:code>/video/', UpdateVideoView.as_view(), name='update-video'),
    path('<str:code>/upload-video/', UploadVideoView.as_view(), name='upload-video'),
    path('<str:code>/handle-request/', HandleJoinRequestView.as_view(), name='handle-join-request'),
    path('<str:code>/request-status/', CheckRequestStatusView.as_view(), name='check-request-status'),
]
