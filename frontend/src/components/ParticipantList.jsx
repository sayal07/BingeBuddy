/**
 * ParticipantList component for BingeBuddy.
 * Shows room members with host moderation controls.
 */

import React from 'react';
import { HiUserRemove, HiVolumeOff, HiVolumeUp, HiShieldCheck } from 'react-icons/hi';

export default function ParticipantList({ participants, hostId, currentUserId, mutedUsers, onKick, onMute, isHost }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Participants ({participants.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-dark-border max-h-64 overflow-y-auto">
        {participants.map((p) => (
          <div key={p.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-border/50 transition">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
                {p.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {p.username}
                </span>
                {p.id === hostId && (
                  <span className="ml-2 inline-flex items-center text-xs text-yellow-600 dark:text-yellow-400">
                    <HiShieldCheck className="w-3 h-3 mr-1" /> Host
                  </span>
                )}
                {p.id === currentUserId && (
                  <span className="ml-2 text-xs text-gray-400">(You)</span>
                )}
              </div>
            </div>

            {/* Host controls */}
            {isHost && p.id !== currentUserId && p.id !== hostId && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onKick(p.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                  title="Kick user"
                >
                  <HiUserRemove className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
