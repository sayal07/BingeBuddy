from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'amount', 'status', 'created_at', 'verified_at']
    list_filter = ['status', 'plan', 'created_at']
    search_fields = ['user__username', 'user__email', 'transaction_uuid']
    readonly_fields = ['transaction_uuid', 'esewa_ref_id', 'verified_at']
