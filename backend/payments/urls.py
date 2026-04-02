"""
URL routes for BingeBuddy payments app.
"""

from django.urls import path
from .views import (
    SubscriptionStatusView, InitiatePaymentView,
    VerifyPaymentView, PaymentHistoryView
)

urlpatterns = [
    path('status/', SubscriptionStatusView.as_view(), name='subscription-status'),
    path('initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
]
