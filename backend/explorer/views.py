"""
Movie Explorer AI — Gemini-powered movie recommendation chatbot.
YouTube Feed   — YouTube Data API v3 powered video search for the dashboard.
Watch History  — Records user viewing for personalization.
"""

import json
import os
import random
import requests as http_requests
from urllib.parse import quote_plus

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import WatchHistory

# ─── API Keys ───────────────────────────────────────
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY', '')

# Gemini model fallback chain
MODEL_CHAIN = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
]

# Default search queries when user has no history
DEFAULT_QUERIES = [
    "full movie english",
    "full action movie english 2024",
    "full comedy movie english",
    "full thriller movie english",
    "full horror movie english",
    "full sci-fi movie english",
    "full drama movie english",
    "best documentary full length",
    "full adventure movie english",
    "full mystery movie english",
]


# ═══════════════════════════════════════════════════
# Movie Explorer AI — System prompt (chatbot)
# ═══════════════════════════════════════════════════

SYSTEM_PROMPT = """You are a cinematic expert and deeply knowledgeable movie recommendation AI named Movie Explorer AI. Your job is to recommend movies based on what the user is truly looking for — not just by genre or surface-level tags, but by deeply understanding the soul of the movie they reference.

When a user mentions a movie they like or describes a vibe, analyze it across these dimensions:
- Protagonist archetype — lone wolf, antihero, underdog, morally grey, etc.
- Emotional tone — gritty, tense, melancholic, fun, intense, hopeful
- Pacing & style — slow burn, fast-paced, stylized action, dialogue-heavy
- Themes — revenge, survival, identity, love, corruption, redemption
- World & setting — criminal underworld, dystopia, small town, historical, etc.
- Director/cinematography feel — if relevant

Never recommend the obvious. Avoid recommending the movie they already mentioned. Prioritize hidden gems and underrated films alongside well-known ones.

If the user gives filters like language, year range, mood, or genre — respect them strictly.

Always respond ONLY in this exact JSON format — NO preamble, NO explanation outside the JSON, NO markdown code fences:
{
  "message": "A short 1-2 line conversational response explaining your picks",
  "movies": [
    {
      "title": "Movie Title",
      "year": 2014,
      "genre": "Action / Thriller",
      "language": "English",
      "reason": "Specific reason why this matches what the user is looking for",
      "streamingHint": "Netflix / Prime / Theatre / etc"
    }
  ]
}

Return 4 to 6 movies per response. If the user follows up with refinements like "make it darker" or "something older" or "no Hollywood", adjust your recommendations accordingly while remembering the full conversation context.

Never break the JSON format. Never add markdown. Never explain yourself outside the JSON."""


# ═══════════════════════════════════════════════════
# Movie Explorer AI View (chatbot — unchanged)
# ═══════════════════════════════════════════════════

