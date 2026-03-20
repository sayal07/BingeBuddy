/**
 * Custom hook for WebRTC voice chat in BingeBuddy watch rooms.
 * Manages peer connections, audio streams, and signaling via WebSocket.
 *
 * Mute logic:
 * - isSelfMuted: user toggled their own mic off (privacy — host cannot override)
 * - isForceMuted: host muted this user (persists across voice reconnects)
 * - isMicMuted: true if EITHER self-muted or force-muted (actual track state)
 *
 * Per-peer state:
 * - voicePeers[id].isSelfMuted: peer self-muted
 * - voicePeers[id].isHostMuted: peer was muted by host
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useVoiceChat(roomCode, userId, enabled = false) {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSelfMuted, setIsSelfMuted] = useState(false);
  const [isForceMuted, setIsForceMuted] = useState(false);
  // { [userId]: { username, isSelfMuted, isHostMuted } }
  const [voicePeers, setVoicePeers] = useState({});

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const pendingCandidatesRef = useRef({});

  // Derived: actual mic state — muted if either self or host muted
  const isMicMuted = isSelfMuted || isForceMuted;

  // Handle signaling messages
  const handleVoiceMessage = useCallback((data) => {
    switch (data.type) {
      case 'peer_joined':
        handlePeerJoined(data);
        break;
      case 'peer_left':
        handlePeerLeft(data);
        break;
      case 'offer':
        handleOffer(data);
        break;
      case 'answer':
        handleAnswer(data);
        break;
      case 'ice_candidate':
        handleIceCandidate(data);
        break;
      case 'force_mute':
        handleForceMute(data);
        break;
      case 'mic_status':
        handleMicStatus(data);
        break;
      case 'host_mute_status':
        handleHostMuteStatus(data);
        break;
      default:
        break;
    }
  }, []);

  const { sendMessage: sendVoice, isConnected: voiceConnected } = useWebSocket(
    `ws/room/${roomCode}/voice/`,
    handleVoiceMessage,
    enabled && isVoiceActive
  );

  const sendVoiceRef = useRef(sendVoice);
  useEffect(() => { sendVoiceRef.current = sendVoice; }, [sendVoice]);

  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Create a peer connection for a remote user
  const createPeerConnection = useCallback((remoteUserId, remoteUsername, isHostMuted = false) => {
    if (peerConnectionsRef.current[remoteUserId]) {
      return peerConnectionsRef.current[remoteUserId];
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendVoiceRef.current({
          type: 'ice_candidate',
          candidate: event.candidate.toJSON(),
          to_user_id: remoteUserId,
        });
      }
    };

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      pc._audioElement = audio;
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        cleanupPeer(remoteUserId);
      }
    };

    peerConnectionsRef.current[remoteUserId] = pc;

    setVoicePeers(prev => ({
      ...prev,
      [remoteUserId]: {
        username: remoteUsername || 'User',
        isSelfMuted: false,
        isHostMuted: isHostMuted,
      }
    }));

    return pc;
  }, []);

  const cleanupPeer = useCallback((peerId) => {
    const pc = peerConnectionsRef.current[peerId];
    if (pc) {
      if (pc._audioElement) {
        pc._audioElement.srcObject = null;
        pc._audioElement = null;
      }
      pc.close();
      delete peerConnectionsRef.current[peerId];
    }
    setVoicePeers(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const processPendingCandidates = useCallback(async (peerId) => {
    const pending = pendingCandidatesRef.current[peerId];
    const pc = peerConnectionsRef.current[peerId];
    if (pending && pc && pc.remoteDescription) {
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[Voice] Error adding pending ICE candidate:', e);
        }
      }
      delete pendingCandidatesRef.current[peerId];
    }
  }, []);

  // ── Signaling handlers ──

  const handlePeerJoined = useCallback(async (data) => {
    const pc = createPeerConnection(data.user_id, data.username, data.is_host_muted || false);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendVoiceRef.current({
        type: 'offer',
        offer: pc.localDescription.toJSON(),
        to_user_id: data.user_id,
      });
    } catch (e) {
      console.error('[Voice] Error creating offer:', e);
    }
  }, [createPeerConnection]);

  const handlePeerLeft = useCallback((data) => {
    cleanupPeer(data.user_id);
  }, [cleanupPeer]);

  const handleOffer = useCallback(async (data) => {
    const pc = createPeerConnection(data.from_user_id, data.username);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      await processPendingCandidates(data.from_user_id);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendVoiceRef.current({
        type: 'answer',
        answer: pc.localDescription.toJSON(),
        to_user_id: data.from_user_id,
      });
    } catch (e) {
      console.error('[Voice] Error handling offer:', e);
    }
  }, [createPeerConnection, processPendingCandidates]);

  const handleAnswer = useCallback(async (data) => {
    const pc = peerConnectionsRef.current[data.from_user_id];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        await processPendingCandidates(data.from_user_id);
      } catch (e) {
        console.error('[Voice] Error handling answer:', e);
      }
    }
  }, [processPendingCandidates]);

  const handleIceCandidate = useCallback(async (data) => {
    const pc = peerConnectionsRef.current[data.from_user_id];
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.warn('[Voice] Error adding ICE candidate:', e);
      }
    } else {
      if (!pendingCandidatesRef.current[data.from_user_id]) {
        pendingCandidatesRef.current[data.from_user_id] = [];
      }
      pendingCandidatesRef.current[data.from_user_id].push(data.candidate);
    }
  }, []);

  const handleForceMute = useCallback((data) => {
    if (data.muted) {
      setIsForceMuted(true);
      // Actually mute the local audio track
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      }
    } else {
      setIsForceMuted(false);
      // Re-enable track only if user hasn't self-muted
      // We read isSelfMuted via a ref to avoid stale closure
      // But since setIsForceMuted triggers re-render, the derived isMicMuted
      // will correctly compute from the new state. We just need to re-enable
      // the track if user isn't self-muted.
      if (localStreamRef.current) {
        // We'll let the next render cycle handle this via an effect
      }
    }
  }, []);

  // Sync audio track enabled state whenever mute states change
  useEffect(() => {
    if (localStreamRef.current) {
      const shouldBeEnabled = !isSelfMuted && !isForceMuted;
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = shouldBeEnabled;
      });
    }
  }, [isSelfMuted, isForceMuted]);

  const handleMicStatus = useCallback((data) => {
    setVoicePeers(prev => {
      if (!prev[data.user_id]) return prev;
      return {
        ...prev,
        [data.user_id]: {
          ...prev[data.user_id],
          isSelfMuted: data.is_self_muted ? data.is_muted : prev[data.user_id].isSelfMuted,
        }
      };
    });
  }, []);

  const handleHostMuteStatus = useCallback((data) => {
    // Another peer's host-mute status changed (broadcast from server)
    setVoicePeers(prev => {
      if (!prev[data.user_id]) return prev;
      return {
        ...prev,
        [data.user_id]: {
          ...prev[data.user_id],
          isHostMuted: data.is_host_muted,
        }
      };
    });
  }, []);

  // ── Public API ──

  const joinVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsVoiceActive(true);
      setIsSelfMuted(false);
      // NOTE: Do NOT reset isForceMuted here — the server will re-send
      // force_mute on connect if the user was host-muted
    } catch (e) {
      console.error('[Voice] Microphone access denied:', e);
      throw new Error('Microphone access denied');
    }
  }, []);

  const leaveVoice = useCallback(() => {
    Object.keys(peerConnectionsRef.current).forEach(cleanupPeer);
    peerConnectionsRef.current = {};
    pendingCandidatesRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    setIsVoiceActive(false);
    setIsSelfMuted(false);
    // Keep isForceMuted as-is — server remembers, will re-apply on rejoin
    setVoicePeers({});
  }, [cleanupPeer]);

  const toggleMic = useCallback(() => {
    if (isForceMuted) return; // Can't unmute if host muted you

    const newSelfMuted = !isSelfMuted;
    setIsSelfMuted(newSelfMuted);

    // Broadcast self-mute status
    sendVoiceRef.current({
      type: 'mic_status',
      is_muted: newSelfMuted,
    });
  }, [isSelfMuted, isForceMuted]);

  const muteUser = useCallback((targetUserId, muted = true) => {
    sendVoiceRef.current({
      type: 'mute_user',
      target_user_id: targetUserId,
      muted,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(peerConnectionsRef.current).forEach(pc => {
        if (pc._audioElement) {
          pc._audioElement.srcObject = null;
        }
        pc.close();
      });
      peerConnectionsRef.current = {};
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  return {
    isVoiceActive,
    isMicMuted,       // true if self-muted OR force-muted (derived)
    isSelfMuted,      // user toggled their own mic off
    isForceMuted,     // host muted this user
    voicePeers,
    voiceConnected,
    joinVoice,
    leaveVoice,
    toggleMic,
    muteUser,
  };
}

