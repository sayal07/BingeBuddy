from django.contrib import admin
from .models import ChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['room', 'sender', 'message_type', 'content', 'created_at']
    list_filter = ['message_type', 'created_at']
    search_fields = ['content', 'sender__username']
