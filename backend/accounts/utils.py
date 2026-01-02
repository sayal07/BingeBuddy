"""
OTP utility functions for BingeBuddy authentication.
Handles OTP generation, Gmail sending, and verification.
"""

import random
import string
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta


def generate_otp():
    """Generate a 6-digit numeric OTP."""
    return ''.join(random.choices(string.digits, k=6))


def send_otp_email(email, otp_code):
    """Send OTP verification email via Gmail SMTP."""
    subject = 'BingeBuddy — Your Verification Code'
    message = (
        f'Hello!\n\n'
        f'Your BingeBuddy verification code is: {otp_code}\n\n'
        f'This code expires in {settings.OTP_EXPIRY_MINUTES} minutes.\n'
        f'If you did not request this code, please ignore this email.\n\n'
        f'— Team BingeBuddy'
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )


def is_otp_valid(user, submitted_otp):
    """
    Validate OTP against the stored code and expiry time.
    Returns (success: bool, error_message: str or None)
    """
    if user.is_otp_locked:
        remaining = (user.otp_locked_until - timezone.now()).seconds // 60
        return False, f'Account locked. Try again in {remaining} minutes.'

    if not user.otp_code or not user.otp_created_at:
        return False, 'No OTP found. Please request a new one.'

    expiry_time = user.otp_created_at + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    if timezone.now() > expiry_time:
        return False, 'OTP has expired. Please request a new one.'

    if user.otp_code != submitted_otp:
        user.otp_attempts += 1
        if user.otp_attempts >= settings.OTP_MAX_ATTEMPTS:
            user.otp_locked_until = timezone.now() + timedelta(
                minutes=settings.OTP_LOCKOUT_MINUTES
            )
            user.otp_attempts = 0
        user.save()
        return False, 'Invalid OTP code.'

    # OTP is valid — clear it
    user.otp_code = None
    user.otp_created_at = None
    user.otp_attempts = 0
    user.otp_locked_until = None
    user.is_verified = True
    user.save()
    return True, None


def can_resend_otp(user):
    """Check if enough time has passed to resend OTP (cooldown)."""
    if not user.otp_created_at:
        return True
    cooldown = user.otp_created_at + timedelta(
        seconds=settings.OTP_RESEND_COOLDOWN_SECONDS
    )
    return timezone.now() >= cooldown