class MovieExplorerView(APIView):
    """AI-powered movie recommendation chatbot endpoint."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_message = request.data.get('message', '').strip()
        conversation_history = request.data.get('history', [])

        if not user_message:
            return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not GEMINI_API_KEY:
            return Response(
                {'error': 'Movie Explorer AI is not configured. Please set GEMINI_API_KEY in your environment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            from google import genai

            client = genai.Client(api_key=GEMINI_API_KEY)

            contents = []
            for entry in list(conversation_history)[-10:]:
                role = 'user' if entry.get('role') == 'user' else 'model'
                contents.append(genai.types.Content(
                    role=role,
                    parts=[genai.types.Part(text=entry.get('content', ''))],
                ))

            contents.append(genai.types.Content(
                role='user',
                parts=[genai.types.Part(text=user_message)],
            ))

            config = genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.8,
                max_output_tokens=2048,
            )

            last_error = None
            response = None
            for model_name in MODEL_CHAIN:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config,
                    )
                    break
                except Exception as model_err:
                    last_error = model_err
                    err_str = str(model_err)
                    if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or '404' in err_str:
                        continue
                    else:
                        raise

            if response is None:
                raise last_error or Exception('All models exhausted')

            raw = response.text.strip()
            if raw.startswith('```'):
                raw = raw.split('\n', 1)[1] if '\n' in raw else raw[3:]
                if raw.endswith('```'):
                    raw = raw[:-3]
                raw = raw.strip()
            if raw.startswith('json'):
                raw = raw[4:].strip()

            data = json.loads(raw)
            return Response(data, status=status.HTTP_200_OK)

        except json.JSONDecodeError:
            return Response({
                'message': raw if 'raw' in dir() else 'Could not parse AI response.',
                'movies': []
            }, status=status.HTTP_200_OK)
        except Exception as e:
            err_msg = str(e)
            if '429' in err_msg or 'RESOURCE_EXHAUSTED' in err_msg:
                return Response(
                    {'error': 'AI quota temporarily exceeded. Please wait a minute and try again.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            return Response(
                {'error': f'AI service error: {err_msg}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ═══════════════════════════════════════════════════
# YouTube Search View — real playable videos for feed
# ═══════════════════════════════════════════════════

class YouTubeSearchView(APIView):
    """
    Search YouTube for real, playable videos using YouTube Data API v3.
    Returns embeddable videos that can be played directly in BingeBuddy
    watch party rooms.

    Query params:
      - q        : search query (optional, defaults to personalised/random)
      - duration : 'any' | 'short' | 'medium' | 'long' (optional)
      - limit    : max results 1-50, default 20
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        duration = request.query_params.get('duration', '').strip()
        limit = request.query_params.get('limit', '20')

        try:
            limit = min(max(int(limit), 1), 50)
        except (ValueError, TypeError):
            limit = 20

        # Build a personalised query when none provided
        if not query:
            history = WatchHistory.objects.filter(
                user=request.user
            ).order_by('-watched_at')[:10]

            if history.exists():
                titles = [h.video_title for h in history if h.video_title][:3]
                if titles:
                    query = titles[0] + ' full movie'
            if not query:
                query = random.choice(DEFAULT_QUERIES)

        if not YOUTUBE_API_KEY:
            return Response(
                {
                    'error': 'YouTube API is not configured. Add YOUTUBE_API_KEY to your .env file.',
                    'videos': [],
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Call YouTube Data API v3
        params = {
            'part': 'snippet',
            'q': query,
            'type': 'video',
            'maxResults': limit,
            'key': YOUTUBE_API_KEY,
            'videoEmbeddable': 'true',
            'order': 'relevance',
        }

        # Filter by duration if specified
        if duration in ('short', 'medium', 'long'):
            params['videoDuration'] = duration

        # ─── Caching Implementation ──────────────────────────
        from django.core.cache import cache
        cache_key = f"yt_v2_{query}_{duration}_{limit}"
        cached_res = cache.get(cache_key)
        if cached_res:
            return Response(cached_res, status=status.HTTP_200_OK)

        try:
            resp = http_requests.get(
                'https://www.googleapis.com/youtube/v3/search',
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()

            videos = []
            for item in data.get('items', []):
                video_id = item.get('id', {}).get('videoId', '')
                snippet = item.get('snippet', {})
                if not video_id:
                    continue

                thumbnails = snippet.get('thumbnails', {})
                thumb_url = (
                    thumbnails.get('high', {}).get('url')
                    or thumbnails.get('medium', {}).get('url')
                    or thumbnails.get('default', {}).get('url', '')
                )

                videos.append({
                    'video_id': video_id,
                    'title': snippet.get('title', ''),
                    'description': snippet.get('description', ''),
                    'thumbnail': thumb_url,
                    'channel': snippet.get('channelTitle', ''),
                    'published_at': snippet.get('publishedAt', ''),
                    'video_url': f'https://www.youtube.com/watch?v={video_id}',
                })


            result = {
                'videos': videos,
                'query': query,
            }
            # Cache for 24 hours (86400 seconds)
            cache.set(cache_key, result, 86400)
            return Response(result, status=status.HTTP_200_OK)

        except http_requests.exceptions.Timeout:
            return Response(
                {'error': 'YouTube API timed out. Please try again.', 'videos': []},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        except http_requests.exceptions.RequestException as e:
            err_body = ''
            if hasattr(e, 'response') and e.response is not None:
                try:
                    err_body = e.response.json().get('error', {}).get('message', str(e))
                except Exception:
                    err_body = str(e)
            else:
                err_body = str(e)
            return Response(
                {'error': f'YouTube API error: {err_body}', 'videos': []},
                status=status.HTTP_502_BAD_GATEWAY
            )


# ═══════════════════════════════════════════════════
# YouTube Search Suggestions — autocomplete proxy
# ═══════════════════════════════════════════════════

class SuggestView(APIView):
    """Proxy YouTube autocomplete suggestions to avoid CORS issues."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({'suggestions': []}, status=status.HTTP_200_OK)

        try:
            resp = http_requests.get(
                'https://suggestqueries.google.com/complete/search',
                params={'client': 'firefox', 'ds': 'yt', 'q': query},
                timeout=3,
            )
            resp.raise_for_status()
            data = resp.json()
            # Response format: ["query", ["suggestion1", "suggestion2", ...]]
            suggestions = data[1] if len(data) > 1 else []
            return Response(
                {'suggestions': suggestions[:8]},
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response({'suggestions': []}, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════
# Record Watch History — for personalization
# ═══════════════════════════════════════════════════

class RecordWatchView(APIView):
    """Record a video the user watched for future personalization."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        video_url = request.data.get('video_url', '')
        video_id = request.data.get('video_id', '')
        video_title = request.data.get('video_title', '')
        category = request.data.get('category', '')

        if not video_url and not video_id:
            return Response(
                {'error': 'video_url or video_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        WatchHistory.objects.create(
            user=request.user,
            video_url=video_url,
            video_id=video_id,
            video_title=video_title,
            category=category,
        )

        return Response(
            {'message': 'Watch history recorded.'},
            status=status.HTTP_201_CREATED
        )


