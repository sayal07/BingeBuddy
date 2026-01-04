"""
JWT authentication middleware for Django Channels WebSockets.
Extracts JWT token from query string and authenticates the user.
"""

from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


@database_sync_to_async
def get_user_from_token(token_string):
    """Decode JWT token and return the user."""
    from accounts.models import User
    
    try:
        access_token = AccessToken(token_string)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that extracts JWT token from WebSocket query string
    and adds the authenticated user to the scope.
    
    Usage in frontend: ws://localhost:8000/ws/room/CODE/sync/?token=JWT_ACCESS_TOKEN
    """

    async def __call__(self, scope, receive, send):
        # Parse query string
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        
        # Extract token from query params
        token_list = query_params.get('token', [])
        token = token_list[0] if token_list else None
        
        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
