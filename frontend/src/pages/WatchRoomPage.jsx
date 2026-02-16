import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import { useVoiceChat } from "../hooks/useVoiceChat";
import {
  Play, Pause, MessageCircle, Users, Copy, LogOut, Lock, Unlock,
  Send, UserX, Loader2, Link as LinkIcon,
  Upload, FileVideo, Youtube, Check, X,
  Maximize, Minimize, Volume2, VolumeX,
  Mic, MicOff, PhoneCall, PhoneOff
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { extractYouTubeId } from "../utils/youtube";

/* Custom 10s skip icons – number inside circular arrow */
const Skip10Back = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v6h6" />
    <path d="M4 8a8 8 0 1 1-1.5 4.5" />
    <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8.5" fontWeight="700" fontFamily="Arial, sans-serif">10</text>
  </svg>
);
const Skip10Fwd = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 2v6h-6" />
    <path d="M20 8a8 8 0 1 0 1.5 4.5" />
    <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8.5" fontWeight="700" fontFamily="Arial, sans-serif">10</text>
  </svg>
);

function fmtTime(s) {
  if (!s || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export default function WatchRoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytReady = useRef(false);
  const ignoreSync = useRef(false);
  const chatEndRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const [videoSource, setVideoSource] = useState("none");
  const [videoUrl, setVideoUrl] = useState("");
  const [ytInput, setYtInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [activeTab, setActiveTab] = useState("youtube");
  const [videoFile, setVideoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Activity notifications overlay
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);

  const pushNotification = useCallback((text, icon = "ℹ️") => {
    const id = ++notifIdRef.current;
    setNotifications((prev) => [...prev.slice(-4), { id, text, icon }]); // keep max 5
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  }, []);

  const isHost = room?.host?.id === user?.id;

  // ═══ Voice Chat ═══
  const {
    isVoiceActive, isMicMuted, isSelfMuted, isForceMuted, voicePeers, voiceConnected,
    joinVoice, leaveVoice, toggleMic, muteUser,
  } = useVoiceChat(code, String(user?.id), !!room);

  const handleToggleVoice = async () => {
    if (isVoiceActive) {
      leaveVoice();
      pushNotification(`${user?.username} left voice chat`, "🎤");
    } else {
      try {
        await joinVoice();
        pushNotification(`${user?.username} joined voice chat`, "🎤");
      } catch {
        toast.error("Microphone access denied. Please allow mic access.");
      }
    }
  };

  /* ═══ Fullscreen detection ═══ */
  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) { setShowOverlay(true); restartHideTimer(); }
      else { setShowOverlay(false); }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const restartHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowOverlay(false), 5000);
  }, []);

  const handleMouseMoveOnPlayer = useCallback(() => {
    if (!isFullscreen) return;
    setShowOverlay(true);
    restartHideTimer();
  }, [isFullscreen, restartHideTimer]);

  /* ═══ Fetch Room ═══ */
  const fetchRoom = useCallback(async () => {
    try {
      const res = await api.get(`/rooms/${code}/`);
      setRoom(res.data);
      return res.data;
    } catch {
      toast.error("Room not found or access denied.");
      navigate("/dashboard");
      return null;
    }
  }, [code, navigate]);

  useEffect(() => {
    fetchRoom().then((data) => {
      if (data) {
        setIsPlaying(data.is_playing);
        setCurrentTime(data.current_timestamp);
        if (data.current_video_url) {
          setVideoUrl(data.current_video_url);
          const isYt = data.current_video_url.includes("youtube.com") || data.current_video_url.includes("youtu.be");
          setVideoSource(isYt ? "youtube" : "local");
        }
      }
      setLoading(false);
    });
  }, [fetchRoom]);

  /* ═══ Poll room data every 8s ═══ */
  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => {
      api.get(`/rooms/${code}/`).then((res) => {
        setRoom(res.data);
        if (res.data.current_video_url && !videoUrl) {
          setVideoUrl(res.data.current_video_url);
          const isYt = res.data.current_video_url.includes("youtube.com") || res.data.current_video_url.includes("youtu.be");
          setVideoSource(isYt ? "youtube" : "local");
        }
      }).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [code, room, videoUrl]);

  /* ═══ Chat History ═══ */
  useEffect(() => {
    api.get(`/chat/${code}/history/`).then((res) => {
      setMessages(res.data.messages || []);
    }).catch(() => {});
  }, [code]);

  /* ═══ Player Helpers ═══ */
  const seekPlayer = useCallback((time) => {
    if (ytPlayerRef.current && ytReady.current) {
      ytPlayerRef.current.seekTo(time, true);
    }
    if (videoRef.current) {
      const v = videoRef.current;
      // Video must have metadata loaded (readyState >= 1) for seeking to work
      if (v.readyState >= 1) {
        v.currentTime = time;
      } else {
        // Wait for metadata then seek
        const onReady = () => {
          v.currentTime = time;
          v.removeEventListener("loadedmetadata", onReady);
        };
        v.addEventListener("loadedmetadata", onReady);
      }
    }
  }, []);

  const playPlayer = useCallback(() => {
    if (videoRef.current) videoRef.current.play().catch(() => {});
    if (ytPlayerRef.current && ytReady.current) ytPlayerRef.current.playVideo();
  }, []);

  const pausePlayer = useCallback(() => {
    if (videoRef.current) videoRef.current.pause();
    if (ytPlayerRef.current && ytReady.current) ytPlayerRef.current.pauseVideo();
  }, []);

  const getPlayerTime = useCallback(() => {
    if (videoRef.current) return videoRef.current.currentTime || 0;
    if (ytPlayerRef.current && ytReady.current) return ytPlayerRef.current.getCurrentTime() || 0;
    return 0;
  }, []);

  const getPlayerDuration = useCallback(() => {
    if (videoRef.current) return videoRef.current.duration || 0;
    if (ytPlayerRef.current && ytReady.current) return ytPlayerRef.current.getDuration() || 0;
    return 0;
  }, []);

  /* ═══ SYNC WebSocket ═══ */
  const handleSyncMessage = useCallback((data) => {
    console.log("[SYNC] received:", data.type, data);
    if (data.initiated_by && data.initiated_by === String(user?.id)) return;

    switch (data.type) {
      case "play":
        ignoreSync.current = true;
        setIsPlaying(true);
        setCurrentTime(data.timestamp);
        seekPlayer(data.timestamp);
        pushNotification(`${data.username || "Someone"} played the video`, "▶️");
        setTimeout(() => {
          playPlayer();
          ignoreSync.current = false;
        }, 300);
        break;

      case "pause":
        ignoreSync.current = true;
        setIsPlaying(false);
        setCurrentTime(data.timestamp);
        pausePlayer();
        pushNotification(`${data.username || "Someone"} paused the video`, "⏸️");
        setTimeout(() => {
          seekPlayer(data.timestamp);
          ignoreSync.current = false;
        }, 100);
        break;

      case "seek":
        ignoreSync.current = true;
        setCurrentTime(data.timestamp);
        seekPlayer(data.timestamp);
        pushNotification(`${data.username || "Someone"} seeked to ${fmtTime(data.timestamp)}`, "⏩");
        setTimeout(() => { ignoreSync.current = false; }, 500);
        break;

      case "sync_state":
        if (data.video_url) {
          setVideoUrl(data.video_url);
          const isYt = data.video_url.includes("youtube.com") || data.video_url.includes("youtu.be");
          setVideoSource(isYt ? "youtube" : "local");
        }
        setIsPlaying(data.is_playing);
        setCurrentTime(data.timestamp);
        ignoreSync.current = true;
        setTimeout(() => {
          seekPlayer(data.timestamp);
          if (data.is_playing) playPlayer(); else pausePlayer();
          ignoreSync.current = false;
        }, 1500);
        break;

      case "video_change":
        setVideoUrl(data.video_url);
        const isYtC = data.video_url?.includes("youtube.com") || data.video_url?.includes("youtu.be");
        setVideoSource(isYtC ? "youtube" : "local");
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        pushNotification(`New video loaded`, "🎬");
        toast(`Now playing: ${data.video_title || "New video"}`, { icon: "🎬" });
        break;

      case "buffering":
        if (data.is_buffering) toast(`${data.username} is buffering...`, { icon: "⏳", duration: 2000 });
        break;

      case "kick":
        // If I am the kicked user, navigate away immediately
        if (String(data.kicked_user_id) === String(user?.id)) {
          toast.error("You have been kicked from this room.");
          navigate("/dashboard");
        } else {
          // Another user was kicked, refresh room data
          fetchRoom();
          toast(`${data.kicked_username} was kicked from the room.`, { icon: "🚫" });
        }
        break;

      default: break;
    }
  }, [user?.id, seekPlayer, playPlayer, pausePlayer, navigate, fetchRoom, pushNotification]);

  const { sendMessage: sendSync, isConnected: syncConnected } = useWebSocket(
    `ws/room/${code}/sync/`, handleSyncMessage, !!room
  );

  /* ═══ CHAT WebSocket ═══ */
  const handleChatMessage = useCallback((data) => {
    setMessages((prev) => [...prev, {
      id: Date.now() + Math.random(),
      sender_username: data.username,
      content: data.content || data.message,
      message_type: data.type === "system" ? "system" : (data.message_type || "text"),
    }]);

    if (data.type === "system" && (data.event === "join" || data.event === "leave")) {
      fetchRoom();
    }
  }, [fetchRoom]);

  const { sendMessage: sendChat, isConnected: chatConnected } = useWebSocket(
    `ws/room/${code}/chat/`, handleChatMessage, !!room
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  /* ═══ Broadcast activity to all users via chat WebSocket ═══ */
  const broadcastActivity = useCallback((text) => {
    sendChat({ type: "action", content: text });
  }, [sendChat]);

  /* ═══ YouTube IFrame API ═══ */
  const ytId = extractYouTubeId(videoUrl);

  useEffect(() => {
    if (videoSource !== "youtube" || !ytId) return;
    ytReady.current = false;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    function createPlayer() {
      const container = document.getElementById("yt-container");
      if (!container) return;
      container.innerHTML = "";
      const playerDiv = document.createElement("div");
      playerDiv.id = "yt-player";
      playerDiv.style.width = "100%";
      playerDiv.style.height = "100%";
      container.appendChild(playerDiv);

      ytPlayerRef.current = new window.YT.Player("yt-player", {
        videoId: ytId,
        playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, fs: 0 },
        events: {
          onReady: () => {
            ytReady.current = true;
            setDuration(ytPlayerRef.current.getDuration());
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setDuration(ytPlayerRef.current.getDuration());
            }
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      setTimeout(createPlayer, 100);
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
      }
      ytPlayerRef.current = null;
      ytReady.current = false;
    };
  }, [ytId, videoSource]);

  /* ═══ Time Tracker ═══ */
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoSource === "youtube" && ytPlayerRef.current && ytReady.current) {
        setCurrentTime(ytPlayerRef.current.getCurrentTime());
        const d = ytPlayerRef.current.getDuration();
        if (d > 0) setDuration(d);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [videoSource]);

  useEffect(() => {
    if (videoSource !== "local" || !videoRef.current) return;
    const v = videoRef.current;
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDur);
    };
  }, [videoSource, videoUrl]);

  /* ═══ Playback Controls ═══ */
  const doPlayPause = useCallback(() => {
    if (!videoUrl || videoSource === "none") return;
    const t = getPlayerTime();
    if (isPlaying) {
      pausePlayer();
      setIsPlaying(false);
      sendSync({ type: "pause", timestamp: t });
      broadcastActivity(`${user?.username} paused the video`);
    } else {
      playPlayer();
      setIsPlaying(true);
      sendSync({ type: "play", timestamp: t });
      broadcastActivity(`${user?.username} played the video`);
    }
  }, [isPlaying, videoUrl, videoSource, getPlayerTime, playPlayer, pausePlayer, sendSync, broadcastActivity, user?.username]);

  const doForward = useCallback(() => {
    if (!videoUrl || videoSource === "none") return;
    const t = Math.min(getPlayerTime() + 10, getPlayerDuration());
    seekPlayer(t);
    setCurrentTime(t);
    sendSync({ type: "seek", timestamp: t });
    broadcastActivity(`${user?.username} skipped +10s`);
  }, [videoUrl, videoSource, getPlayerTime, getPlayerDuration, seekPlayer, sendSync, broadcastActivity, user?.username]);

  const doBackward = useCallback(() => {
    if (!videoUrl || videoSource === "none") return;
    const t = Math.max(0, getPlayerTime() - 10);
    seekPlayer(t);
    setCurrentTime(t);
    sendSync({ type: "seek", timestamp: t });
    broadcastActivity(`${user?.username} skipped -10s`);
  }, [videoUrl, videoSource, getPlayerTime, seekPlayer, sendSync, broadcastActivity, user?.username]);

  const handleSeekBar = (e) => {
    const t = parseFloat(e.target.value);
    seekPlayer(t);
    setCurrentTime(t);
    sendSync({ type: "seek", timestamp: t });
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (videoRef.current) videoRef.current.volume = v;
    if (ytPlayerRef.current && ytReady.current) ytPlayerRef.current.setVolume(v * 100);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) videoRef.current.muted = newMuted;
    if (ytPlayerRef.current && ytReady.current) {
      newMuted ? ytPlayerRef.current.mute() : ytPlayerRef.current.unMute();
    }
  };

  const handleFullscreen = () => {
    const el = playerContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  /* ═══ Host: Load Video ═══ */
  const handleSetYoutube = async () => {
    if (!ytInput.trim() || !isHost) return;
    try {
      await api.put(`/rooms/${code}/video/`, { video_url: ytInput, video_title: "", video_source: "youtube" });
      sendSync({ type: "video_change", video_url: ytInput, video_title: "", video_source: "youtube" });
      setVideoUrl(ytInput);
      setVideoSource("youtube");
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      broadcastActivity(`${user?.username} loaded a new video`);
      toast.success("YouTube video loaded!");
    } catch {
      toast.error("Failed to set video.");
    }
  };

  const handleUploadVideo = async (e) => {
    e.preventDefault();
    if (!videoFile || !isHost) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("video", videoFile);
    try {
      const res = await api.post(`/rooms/${code}/upload-video/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Backend already returns an absolute URL via build_absolute_uri
      const localUrl = res.data.video_url;
      sendSync({ type: "video_change", video_url: localUrl, video_title: res.data.video_title || videoFile.name, video_source: "local" });
      await api.put(`/rooms/${code}/video/`, { video_url: localUrl, video_title: res.data.video_title || videoFile.name });
      setVideoUrl(localUrl);
      setVideoSource("local");
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      broadcastActivity(`${user?.username} uploaded a local video`);
      toast.success("Video uploaded!");
      setVideoFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  /* ═══ Room Actions ═══ */
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat({ type: "text", content: chatInput.trim() });
    setChatInput("");
  };

  const handleModerate = async (userId) => {
    try {
      // Find the username being kicked
      const kicked = room?.participants?.find(p => p.id === userId);
      await api.post(`/rooms/${code}/kick/`, { user_id: userId });
      // Broadcast kick via sync WebSocket so kicked user is removed immediately
      sendSync({ type: "kick", kicked_user_id: userId, kicked_username: kicked?.username || "" });
      toast.success("User kicked.");
      fetchRoom();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed.");
    }
  };

  const handleJoinRequest = async (userId, action) => {
    try {
      const res = await api.post(`/rooms/${code}/handle-request/`, { user_id: userId, action });
      toast.success(res.data.message);
      fetchRoom();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed.");
    }
  };

  const handleLock = async () => {
    try {
      const res = await api.post(`/rooms/${code}/lock/`);
      setRoom((r) => ({ ...r, is_locked: res.data.is_locked }));
      toast.success(res.data.message);
    } catch { toast.error("Failed to toggle lock."); }
  };

  const handleLeave = async () => {
    if (isVoiceActive) leaveVoice();
    try { await api.post(`/rooms/${code}/leave/`); } catch {}
    navigate("/dashboard");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Room code copied!");
  };

  /* ═══ RENDER ═══ */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  const hasVideo = videoUrl && videoSource !== "none";
  const volPct = (isMuted ? 0 : volume) * 100;
  const seekPct = duration ? (currentTime / duration) * 100 : 0;
  const pendingRequests = room?.pending_requests || [];

  /* controls bar (shared between normal + fullscreen) */
  const renderControls = () => (
    <div onClick={(e) => e.stopPropagation()}>
      {hasVideo && (
        <input type="range" min="0" max={duration || 100} step="0.5" value={currentTime} onChange={handleSeekBar}
          className="w-full h-2 rounded-full appearance-none cursor-pointer mb-2
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(0,0,0,0.3)]"
          style={{ background: `linear-gradient(to right, #5c7cfa ${seekPct}%, rgba(156,163,175,0.3) ${seekPct}%)` }} />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={doBackward} disabled={!hasVideo}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-30 text-gray-700 dark:text-white" title="-10s">
            <Skip10Back />
          </button>
          <button onClick={doPlayPause} disabled={!hasVideo}
            className="p-2.5 rounded-full bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-30 text-white">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={doForward} disabled={!hasVideo}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-30 text-gray-700 dark:text-white" title="+10s">
            <Skip10Fwd />
          </button>
          <span className="text-xs text-gray-600 dark:text-white/80 font-mono ml-2">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-white/90">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolume}
            className="w-24 h-1.5 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-brand-600 dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            style={{ background: `linear-gradient(to right, #4263eb ${volPct}%, rgba(156,163,175,0.3) ${volPct}%)` }} />
          <button onClick={handleFullscreen} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-white/90">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 bg-gray-50 dark:bg-surface-800/80 border-b border-gray-200 dark:border-white/5 shrink-0 gap-2">
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
          <h1 className="font-display text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{room?.name}</h1>
          <button onClick={copyCode}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-mono bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/15 transition-colors shrink-0">
            <Copy className="w-3 h-3" /> {code}
          </button>
          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${room?.is_locked ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
            {room?.is_locked ? "Locked" : "Open"}
          </span>
          {syncConnected ? (
            <span className="w-2 h-2 shrink-0 bg-green-400 rounded-full" title="Sync connected" />
          ) : (
            <span className="w-2 h-2 shrink-0 bg-red-400 rounded-full animate-pulse" title="Sync disconnected" />
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {isHost && (
            <button onClick={handleLock} className="btn-secondary text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 flex items-center gap-1 whitespace-nowrap">
              {room?.is_locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {room?.is_locked ? "Unlock" : "Lock"}
            </button>
          )}
          <button onClick={handleToggleVoice}
            className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 flex items-center gap-1 rounded-lg font-semibold border-2 transition-all whitespace-nowrap ${
              isVoiceActive
                ? "bg-green-600/15 border-green-500 text-green-500 hover:bg-green-600/25"
                : "border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-600 dark:hover:text-white"
            }`}>
            {isVoiceActive ? <PhoneOff className="w-3 h-3" /> : <PhoneCall className="w-3 h-3" />}
            {isVoiceActive ? "Leave" : "Voice"}
          </button>
          {isVoiceActive && (
            <button onClick={toggleMic}
              className={`text-[10px] sm:text-xs px-2 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                isMicMuted
                  ? "bg-red-600/15 text-red-400 border border-red-500/30"
                  : "bg-green-600/15 text-green-400 border border-green-500/30"
              } ${isForceMuted ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isForceMuted}
              title={isForceMuted ? "Host has muted your mic" : (isMicMuted ? "Unmute" : "Mute")}>
              {isMicMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            </button>
          )}
          <button onClick={() => setShowChat(!showChat)} className="btn-secondary text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 flex items-center gap-1 whitespace-nowrap">
            <MessageCircle className="w-3 h-3" /> Chat
          </button>
          <button onClick={handleLeave} className="btn-danger text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 flex items-center gap-1 whitespace-nowrap">
            <LogOut className="w-3 h-3" /> Leave
          </button>
        </div>
      </div>

      {/* Main Container: Mobile = Vertical, Desktop = Horizontal */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Video Column */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
          <div
            ref={playerContainerRef}
            className="relative flex-1 bg-black overflow-hidden w-full h-full"
            onMouseMove={handleMouseMoveOnPlayer}>

            {videoSource === "youtube" && ytId ? (
              <>
                <div id="yt-container" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
                <div className="absolute inset-0 z-10 cursor-pointer" onClick={doPlayPause} />
              </>
            ) : videoSource === "local" && videoUrl ? (
              <video
                ref={videoRef} src={videoUrl}
                className="w-full h-full object-contain cursor-pointer" playsInline
                onClick={doPlayPause} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                <Play className="w-12 h-12 sm:w-16 sm:h-16 mb-3 opacity-30" />
                <p className="text-base sm:text-lg">No video loaded</p>
                {isHost && <p className="text-xs sm:text-sm mt-1 text-gray-600">Use the panel below to load a video</p>}
                {!isHost && <p className="text-xs sm:text-sm mt-1 text-gray-600">Waiting for host to load a video...</p>}
              </div>
            )}

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 items-end pointer-events-none">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/10 shadow-lg animate-slide-in-right"
                  >
                    <span>{n.icon}</span>
                    <span className="max-w-[150px] sm:max-w-none truncate">{n.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Fullscreen controls overlay */}
            {isFullscreen && (
              <div
                className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-in-out ${
                  showOverlay ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                }`}>
                <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-16 pb-4 px-4 sm:px-6">
                  {renderControls()}
                </div>
              </div>
            )}
          </div>

          {/* Normal controls */}
          {!isFullscreen && (
            <div className="bg-gray-50 dark:bg-surface-800/90 border-t border-gray-200 dark:border-white/5 px-3 sm:px-4 py-2 sm:py-3 shrink-0">
              {renderControls()}
            </div>
          )}

          {/* Host: Upload Area */}
          {isHost && (
            <div className="bg-gray-50 dark:bg-surface-800/60 border-t border-gray-200 dark:border-white/5 px-3 sm:px-4 py-2 sm:py-3 shrink-0">
              <div className="flex gap-4 mb-2">
                <div className="text-[10px] font-semibold flex items-center gap-1.5 text-brand-400">
                  <FileVideo className="w-3 h-3" /> Local Video Hosting
                </div>
              </div>
              <form onSubmit={handleUploadVideo} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input type="file" accept="video/*,.mkv" onChange={(e) => setVideoFile(e.target.files[0])}
                  className="flex-1 text-[10px] sm:text-sm text-gray-400 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-medium file:bg-brand-600/10 file:text-brand-400 hover:file:bg-brand-600/20" />
                <button type="submit" disabled={!videoFile || isUploading}
                  className="btn-primary text-xs py-1.5 sm:py-2 whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0">
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {isUploading ? "Uploading..." : "Play File"}
                </button>
              </form>
            </div>
          )}

          {/* Requests Area */}
          {isHost && pendingRequests.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border-t border-yellow-200 dark:border-yellow-500/20 px-3 sm:px-4 py-2 shrink-0">
              <p className="text-[10px] font-medium text-yellow-400 mb-1.5">⚡ Join Requests</p>
              <div className="flex flex-wrap gap-2">
                {pendingRequests.map((req) => (
                  <div key={req.user_id} className="flex items-center gap-2 bg-gray-100 dark:bg-surface-800/80 rounded-lg px-2 py-1 text-[10px]">
                    <span className="w-4 h-4 rounded-full bg-yellow-600/30 flex items-center justify-center text-[8px] font-medium uppercase">{req.username?.[0]}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{req.username}</span>
                    <div className="flex gap-1 ml-1">
                      <button onClick={() => handleJoinRequest(req.user_id, "accept")} className="p-1 rounded bg-green-600/20 text-green-400"><Check className="w-3 h-3" /></button>
                      <button onClick={() => handleJoinRequest(req.user_id, "reject")} className="p-1 rounded bg-red-600/20 text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants Area */}
          <div className="bg-gray-50 dark:bg-surface-800/40 border-t border-gray-200 dark:border-white/5 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Users className="w-3 h-3 text-brand-400 shrink-0" />
              <span className="text-[10px] text-gray-500 shrink-0">({room?.participant_count})</span>
              {room?.participants?.map((p) => {
                const pid = String(p.id);
                const peer = voicePeers[pid];
                const isSelf = pid === String(user?.id);
                return (
                  <div key={p.id} className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-full px-2 py-0.5 text-[10px] text-gray-700 dark:text-gray-300">
                    <span className="w-4 h-4 rounded-full bg-brand-600/30 flex items-center justify-center text-[8px] font-medium uppercase">{p.username?.[0]}</span>
                    <span className="max-w-[80px] truncate">{p.username}</span>
                    {isVoiceActive && isSelf && (isMicMuted ? <MicOff className="w-2 h-2 text-red-400" /> : <Mic className="w-2 h-2 text-green-400" />)}
                    {isVoiceActive && !isSelf && peer && ((peer.isSelfMuted || peer.isHostMuted) ? <MicOff className="w-2 h-2 text-red-400" /> : <Mic className="w-2 h-2 text-green-400" />)}
                    {isHost && room?.host?.id !== p.id && (
                      <>
                        {isVoiceActive && peer && !peer.isSelfMuted && !peer.isHostMuted && (
                          <button onClick={() => muteUser(pid, true)} className="hover:text-yellow-400 ml-0.5" title="Mute mic"><MicOff className="w-2.5 h-2.5" /></button>
                        )}
                        {isVoiceActive && peer && peer.isHostMuted && (
                          <button onClick={() => muteUser(pid, false)} className="hover:text-green-400 ml-0.5" title="Unmute mic"><Mic className="w-2.5 h-2.5" /></button>
                        )}
                        <button onClick={() => handleModerate(p.id)} className="hover:text-red-400 ml-0.5" title="Kick"><UserX className="w-2.5 h-2.5" /></button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chat Panel: Desktop = Side, Mobile = Bottom/Expanded */}
        {showChat && (
          <div className="w-full md:w-80 flex flex-col border-t md:border-t-0 md:border-l border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-surface-800/50 h-64 md:h-auto shrink-0 animate-fade-in">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-brand-400" />
                <span className="font-display font-semibold text-xs text-gray-900 dark:text-white">Chat</span>
                {chatConnected && <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />}
              </div>
              <button onClick={() => setShowChat(false)} className="md:hidden p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
              {messages.map((msg) => {
                const isMe = msg.sender_username === user?.username;
                if (msg.message_type === "system") {
                  return <div key={msg.id} className="text-center text-gray-500 italic text-[10px] py-0.5">{msg.content}</div>;
                }
                return (
                  <div key={msg.id} className="group">
                    {!isMe && <p className="text-[10px] font-medium text-purple-400 mb-0.5">{msg.sender_username}</p>}
                    <div className={`max-w-[90%] px-3 py-1.5 rounded-xl text-xs break-words ${
                      isMe ? "bg-brand-600/20 text-gray-900 dark:text-white/90 rounded-br-none ml-auto" : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-bl-none"
                    }`} style={{ width: "fit-content" }}>{msg.content}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="flex gap-2 px-3 py-2 border-t border-gray-200 dark:border-white/10 bg-white/30 backdrop-blur-sm shrink-0">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                placeholder="Chat here..." className="input-field text-xs py-1.5 h-8" />
              <button type="submit" className="btn-primary p-2 h-8 w-8 flex items-center justify-center shrink-0">
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
