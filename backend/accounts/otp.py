import random
import string
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta


def generate_otp(length=6):
    """Generate a random numeric OTP."""
    return "".join(random.choices(string.digits, k=length))


def send_otp_email(user):
    """Generate OTP, save to user, and send via Gmail SMTP."""
    otp = generate_otp()
    user.otp_code = otp
    user.otp_created_at = timezone.now()
    user.otp_attempts = 0
    user.save(update_fields=["otp_code", "otp_created_at", "otp_attempts"])

    subject = "BingeBuddy — Your Verification Code"
    message = (
        f"Hi {user.username},\n\n"
        f"Your OTP verification code is: {otp}\n\n"
        f"This code expires in {settings.OTP_EXPIRY_MINUTES} minutes.\n"
        f"Do not share this code with anyone.\n\n"
        f"— BingeBuddy Team"
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    return otp


def verify_otp(user, otp_input):
    """
    Verify OTP against stored value.
    Returns (success: bool, message: str)
    """
    # Check lockout
    if user.is_otp_locked:
        remaining = (user.otp_locked_until - timezone.now()).seconds // 60
        return False, f"Account locked. Try again in {remaining} minutes."

    # Check if OTP exists
    if not user.otp_code:
        return False, "No OTP found. Please request a new one."

    # Check expiry
    expiry_time = user.otp_created_at + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    if timezone.now() > expiry_time:
        user.clear_otp()
        return False, "OTP has expired. Please request a new one."

    # Check attempts
    user.otp_attempts += 1
    if user.otp_attempts >= settings.OTP_MAX_ATTEMPTS:
        user.otp_locked_until = timezone.now() + timedelta(minutes=settings.OTP_LOCKOUT_MINUTES)
        user.save(update_fields=["otp_attempts", "otp_locked_until"])
        return False, f"Too many attempts. Account locked for {settings.OTP_LOCKOUT_MINUTES} minutes."

    user.save(update_fields=["otp_attempts"])

    # Verify
    if user.otp_code != otp_input:
        remaining = settings.OTP_MAX_ATTEMPTS - user.otp_attempts
        return False, f"Invalid OTP. {remaining} attempts remaining."

    # Success
    user.is_verified = True
    user.clear_otp()
    return True, "Email verified successfully."


def can_resend_otp(user):
    """Check if cooldown period has passed."""
    if user.otp_created_at:
        cooldown = user.otp_created_at + timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS)
        if timezone.now() < cooldown:
            remaining = (cooldown - timezone.now()).seconds
            return False, f"Please wait {remaining} seconds before requesting a new OTP."
    return True, "OK"
