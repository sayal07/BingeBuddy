/**
 * HostControls component for BingeBuddy.
 * Room lock toggle and video URL management.
 */

import React, { useState } from 'react';
import { HiLockClosed, HiLockOpen, HiLink, HiClipboard } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function HostControls({ roomCode, isLocked, onLock, onVideoChange }) {
  const [videoUrl, setVideoUrl] = useState('');

  const handleVideoSubmit = (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    onVideoChange(videoUrl.trim());
    setVideoUrl('');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Room code copied!');
  };

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">Host Controls</h3>

      {/* Room code */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
        <div>
          <p className="text-xs text-gray-400">Room Code</p>
          <p className="text-lg font-mono font-bold text-primary-600 dark:text-primary-400">{roomCode}</p>
        </div>
        <button onClick={copyRoomCode} className="p-2 hover:bg-gray-200 dark:hover:bg-dark-border rounded-lg transition" title="Copy code">
          <HiClipboard className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Lock toggle */}
      <button
        onClick={onLock}
        className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg font-medium transition ${
          isLocked
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'
        }`}
      >
        {isLocked ? <HiLockClosed className="w-5 h-5" /> : <HiLockOpen className="w-5 h-5" />}
        <span>{isLocked ? 'Room Locked' : 'Room Open'}</span>
      </button>

      {/* Video URL input */}
      <form onSubmit={handleVideoSubmit} className="space-y-2">
        <label className="text-sm text-gray-500 dark:text-gray-400">Change Video</label>
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <HiLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste YouTube URL..."
              className="input-field py-2 pl-9 text-sm"
            />
          </div>
          <button type="submit" className="btn-primary py-2 px-4 text-sm">
            Load
          </button>
        </div>
      </form>
    </div>
  );
}
