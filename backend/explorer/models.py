"""
Models for BingeBuddy explorer (AI recommendations) app.
Includes WatchHistory for personalizing the video feed.
"""

from django.db import models
from django.conf import settings


class WatchHistory(models.Model):
    """Tracks videos a user has watched for personalized recommendations."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='watch_history'
    )
    video_url = models.CharField(max_length=500)
    video_id = models.CharField(max_length=20, blank=True, default='')
    video_title = models.CharField(max_length=300, blank=True, default='')
    category = models.CharField(max_length=100, blank=True, default='')
    watched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'watch_history'
        ordering = ['-watched_at']

    def __str__(self):
        return f'{self.user.username} watched {self.video_title}'
