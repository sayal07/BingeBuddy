import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Plus, LogIn, Loader2, Tv, Users, Clock, Send, Play,
  Film, Star, Sparkles, ChevronDown, ChevronUp, Globe, Calendar,
  Clapperboard, RefreshCw, Search, X
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

/* ═══════════════════════════════════════════════
   Movie Explorer AI Component
   ═══════════════════════════════════════════════ */
function MovieExplorer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);
    setIsExpanded(true);
    const history = messages.map((m) => ({
      role: m.role,
      content: m.role === "user" ? m.content : (m.data?.message || m.content || ""),
    }));
    try {
      const res = await api.post("/explorer/recommend/", { message: userMsg, history });
      let parsed = res.data;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { parsed = { message: parsed, movies: [] }; }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: parsed.message || "", data: parsed }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to get recommendations.";
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg, data: null }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Movies like Interstellar but darker",
    "Feel-good Korean movies",
    "Best underrated thrillers of 2020s",
    "Something like Breaking Bad but as a movie",
  ];

  return (
    <div className="card border-purple-500/20 animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)" }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white">Movie Explorer AI</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Describe a vibe, get perfect recommendations</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </div>

      {isExpanded && (
        <div className="mt-4">
          <div className="max-h-[480px] min-h-[120px] overflow-y-auto space-y-4 mb-4 pr-1">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))" }}>
                  <Film className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">What are you in the mood for?</p>
                  <p className="text-gray-500 text-sm mt-1">Describe a movie you love, a vibe or what you're feeling</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {quickPrompts.map((p) => (
                    <button key={p} onClick={() => setInput(p)}
                      className="text-xs rounded-full px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-600/20 hover:text-purple-700 dark:hover:text-purple-300 transition-all border border-gray-200 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/30">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-brand-600/20 text-gray-900 dark:text-white/90 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">{msg.content}</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {msg.content && (
                      <div className="flex gap-2">
                        <div className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center mt-0.5"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-gray-100 dark:bg-white/5 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 italic max-w-[90%]">{msg.content}</div>
                      </div>
                    )}
                    {msg.data?.movies?.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9">
                        {msg.data.movies.map((movie, mIdx) => (
                          <div key={mIdx}
                            className="group relative bg-gray-50 dark:bg-surface-800/80 rounded-xl border border-gray-200 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/30 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors leading-tight">{movie.title}</h3>
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0 bg-gray-100 dark:bg-white/5 rounded-md px-1.5 py-0.5">
                                <Calendar className="w-2.5 h-2.5" />{movie.year}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                              <span className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 bg-purple-100 dark:bg-purple-600/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/10">
                                <Clapperboard className="w-2.5 h-2.5" /> {movie.genre}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 bg-blue-100 dark:bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/10">
                                <Globe className="w-2.5 h-2.5" /> {movie.language}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{movie.reason}</p>
                            {movie.streamingHint && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <Star className="w-2.5 h-2.5" /><span>{movie.streamingHint}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                <div className="bg-gray-100 dark:bg-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />Finding the perfect movies...
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Try us, BingeBuddy?" className="input-field text-sm py-2.5" disabled={isLoading} />
            <button type="submit" disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-30 text-white"
              style={{ background: input.trim() && !isLoading ? "linear-gradient(135deg, #7c3aed, #ec4899)" : "rgba(156,163,175,0.3)" }}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════
   Video Card — YouTube thumbnail card
   ═══════════════════════════════════════════════ */
function VideoCard({ video, onClick, isCreating }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group cursor-pointer select-none" onClick={() => !isCreating && onClick(video)}>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 ring-1 ring-gray-200 dark:ring-white/5 group-hover:ring-brand-500/30 transition-all duration-300">
        {!imgError && video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-surface-800 dark:to-surface-900">
            <Film className="w-10 h-10 text-gray-400 dark:text-gray-600 mb-2" />
            <p className="text-xs text-gray-500 font-medium text-center px-4 line-clamp-2">{video.title}</p>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          {isCreating ? (
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center animate-pulse">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-600/90 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-brand-600/40 transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
            </div>
          )}
        </div>
        {/* Watch Party label */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="text-[11px] font-semibold text-white text-center bg-brand-600/90 backdrop-blur-sm rounded-lg py-1.5 px-3 shadow-lg">
            Start Watch Party
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="mt-3 flex gap-3 px-0.5">
        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/30 flex items-center justify-center text-xs font-bold text-red-500 dark:text-red-300 ring-1 ring-gray-200 dark:ring-white/5 mt-0.5">
          {video.channel?.[0]?.toUpperCase() || "Y"}
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-sm text-gray-900 dark:text-white/90 leading-snug line-clamp-2 group-hover:text-brand-500 dark:group-hover:text-brand-300 transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 truncate">{video.channel}</p>
          {video.description && (
            <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5 line-clamp-1">{video.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════
   YouTube Feed — real playable videos
   ═══════════════════════════════════════════════ */
function YouTubeFeed() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [creatingRoom, setCreatingRoom] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const suggestRef = useRef(null);
  const searchWrapperRef = useRef(null);

  const genres = [
    { label: "All", query: "" },
    { label: "Action", query: "full action movie of all languages" },
    { label: "Comedy", query: "full comedy movie english/hindi" },
    { label: "Drama", query: "full drama movie english/hindi" },
    { label: "Horror", query: "full horror movie english/hindi" },
    { label: "Sci-Fi", query: "full sci-fi movie english/hindi" },
    { label: "Thriller", query: "full thriller movie english/hindi" },
    { label: "Animation", query: "full animation movie" },
    { label: "Documentary", query: "full documentary hindi/english" },
  ];

  const fetchVideos = useCallback(async (query = "", duration = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (duration) params.set("duration", duration);
      const qs = params.toString();
      const res = await api.get(`/explorer/movies/${qs ? "?" + qs : ""}`);
      setVideos(res.data.videos || []);
      if (res.data.videos?.length === 0 && query) {
        setError(`No videos found for "${query}"`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load videos");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 5 minutes
  useEffect(() => {
    fetchVideos();
    const interval = setInterval(() => fetchVideos(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchVideos]);

  // Debounced video search (500ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput.trim()) {
        setActiveGenre("");
        fetchVideos(searchInput.trim());
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput, fetchVideos]);

  // Fetch suggestions as user types (200ms debounce)
  useEffect(() => {
    if (suggestRef.current) clearTimeout(suggestRef.current);
    if (searchInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    suggestRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/explorer/suggest/?q=${encodeURIComponent(searchInput.trim())}`);
        setSuggestions(res.data.suggestions || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => { if (suggestRef.current) clearTimeout(suggestRef.current); };
  }, [searchInput]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion) => {
    setSearchInput(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveGenre("");
    fetchVideos(suggestion);
  };

  const handleGenreClick = (genre) => {
    setActiveGenre(genre.label);
    setSearchInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    fetchVideos(genre.query, genre.query ? "long" : "");
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveGenre("All");
    fetchVideos();
  };

  const handleVideoClick = async (video) => {
    if (creatingRoom) return;
    setCreatingRoom(video.video_id);
    try {
      const res = await api.post("/rooms/create/", {
        name: (video.title || "Watch Party").substring(0, 100),
        video_url: video.video_url,
        video_title: video.title || "",
      });
      // Record watch history
      api.post("/explorer/record-watch/", {
        video_url: video.video_url,
        video_id: video.video_id,
        video_title: video.title,
        category: activeGenre || "General",
      }).catch(() => { });
      toast.success("Watch party created! 🎬");
      navigate(`/room/${res.data.room.code}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create watch party");
      setCreatingRoom(null);
    }
  };

  return (
    <div className="mt-10 animate-slide-up" style={{ animationDelay: "0.3s" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)" }}>
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white">Recommended For You</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Search or pick a genre, click any video to start a watch party</p>
          </div>
        </div>
      </div>

      {/* Search with Suggestions */}
      <form onSubmit={(e) => { e.preventDefault(); fetchVideos(searchInput); }} className="relative mb-5" ref={searchWrapperRef}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 z-10" />
        <input type="text" value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder='Search'
          className="w-full bg-gray-100 dark:bg-surface-700/50 border border-gray-200 dark:border-white/10 rounded-xl pl-11 pr-24 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all" />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {searchInput && (
            <button type="button" onClick={handleClearSearch}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg transition-all shadow-lg shadow-brand-600/20 active:scale-95">
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-800 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/40 z-50">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 shrink-0" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Genre Chips */}
      <div className="flex gap-2 mb-7 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {genres.map((g) => (
          <button key={g.label} onClick={() => handleGenreClick(g)}
            className={`text-xs font-medium px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${activeGenre === g.label
              ? "bg-gray-900 dark:bg-white text-white dark:text-surface-900 shadow-lg shadow-gray-900/10 dark:shadow-white/10 font-semibold"
              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/5"
              }`}>
            <span className="text-sm">{g.icon}</span>{g.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-16 card">
          <Search className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4 opacity-40" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{error}</p>
          <button onClick={() => fetchVideos(searchInput || "")}
            className="mt-4 text-sm text-brand-400 hover:text-brand-300 bg-brand-600/10 hover:bg-brand-600/20 px-4 py-2 rounded-lg transition-all">
            Try again
          </button>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-white/[0.03] rounded-xl" />
              <div className="mt-3 flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-white/[0.03] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-white/[0.03] rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-white/[0.03] rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Grid */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((v, i) => (
            <VideoCard key={`${v.video_id}-${i}`} video={v} onClick={handleVideoClick}
              isCreating={creatingRoom === v.video_id} />
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════
   Main Dashboard Page
   ═══════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState({ create: false, join: false });
  const [pendingCode, setPendingCode] = useState(null);
  const pollRef = useRef(null);

  // Refresh subscription status on mount so stale sessionStorage data is updated
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = useCallback((code) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/rooms/${code}/request-status/`);
        const { status: s, message } = res.data;
        if (s === "accepted") {
          clearInterval(pollRef.current); pollRef.current = null; setPendingCode(null);
          toast.success("Host accepted! Joining room...");
          navigate(`/room/${code}`);
        } else if (s === "rejected") {
          clearInterval(pollRef.current); pollRef.current = null; setPendingCode(null);
          toast.error(message || "Host denied your request.");
        } else if (s === "blocked") {
          clearInterval(pollRef.current); pollRef.current = null; setPendingCode(null);
          toast.error(message || "You've been blocked from this room.");
        }
      } catch {
        clearInterval(pollRef.current); pollRef.current = null; setPendingCode(null);
      }
    }, 2000);
  }, [navigate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading((l) => ({ ...l, create: true }));
    try {
      const res = await api.post("/rooms/create/", { name: roomName || "Watch Party" });
      toast.success(`Room created! Code: ${res.data.room.code}`);
      navigate(`/room/${res.data.room.code}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create room.");
    } finally {
      setLoading((l) => ({ ...l, create: false }));
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (joinCode.length !== 8) return toast.error("Room code must be 8 characters.");
    setLoading((l) => ({ ...l, join: true }));
    try {
      const res = await api.post("/rooms/join/", { code: joinCode.toUpperCase() });
      if (res.status === 202) {
        const code = joinCode.toUpperCase();
        setPendingCode(code);
        startPolling(code);
        toast("Join request sent! Waiting for host...", { icon: "⏳", duration: 4000 });
      } else {
        navigate(`/room/${joinCode.toUpperCase()}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to join room.");
    } finally {
      setLoading((l) => ({ ...l, join: false }));
    }
  };

  const cancelPending = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null; setPendingCode(null);
    toast("Request cancelled.", { icon: "✖" });
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Greeting */}
        <div className="mb-10 animate-fade-in">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Hey, {user?.username}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Create a new watch party or join an existing one.</p>
        </div>

        {/* Trial Banner */}
        {user?.is_trial_active && !user?.is_subscribed && (
          <div className={`mb-6 rounded-xl border px-5 py-3 flex items-center justify-between animate-fade-in ${
            user.trial_days_remaining <= 3
              ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
              : "bg-brand-50 dark:bg-brand-600/10 border-brand-200 dark:border-brand-500/20"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">⏳</span>
              <div>
                <p className={`text-sm font-semibold ${
                  user.trial_days_remaining <= 3 ? "text-red-600 dark:text-red-400" : "text-brand-600 dark:text-brand-400"
                }`}>
                  {user.trial_days_remaining} day{user.trial_days_remaining !== 1 ? "s" : ""} left in your free trial
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Subscribe to keep access to all features after your trial ends.
                </p>
              </div>
            </div>
            <Link to="/subscribe"
              className="btn-primary text-xs px-4 py-2 shrink-0">
              Subscribe Now
            </Link>
          </div>
        )}

        {/* Pending Banner */}
        {pendingCode && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl px-5 py-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Waiting for host approval...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Room: <span className="font-mono">{pendingCode}</span></p>
              </div>
            </div>
            <button onClick={cancelPending} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
          </div>
        )}

        {/* Create / Join */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <form onSubmit={handleCreate} className="card border-brand-500/20 space-y-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-brand-600/15 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-brand-400" />
              </div>
              <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white">Create Room</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Start a new watch party and invite friends with a unique room code.</p>
            <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="input-field" placeholder="Room name (optional)" />
            <button type="submit" disabled={loading.create} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading.create ? <Loader2 className="w-5 h-5 animate-spin" /> : <Tv className="w-5 h-5" />}
              {loading.create ? "Creating..." : "Create Watch Party"}
            </button>
          </form>

          <form onSubmit={handleJoin} className="card border-gray-200 dark:border-white/10 space-y-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-600/15 rounded-xl flex items-center justify-center">
                <LogIn className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white">Join Room</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Enter an 8-character room code to join a friend's watch party.</p>
            <input type="text" value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
              maxLength={8} className="input-field text-center font-mono text-lg tracking-widest" placeholder="ABCD1234" />
            <button type="submit" disabled={loading.join || joinCode.length !== 8 || !!pendingCode}
              className="btn-secondary w-full flex items-center justify-center gap-2">
              {loading.join ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
              {loading.join ? "Joining..." : pendingCode ? "Request Pending..." : "Join Watch Party"}
            </button>
          </form>
        </div>

        {/* Movie Explorer AI */}
        <MovieExplorer />

        {/* YouTube Video Feed */}
        <YouTubeFeed />
      </div>
    </div>
  );
}


