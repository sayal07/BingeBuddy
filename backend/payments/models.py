"""
Payment model and eSewa integration for BingeBuddy subscriptions.
"""

from django.db import models
from django.conf import settings
import uuid


class Payment(models.Model):
    """Records each eSewa payment transaction."""

    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    PLAN_CHOICES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    transaction_uuid = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default='monthly')
    amount = models.FloatField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    esewa_ref_id = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.plan} - {self.status} - Rs.{self.amount}'
