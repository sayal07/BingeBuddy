/**
 * VideoPlayer component for BingeBuddy.
 * Embeds YouTube videos and handles sync events.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import YouTube from 'react-youtube';
import { HiPlay, HiPause } from 'react-icons/hi';

function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[1].length === 11 ? match[1] : null;
}

export default function VideoPlayer({ videoUrl, isPlaying, timestamp, isHost, onSync, onSyncHandler }) {
  const playerRef = useRef(null);
  // Use a timestamp-based cooldown instead of single-use boolean
  // Events are ignored until this time passes
  const ignoreUntilRef = useRef(0);
  // Cooldown period in milliseconds
  const SYNC_COOLDOWN = 2000;

  const videoId = extractYouTubeId(videoUrl);

  const onReady = (event) => {
    playerRef.current = event.target;
    if (timestamp > 0) {
      ignoreUntilRef.current = Date.now() + SYNC_COOLDOWN;
      event.target.seekTo(timestamp, true);
    }
  };

  const onStateChange = (event) => {
    // Ignore events during cooldown period
    if (Date.now() < ignoreUntilRef.current) {
      return;
    }

    const player = event.target;
    const state = event.data;

    // YouTube states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
    // Anyone can control the video - sync events broadcast to all participants
    if (state === 1) {
      onSync({ type: 'play', timestamp: player.getCurrentTime() });
      if (Date.now() > ignoreUntilRef.current) {
        // Prevent double notifications on initial load
        onSync({ type: 'action', content: 'played the video' });
      }
    } else if (state === 2) {
      onSync({ type: 'pause', timestamp: player.getCurrentTime() });
      if (Date.now() > ignoreUntilRef.current) {
        onSync({ type: 'action', content: 'paused the video' });
      }
    }
  };

  // Handle incoming sync commands
  const handleSyncCommand = useCallback((command) => {
    const player = playerRef.current;
    if (!player) return;

    // Preserve scroll position - YouTube API calls can cause focus/scroll changes
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Set cooldown to ignore subsequent events
    ignoreUntilRef.current = Date.now() + SYNC_COOLDOWN;

    if (command.type === 'play') {
      player.seekTo(command.timestamp, true);
      player.playVideo();
    } else if (command.type === 'pause') {
      player.seekTo(command.timestamp, true);
      player.pauseVideo();
    } else if (command.type === 'seek') {
      player.seekTo(command.timestamp, true);
    }

    // Restore scroll position after YouTube processes the command
    setTimeout(() => {
      window.scrollTo(scrollX, scrollY);
    }, 100);
  }, []);

  // Register handleSyncCommand with parent via callback
  useEffect(() => {
    if (onSyncHandler) {
      onSyncHandler(handleSyncCommand);
    }
  }, [handleSyncCommand, onSyncHandler]);

  // REMOVED: Drift check effect was causing feedback loop
  // Sync commands now handle positioning directly

  const handleManualSeek = () => {
    if (isHost && playerRef.current) {
      onSync({ type: 'seek', timestamp: playerRef.current.getCurrentTime() });
    }
  };

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      controls: 1, // All participants can control the video
    },
  };

  if (!videoId) {
    return (
      <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <span className="text-6xl block mb-4">🎬</span>
          <p className="text-lg">No video loaded yet</p>
          {isHost && <p className="text-sm mt-2">Paste a YouTube URL to get started</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
          className="w-full h-full"
          iframeClassName="w-full h-full"
        />
      </div>

      {/* Host controls removed from here, auto-sync logic handles everything */}
    </div>
  );
}
