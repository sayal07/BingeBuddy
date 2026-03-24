from django.urls import path
from .views import MovieExplorerView, YouTubeSearchView, SuggestView, RecordWatchView

urlpatterns = [
    path('recommend/', MovieExplorerView.as_view(), name='movie-recommend'),
    path('movies/', YouTubeSearchView.as_view(), name='youtube-search'),
    path('suggest/', SuggestView.as_view(), name='youtube-suggest'),
    path('record-watch/', RecordWatchView.as_view(), name='record-watch'),
]
