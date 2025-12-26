"""
Custom User model for BingeBuddy.
Supports OTP verification, profile bio, avatar, and theme preference.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager for User model."""

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not username:
            raise ValueError('Username is required')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model with OTP, profile, and theme support."""

    email = models.EmailField(unique=True, max_length=255)
    username = models.CharField(max_length=50, unique=True)
    bio = models.TextField(max_length=300, blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    theme = models.CharField(
        max_length=10,
        choices=[('dark', 'Dark'), ('light', 'Light')],
        default='dark'
    )

    # OTP fields
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    otp_attempts = models.IntegerField(default=0)
    otp_locked_until = models.DateTimeField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Subscription fields
    trial_start = models.DateTimeField(auto_now_add=True)
    is_subscribed = models.BooleanField(default=False)
    subscription_expiry = models.DateTimeField(blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.username} ({self.email})'

    @property
    def is_otp_locked(self):
        """Check if account is locked due to too many OTP attempts."""
        if self.otp_locked_until and timezone.now() < self.otp_locked_until:
            return True
        return False

    @property
    def is_trial_active(self):
        """Check if user is within their 7-day free trial."""
        if not self.trial_start:
            return False
        from datetime import timedelta
        trial_end = self.trial_start + timedelta(days=7)
        return timezone.now() < trial_end

    @property
    def trial_days_remaining(self):
        """Number of days remaining in the free trial."""
        if not self.trial_start:
            return 0
        from datetime import timedelta
        trial_end = self.trial_start + timedelta(days=7)
        remaining = (trial_end - timezone.now()).days
        return max(0, remaining)

    @property
    def has_active_subscription(self):
        """Check if user has access (trial OR paid subscription OR staff/superuser)."""
        if self.is_staff or self.is_superuser:
            return True
        if self.is_trial_active:
            return True
        if self.is_subscribed and self.subscription_expiry:
            return timezone.now() < self.subscription_expiry
        return False
