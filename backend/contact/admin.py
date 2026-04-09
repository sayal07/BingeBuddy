from django.contrib import admin
from django.utils.html import format_html
from .models import ContactMessage

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'created_at', 'reply_link')
    list_filter = ('created_at',)
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('name', 'email', 'subject', 'message', 'created_at', 'reply_link')

    def reply_link(self, obj):
        return format_html(
            '<button onclick="navigator.clipboard.writeText(\'{}\'); '
            'const btn=this; const oldText=btn.innerText; btn.innerText=\'Copied! ✅\'; btn.style.background=\'#059669\'; '
            'setTimeout(()=>{{ btn.innerText=oldText; btn.style.background=\'#7c3aed\'; }}, 2000); '
            'window.location.href=\'mailto:{}?subject=Re: {}\';" '
            'style="background: #7c3aed; color: white; padding: 5px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: sans-serif; transition: all 0.2s;">'
            'Copy Email'
            '</button>',
            obj.email,
            obj.email,
            obj.subject
        )
    reply_link.short_description = 'Action'

    def has_add_permission(self, request):
        return False
