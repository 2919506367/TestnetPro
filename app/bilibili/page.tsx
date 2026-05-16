"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Play, RefreshCw, Search, X, Loader2,
  Eye, Heart, ArrowLeft,
} from "lucide-react";
import { proxyUrl } from "@/lib/bilibili";
import VideoGrid from "./components/VideoGrid";
import VideoPlayerModal from "./components/VideoPlayerModal";

interface VideoItem {
  id: string; bvid: string; aid: number; cid: number;
  title: string; author: string; authorMid: number;
  authorFace: string; cover: string;
  playCount: string; likeCount: string; danmakuCount: string;
  duration: string; durationSec: number;
  description: string; pubdate: number;
}

interface PlayVideo {
  bvid: string; aid: number; cid: number;
  title: string; author: string; authorFace: string; cover: string;
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-[#0a0a0a]">
      <div className="w-8 h-8 rounded-full border-3 border-gray-300 border-t-gray-600 dark:border-white/20 dark:border-t-white animate-spin" />
    </div>
  );
}

export default function BilibiliPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BilibiliApp />
    </Suspense>
  );
}

function BilibiliApp() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [playingVideo, setPlayingVideo] = useState<PlayVideo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUserProfile, setShowUserProfile] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"video" | "user">("video");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [forceProxy, setForceProxy] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, t: string, p: number, append: boolean) => {
    if (!q.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/bili/search?q=${encodeURIComponent(q)}&type=${t}&page=${p}`);
      const data = await res.json();
      if (append) {
        setSearchResults((prev) => [...prev, ...(data.results || [])]);
      } else {
        setSearchResults(data.results || []);
      }
      setSearchHasMore(data.results?.length >= 15);
    } catch {
      if (!append) setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      setShowSearch(true);
      setSearchPage(1);
      doSearch(val, searchType, 1, false);
    } else {
      setShowSearch(false);
      setSearchResults([]);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const q = searchQuery.trim();
      if (q) {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        setShowSearch(true);
        setSearchPage(1);
        doSearch(q, searchType, 1, false);
      }
    }
  };

  const handleLoadMoreSearch = () => {
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    doSearch(searchQuery, searchType, nextPage, true);
  };

  const handlePlayFromGrid = (video: VideoItem) => {
    setPlayingVideo({
      bvid: video.bvid, aid: video.aid, cid: video.cid,
      title: video.title, author: video.author,
      authorFace: video.authorFace, cover: video.cover,
    });
  };

  const handlePlayFromSearch = (v: PlayVideo) => {
    setPlayingVideo(v);
  };

  const handleViewUser = (mid: number) => {
    setShowUserProfile(mid);
  };

  const bg = dark ? "bg-[#0a0a0a]" : "bg-[#f4f5f7]";
  const searchBg = dark ? "bg-[#1f1f1f]" : "bg-white";
  const searchInputBg = dark ? "bg-[#2a2a2a]" : "bg-gray-100";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-white/50" : "text-gray-500";
  const borderColor = dark ? "border-white/10" : "border-gray-200";
  const cardBg = dark ? "bg-[#1f1f1f] hover:bg-[#2a2a2a]" : "bg-white hover:bg-gray-50";
  const tabActive = dark ? "bg-pink-500/20 text-pink-400" : "bg-pink-50 text-pink-600";
  const tabInactive = dark ? "text-white/50 hover:bg-white/5" : "text-gray-500 hover:bg-gray-50";

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Search bar - B站 style */}
      <div className={`${searchBg} border-b ${borderColor} px-4 py-3`}>
        <div className="max-w-3xl mx-auto">
          {showSearch && (
            <button
              onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }}
              className={`mb-2 flex items-center gap-1 text-sm ${textSecondary} hover:${textPrimary}`}
            >
              <ArrowLeft className="w-4 h-4" /> 返回首页
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索视频..."
                className={`w-full ${searchInputBg} ${textPrimary} placeholder:text-white/30 dark:placeholder:text-white/30 placeholder:text-gray-400 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all focus:ring-2 ${dark ? "focus:ring-pink-500/50" : "focus:ring-pink-400/50"}`}
              />
              {searchLoading ? (
                <Loader2 className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 animate-spin ${textSecondary}`} />
              ) : (
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
              )}
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setShowSearch(false); setSearchResults([]); }}
                  className={`absolute right-12 top-1/2 -translate-y-1/2 ${textSecondary} hover:text-pink-400`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  const q = searchQuery.trim();
                  if (q) { setShowSearch(true); setSearchPage(1); doSearch(q, searchType, 1, false); }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1 rounded-lg"
              >
                搜索
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSearch ? (
        /* Search results page */
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSearchType("video")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${searchType === "video" ? tabActive : tabInactive}`}
            >
              视频
            </button>
            <button
              onClick={() => setSearchType("user")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${searchType === "user" ? tabActive : tabInactive}`}
            >
              用户
            </button>
          </div>

          {searchLoading && searchResults.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className={`w-6 h-6 animate-spin ${textSecondary}`} />
            </div>
          ) : searchResults.length === 0 ? (
            <p className={`text-center py-16 ${textSecondary}`}>未找到相关内容</p>
          ) : searchType === "video" ? (
            <div className="space-y-3">
              {searchResults.map((item: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    handlePlayFromSearch({
                      bvid: item.bvid, aid: item.aid, cid: item.cid,
                      title: item.title, author: item.author,
                      authorFace: item.authorFace, cover: item.cover,
                    });
                  }}
                  className={`flex gap-3 p-2 rounded-xl ${dark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-all w-full text-left`}
                >
                  <div className="relative flex-shrink-0 w-44 h-28 sm:w-56 sm:h-32 rounded-lg overflow-hidden bg-gray-700">
                    <img
                      src={proxyUrl(item.cover)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {item.duration}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className={`${textPrimary} text-sm sm:text-base line-clamp-2 leading-snug font-medium`}>
                      {item.title}
                    </h3>
                    <p className={`${textSecondary} text-xs mt-1.5`}>
                      {item.author} · {item.playCount}播放
                    </p>
                    {item.description && (
                      <p className={`${textSecondary} text-xs mt-1 line-clamp-2`}>{item.description}</p>
                    )}
                  </div>
                </button>
              ))}
              {searchHasMore && !searchLoading && (
                <div className="flex justify-center py-4">
                  <button onClick={handleLoadMoreSearch}
                    className={`px-6 py-2 rounded-full text-sm ${dark ? "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                  >
                    加载更多
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((item: any, i: number) => (
                <button
                  key={i}
                  onClick={() => handleViewUser(item.mid)}
                  className={`flex gap-3 p-3 rounded-xl ${dark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-all w-full text-left`}
                >
                  <img src={proxyUrl(item.face)} alt="" className="w-12 h-12 rounded-full flex-shrink-0 bg-gray-300" />
                  <div className="flex-1 min-w-0">
                    <h3 className={`${textPrimary} text-sm font-medium`}>{item.name}</h3>
                    <p className={`${textSecondary} text-xs mt-0.5`}>
                      {item.followerCount}粉丝 · {item.videoCount}视频
                    </p>
                    {item.sign && (
                      <p className={`${textSecondary} text-[11px] line-clamp-1 mt-0.5`}>{item.sign}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Home page content */
        <div className="max-w-[1600px] mx-auto">
          {/* Video recommendation grid */}
          <VideoGrid
            onPlayVideo={handlePlayFromGrid}
            refreshTrigger={refreshTrigger}
            dark={dark}
          />

          {/* Shorts section - embedded original vertical scroll */}
          <div className={`px-4 sm:px-6 pb-2 ${dark ? "bg-[#141414]" : "bg-[#f4f5f7]"}`}>
            <div className={`flex items-center gap-3 mb-3 ${dark ? "border-t border-white/5" : "border-t border-gray-200"} pt-6`}>
              <h2 className={`text-lg font-bold ${textPrimary}`}>短视频</h2>
              <span className={`text-xs ${textSecondary}`}>上下滚动切换</span>
            </div>
          </div>
          <div className={`${dark ? "bg-[#141414]" : "bg-[#f4f5f7]"} pb-8`}>
            <div className="max-w-[480px] mx-auto" style={{ height: "85vh" }}>
              <ShortsEmbed />
            </div>
          </div>

          {/* Load more video cards */}
          <div className={`px-4 sm:px-6 pb-8 ${dark ? "bg-[#141414]" : "bg-[#f4f5f7]"}`}>
            <VideoGridMore
              onPlayVideo={handlePlayFromGrid}
              refreshTrigger={refreshTrigger}
              dark={dark}
            />
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
          dark={dark}
        />
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <UserProfileModal
          mid={showUserProfile}
          onClose={() => setShowUserProfile(null)}
          onPlayVideo={(v) => { setPlayingVideo(v); setShowUserProfile(null); }}
          dark={dark}
        />
      )}
    </div>
  );
}

function ShortsEmbed() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);
  const seedRef = useRef(Date.now());
  const seenBvids = useRef<Set<string>>(new Set());
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "paused" | "error">("loading");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [resolved, setResolved] = useState<{
    videoUrl: string; audioUrl: string | null;
    proxyVideoUrl: string | null; proxyAudioUrl: string | null;
    backupUrl: string | null; proxyBackupUrl: string | null;
    format: "durl" | "dash"; usingProxy: boolean;
  } | null>(null);
  const [forceProxy, setForceProxy] = useState(false);
  const [qn, setQn] = useState(64);

  const fetchFeed = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const ex = Array.from(seenBvids.current).slice(-30).join(",");
      const res = await fetch(`/api/bili/feed?seed=${seedRef.current}&size=5&exclude=${ex}`);
      const data = await res.json();
      const list: VideoItem[] = data.videos || [];
      list.forEach((v) => seenBvids.current.add(v.id));
      setVideos(list);
      setActiveIndex(0);
      seedRef.current = data.nextSeed || seedRef.current + 1;
    } catch {} finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  useEffect(() => {
    let wheelAccum = 0;
    const onWheel = (e: WheelEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return;
      e.preventDefault();
      wheelAccum += e.deltaY;
      if (wheelAccum > 60 && activeIndex < videos.length - 1) {
        wheelAccum = 0; setActiveIndex((p) => p + 1);
      } else if (wheelAccum < -60 && activeIndex > 0) {
        wheelAccum = 0; setActiveIndex((p) => p - 1);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [activeIndex, videos.length]);

  useEffect(() => {
    if (!containerRef.current) return;
    const card = containerRef.current.children[activeIndex] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: "smooth" });
  }, [activeIndex]);

  useEffect(() => { setShowControls(true); controlsTimer.current = setTimeout(() => setShowControls(false), 4000); return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); }; }, []);

  const showControlsTemp = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
  };

  useEffect(() => {
    const video = videos[activeIndex];
    if (!video) return;
    setResolved(null); setStatus("loading"); setCurrentTime(0);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/shorts/play?bvid=${video.bvid}&qn=${qn}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.videoUrl) {
          const useProxy = forceProxy && data.proxyVideoUrl;
          setResolved({
            videoUrl: useProxy ? data.proxyVideoUrl : data.videoUrl,
            audioUrl: useProxy && data.proxyAudioUrl ? data.proxyAudioUrl : (data.audioUrl || null),
            proxyVideoUrl: data.proxyVideoUrl || null,
            proxyAudioUrl: data.proxyAudioUrl || null,
            backupUrl: data.backupUrl || null,
            proxyBackupUrl: data.proxyBackupUrl || null,
            format: data.format || "durl",
            usingProxy: useProxy,
          });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [activeIndex, videos, qn, forceProxy]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolved) return;
    v.src = resolved.videoUrl;
    v.load();
    v.muted = muted || resolved.format === "dash";
    const onPlaying = () => setStatus("playing");
    const onPause = () => setStatus("paused");
    const onError = () => {
      if (resolved.proxyVideoUrl && !resolved.usingProxy) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.proxyVideoUrl!, usingProxy: true } : null);
      } else if (resolved.backupUrl) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.backupUrl!, backupUrl: null } : null);
      } else { setStatus("error"); }
    };
    const onTime = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0); };
    const onProgress = () => { if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1)); };
    const onLoaded = () => { v.play().catch(() => {}); };
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onError);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("progress", onProgress);
    v.addEventListener("loadedmetadata", onLoaded);
    return () => {
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onError);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [resolved?.videoUrl, muted]);

  const syncAudio = () => {
    const v = videoRef.current; const a = audioRef.current;
    if (!v || !a) return;
    if (Math.abs(a.currentTime - v.currentTime) > 0.3) a.currentTime = v.currentTime;
  };

  const QN_OPTIONS = [6, 16, 32, 64, 80];
  const QN_MAP: Record<number, string> = { 6: "240P", 16: "360P", 32: "480P", 64: "720P", 80: "1080P" };

  if (loading) {
    return (
      <div className="w-full h-full bg-black rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  const activeVideo = videos[activeIndex];

  return (
    <div className="w-full h-full bg-black rounded-2xl overflow-hidden relative" onMouseMove={showControlsTemp}>
      <div ref={containerRef} className="h-full w-full" style={{ scrollSnapType: "y mandatory", overflowY: "hidden" }}>
        {videos.map((video, index) => (
          <div key={video.id} className="h-full w-full snap-start relative bg-black shrink-0 flex items-center justify-center">
            {index === activeIndex ? (
              <div className="absolute inset-0 bg-black" />
            ) : (
              <>
                <img src={proxyUrl(video.cover)} alt={video.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white/70" />
                </div>
                <div className="absolute bottom-20 left-4 right-4">
                  <h2 className="text-white/90 text-sm font-semibold line-clamp-1">{video.title}</h2>
                  <p className="text-white/50 text-xs mt-1">@{video.author} · {video.duration}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {activeVideo && resolved && (
        <>
          <video
            ref={videoRef}
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-contain"
            playsInline loop preload="auto"
            poster={proxyUrl(activeVideo.cover)}
            onClick={() => {
              const v = videoRef.current;
              if (v) { if (v.paused) v.play().catch(() => {}); else v.pause(); }
            }}
            onTimeUpdate={resolved.format === "dash" ? syncAudio : undefined}
          />
          {resolved.format === "dash" && resolved.audioUrl && (
            <audio ref={audioRef} crossOrigin="anonymous" src={resolved.audioUrl} preload="auto" loop />
          )}
        </>
      )}

      {/* Top controls */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-3 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <h3 className="text-white text-sm font-medium line-clamp-1">{activeVideo?.title}</h3>
        <p className="text-white/60 text-xs mt-0.5">@{activeVideo?.author} · {activeVideo?.duration}</p>
      </div>

      {/* Bottom controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-3 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setMuted(!muted)} className={`p-1.5 rounded-full ${muted ? "bg-white/20" : "bg-white/10 hover:bg-white/20"}`}>
            {muted ? <span className="text-white text-[10px] px-1">🔇</span> : <span className="text-white text-[10px] px-1">🔊</span>}
          </button>
          <button onClick={() => setForceProxy(!forceProxy)} className={`px-2 py-1 rounded text-[9px] ${forceProxy ? "bg-green-500/30 text-green-300" : "bg-white/10 text-white/40"}`}>
            {forceProxy ? "代理" : "直连"}
          </button>
          {QN_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setQn(opt)}
              className={`px-1.5 py-0.5 rounded text-[9px] ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}
            >{QN_MAP[opt]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoGridMore({
  onPlayVideo, refreshTrigger, dark,
}: {
  onPlayVideo: (video: VideoItem) => void;
  refreshTrigger: number;
  dark: boolean;
}) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const seenBvids = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const ex = Array.from(seenBvids.current).slice(-50).join(",");
        const res = await fetch(`/api/bili/feed?seed=${Date.now()}&size=12&exclude=${ex}`);
        const data = await res.json();
        const list: VideoItem[] = data.videos || [];
        list.forEach((v) => seenBvids.current.add(v.id));
        setVideos(list);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [refreshTrigger]);

  const bg = dark ? "bg-[#141414]" : "bg-[#f4f5f7]";
  const cardBg = dark ? "bg-[#1f1f1f] hover:bg-[#2a2a2a]" : "bg-white hover:bg-gray-50";
  const textPrimary = dark ? "text-white/90" : "text-gray-900";
  const textSecondary = dark ? "text-white/50" : "text-gray-500";

  if (loading) return null;

  return (
    <div className={`${bg} p-4 sm:p-6`}>
      <h2 className={`text-lg font-bold ${textPrimary} mb-4`}>更多推荐</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            onClick={() => onPlayVideo(video)}
            className={`${cardBg} rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm ${dark ? "shadow-black/20" : "shadow-gray-200/50"} group`}
          >
            <div className="aspect-video relative overflow-hidden">
              <img
                src={proxyUrl(video.cover)}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-90 transition-all drop-shadow-lg" />
              </div>
              <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                {video.duration}
              </span>
            </div>
            <div className="p-3">
              <h3 className={`text-sm font-medium line-clamp-2 mb-1.5 leading-snug ${textPrimary}`}>
                {video.title}
              </h3>
              <div className={`flex items-center gap-3 text-[11px] ${textSecondary}`}>
                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {video.playCount}</span>
                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {video.likeCount}</span>
                <span>{video.duration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserProfileModal({
  mid, onClose, onPlayVideo, dark,
}: {
  mid: number; onClose: () => void; onPlayVideo: (v: PlayVideo) => void; dark: boolean;
}) {
  const [profile, setProfile] = useState<{ mid: number; name: string; face: string; sign: string; followerCount: string; videoCount: number } | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, vRes] = await Promise.all([
          fetch(`/api/bili/user/${mid}`),
          fetch(`/api/bili/user/${mid}/videos`),
        ]);
        setProfile(await pRes.json());
        setVideos(((await vRes.json()) as any).videos || []);
      } catch {} finally { setLoading(false); }
    })();
  }, [mid]);

  const overlayBg = dark ? "bg-black/95" : "bg-white/98";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-white/50" : "text-gray-500";
  const cardBg = dark ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100";
  const closeBtn = dark ? "text-white/50 hover:text-white" : "text-gray-500 hover:text-gray-700";

  return (
    <div className={`fixed inset-0 z-[80] ${overlayBg} backdrop-blur-sm overflow-y-auto`}>
      <div className="max-w-3xl mx-auto p-4">
        <button onClick={onClose} className={`mb-4 flex items-center gap-1 text-sm ${closeBtn}`}>
          ← 返回
        </button>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className={`w-6 h-6 rounded-full border-2 border-t-transparent animate-spin ${dark ? "border-white/20 border-t-white" : "border-gray-300 border-t-gray-600"}`} />
          </div>
        ) : profile ? (
          <>
            <div className="flex items-center gap-4 mb-6">
              <img src={proxyUrl(profile.face)} alt="" className="w-16 h-16 rounded-full bg-gray-300" />
              <div>
                <h2 className={`text-lg font-semibold ${textPrimary}`}>{profile.name}</h2>
                <p className={`text-xs mt-1 ${textSecondary}`}>{profile.followerCount}粉丝 · {profile.videoCount}视频</p>
                {profile.sign && <p className={`text-xs mt-1 ${textSecondary}`}>{profile.sign}</p>}
              </div>
            </div>
            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>作品列表</h3>
            {videos.length === 0 ? (
              <p className={`text-sm text-center py-8 ${textSecondary}`}>暂无公开作品</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {videos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onPlayVideo({
                      bvid: v.bvid, aid: v.aid, cid: v.cid,
                      title: v.title, author: v.author,
                      authorFace: v.authorFace, cover: v.cover,
                    })}
                    className={`${cardBg} rounded-xl overflow-hidden transition-all text-left w-full`}
                  >
                    <div className="aspect-video overflow-hidden">
                      <img src={proxyUrl(v.cover)} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-2">
                      <h4 className={`text-xs line-clamp-2 mb-1 ${textPrimary}`}>{v.title}</h4>
                      <p className={`text-[10px] ${textSecondary}`}>{v.playCount}播放 · {v.duration}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className={`text-sm text-center py-8 ${textSecondary}`}>用户信息获取失败</p>
        )}
      </div>
    </div>
  );
}
