"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import {
  Play, Pause, Volume2, VolumeX, RotateCcw, AlertCircle,
  ExternalLink, Heart, Eye, MessageCircle, Shield, ShieldOff,
  Search, X, User, RefreshCw, ChevronRight, ChevronLeft,
} from "lucide-react";

/* ============ Types ============ */

interface VideoItem {
  id: string; bvid: string; aid: number; cid: number;
  title: string; author: string; authorMid: number;
  authorFace: string; cover: string;
  playCount: string; likeCount: string; danmakuCount: string;
  duration: string; durationSec: number;
  description: string; pubdate: number;
}

interface ResolvedVideo extends VideoItem {
  videoUrl: string; audioUrl: string | null;
  proxyVideoUrl: string | null; proxyAudioUrl: string | null;
  backupUrl: string | null; proxyBackupUrl: string | null;
  format: "durl" | "dash"; usingProxy: boolean;
}

interface UserProfile {
  mid: number; name: string; face: string; sign: string;
  followerCount: string; videoCount: number;
}

interface CommentItem {
  rpid: number; content: string; author: string;
  authorMid: number; authorFace: string;
  likeCount: number; replyCount: number; createdAt: number;
}

interface SearchResult { results: any[]; source: string; type: string; }

const QN_MAP: Record<number, string> = { 6: "240P", 16: "360P", 32: "480P", 64: "720P", 80: "1080P" };
const QN_OPTIONS = [6, 16, 32, 64, 80];
const DEFAULT_QN = 64;

/* ============ Main Component ============ */

export default function ShortsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ShortsApp />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
    </div>
  );
}

function ShortsApp() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [forceProxy, setForceProxy] = useState(false);
  const [qn, setQn] = useState(DEFAULT_QN);
  const [seed, setSeed] = useState(Date.now());
  const [showControls, setShowControls] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDanmaku, setShowDanmaku] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [rightPanelAnimating, setRightPanelAnimating] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenBvids = useRef<Set<string>>(new Set());
  const retryMap = useRef<Map<number, number>>(new Map());

  const fetchFeed = useCallback(async (s: number, excludeSet: Set<string>) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(videos.length === 0);
    setError("");

    try {
      const ex = Array.from(excludeSet).slice(-30).join(",");
      const res = await fetch(`/api/bili/feed?seed=${s}&size=6&exclude=${ex}`);
      const data = await res.json();
      const list: VideoItem[] = data.videos || [];

      if (list.length > 0) {
        list.forEach((v) => excludeSet.add(v.id));
        setVideos((prev) => {
          const ids = new Set(prev.map((v) => v.id));
          const fresh = list.filter((v) => !ids.has(v.id));
          return [...prev, ...fresh];
        });
        setSeed(data.nextSeed || s + 1);
      } else {
        if (videos.length === 0) setError("暂无新内容，请稍后再试");
      }
    } catch {
      if (videos.length === 0) setError("加载失败，请稍后重试");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [videos.length]);

  const refreshFeed = useCallback(() => {
    const newSeed = Date.now();
    seenBvids.current.clear();
    setVideos([]);
    setActiveIndex(0);
    retryMap.current.clear();
    fetchingRef.current = false;
    fetchFeed(newSeed, new Set());
  }, [fetchFeed]);

  useEffect(() => { fetchFeed(seed, seenBvids.current); }, []);

  useEffect(() => {
    if (activeIndex >= videos.length - 2 && videos.length > 0 && !fetchingRef.current) {
      fetchFeed(seed, seenBvids.current);
    }
  }, [activeIndex, videos.length, seed, fetchFeed]);

  useEffect(() => {
    let wheelAccum = 0;
    const onWheel = (e: WheelEvent) => {
      if (showSearch || showComments || showUserProfile || rightPanelAnimating) return;
      e.preventDefault();
      wheelAccum += e.deltaY;
      if (wheelAccum > 50 && activeIndex < videos.length - 1) {
        wheelAccum = 0;
        setActiveIndex((p) => p + 1);
      } else if (wheelAccum < -50 && activeIndex > 0) {
        wheelAccum = 0;
        setActiveIndex((p) => p - 1);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (showSearch || showComments || showUserProfile || rightPanelAnimating) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); setActiveIndex((p) => Math.min(p + 1, videos.length - 1)); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); setActiveIndex((p) => Math.max(p - 1, 0)); }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey); };
  }, [activeIndex, videos.length, showSearch, showComments, showUserProfile, rightPanelAnimating]);

  const showControlsTemp = () => {
    setShowControls(true);
    if (controlsTimer.current != null) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
  };

  useEffect(() => {
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
    return () => { if (controlsTimer.current != null) clearTimeout(controlsTimer.current); };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const idx = activeIndex;
    const card = containerRef.current.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: "smooth" });
  }, [activeIndex]);

  const activeVideo = videos[activeIndex] || null;

  const openComments = () => {
    setRightPanelAnimating(true);
    setShowComments(true);
    setTimeout(() => setRightPanelAnimating(false), 350);
  };

  const closeComments = () => {
    setRightPanelAnimating(true);
    setShowComments(false);
    setTimeout(() => setRightPanelAnimating(false), 350);
  };

  return (
    <div className="fixed inset-0 bg-black z-40 overflow-hidden" onMouseMove={showControlsTemp} onTouchStart={showControlsTemp}>
      {/* Video cards container */}
      <div ref={containerRef} className="h-full w-full snap-y snap-mandatory scrollbar-none" style={{ scrollSnapType: "y mandatory", overflowY: "hidden" }}>
        {loading && videos.length === 0 ? (
          <div className="snap-start h-full w-full flex items-center justify-center"><LoadingScreen /></div>
        ) : error && videos.length === 0 ? (
          <div className="snap-start h-full w-full flex items-center justify-center">
            <div className="text-center px-6">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white/80 text-sm mb-4">{error}</p>
              <button onClick={refreshFeed} className="px-5 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 flex items-center gap-2 mx-auto">
                <RotateCcw className="w-4 h-4" /> 重新加载
              </button>
            </div>
          </div>
        ) : (
          videos.map((video, index) => {
            const isActive = index === activeIndex;
            const isNearby = Math.abs(index - activeIndex) <= 1;
            return (
              <VideoCard
                key={video.id}
                video={video}
                isActive={isActive}
                isNearby={isNearby}
                muted={muted}
                forceProxy={forceProxy}
                qn={qn}
                onStatusChange={() => {}}
                onRetry={(idx) => retryMap.current.set(idx, (retryMap.current.get(idx) || 0) + 1)}
              />
            );
          })
        )}
      </div>

      {/* Player Overlay */}
      {activeVideo && (
        <PlayerOverlay
          video={activeVideo}
          index={activeIndex}
          muted={muted}
          forceProxy={forceProxy}
          qn={qn}
          playbackRate={playbackRate}
          onRetry={(idx) => retryMap.current.set(idx, (retryMap.current.get(idx) || 0) + 1)}
        />
      )}

      {/* Top bar - controls that auto-hide */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent pt-3 pb-8 px-4 transition-opacity duration-500 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(true)} className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs hover:bg-white/20 flex items-center gap-1.5">
            <Search className="w-3 h-3" /> 搜索
          </button>
          <button onClick={() => setForceProxy(!forceProxy)} className={`px-3 py-1.5 rounded-full backdrop-blur-sm text-xs hover:bg-white/20 flex items-center gap-1.5 ${forceProxy ? "bg-green-500/30 text-green-300" : "bg-white/10 text-white/70"}`}>
            {forceProxy ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
            {forceProxy ? "代理" : "直连"}
          </button>
          <button onClick={refreshFeed} className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs hover:bg-white/20 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> 换一换
          </button>
          <div className="flex gap-1 ml-auto">
            {QN_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => setQn(opt)}
                className={`px-2 py-1 rounded text-[10px] font-medium ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/50 hover:bg-white/20"}`}
              >{QN_MAP[opt]}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side panel: video info + comments */}
      <div className={`fixed top-0 bottom-0 z-50 flex flex-col transition-all duration-300 ease-out ${showComments ? "right-0 w-[380px] max-w-[90vw]" : "-right-[390px] w-[380px] max-w-[90vw]"}`}>
        {/* Panel content */}
        <div className="flex-1 bg-black/80 backdrop-blur-xl border-l border-white/10 overflow-hidden flex flex-col">
          {/* Collapse button */}
          <button onClick={showComments ? closeComments : openComments}
            className="absolute -left-8 top-1/2 -translate-y-1/2 w-7 h-16 bg-black/60 backdrop-blur-sm rounded-l-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80"
          >
            {showComments ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Video info section */}
          {activeVideo && (
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <h2 className="text-white text-sm font-semibold leading-snug mb-2">{activeVideo.title}</h2>
              <button onClick={() => { setShowUserProfile(true); closeComments(); }} className="flex items-center gap-2 mb-3 hover:bg-white/5 rounded-lg p-1.5 -ml-1.5 transition-all w-full text-left">
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                  {activeVideo.authorFace ? <img src={activeVideo.authorFace} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-2 text-white/40" />}
                </div>
                <span className="text-white/80 text-xs font-medium hover:text-white">{activeVideo.author}</span>
              </button>
              <div className="flex items-center gap-4 text-white/50 text-[10px] mb-2">
                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{activeVideo.playCount}</span>
                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{activeVideo.likeCount}</span>
                <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{activeVideo.danmakuCount}</span>
                <span>{activeVideo.duration}</span>
                <button onClick={() => setShowDanmaku(!showDanmaku)} className={`px-1.5 py-0.5 rounded text-[9px] ${showDanmaku ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"} hover:bg-white/20`}>
                  弹{showDanmaku ? "✓" : ""}
                </button>
              </div>
              {activeVideo.description && (
                <p className="text-white/40 text-[11px] leading-relaxed line-clamp-3">{activeVideo.description}</p>
              )}
            </div>
          )}

          {/* Comments section */}
          {activeVideo && (
            <div className="flex-1 overflow-y-auto">
              <CommentList aid={activeVideo.aid} />
            </div>
          )}
        </div>
      </div>

      {/* Open panel indicator when closed */}
      {!showComments && activeVideo && showControls && (
        <button onClick={openComments}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 w-7 h-16 bg-black/40 backdrop-blur-sm rounded-l-xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/60 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Bottom buttons */}
      <div className={`fixed bottom-0 right-0 z-50 flex flex-col items-center gap-3 p-4 transition-opacity duration-500 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"} ${showComments ? "right-[380px]" : "right-0"} transition-all duration-300`}>
        <button onClick={() => setMuted(!muted)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all">
          {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>
        <button onClick={() => showComments ? closeComments() : openComments()} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-white/10 flex flex-col items-center justify-center transition-all">
          <MessageCircle className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Search Drawer */}
      {showSearch && (
        <SearchDrawer
          onClose={() => setShowSearch(false)}
          onSelectVideo={() => setShowSearch(false)}
          onSelectUser={() => setShowSearch(false)}
        />
      )}

      {/* User Profile Overlay */}
      {showUserProfile && activeVideo && (
        <UserProfileOverlay
          mid={activeVideo.authorMid}
          onClose={() => setShowUserProfile(false)}
          onSelectVideo={() => setShowUserProfile(false)}
        />
      )}

      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ============ Video Card (cover only, video is in overlay) ============ */

function VideoCard({ video, isActive, isNearby }: {
  video: VideoItem; isActive: boolean; isNearby: boolean;
  muted: boolean; forceProxy: boolean; qn: number;
  onStatusChange: () => void; onRetry: (idx: number) => void;
}) {
  if (!isNearby && !isActive) {
    return <div className="snap-start h-full w-full bg-black shrink-0" />;
  }
  return (
    <div className="snap-start h-full w-full relative bg-black shrink-0 flex items-center justify-center">
      {isActive ? (
        <div className="absolute inset-0 bg-black" />
      ) : (
        <>
          <img src={video.cover} alt={video.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
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
  );
}

/* ============ Player Overlay (single video element) ============ */

function PlayerOverlay({ video, index, muted, forceProxy, qn, playbackRate, onRetry }: {
  video: VideoItem; index: number; muted: boolean; forceProxy: boolean; qn: number; playbackRate: number;
  onRetry: (idx: number) => void;
}) {
  const [resolved, setResolved] = useState<ResolvedVideo | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "paused" | "error">("loading");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loadSpeedKbps, setLoadSpeedKbps] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [localSpeed, setLocalSpeed] = useState(playbackRate);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastLoadedRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    setResolved(null);
    setStatus("loading");
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setLoadSpeedKbps(0);
    setLoadedBytes(0);
    lastLoadedRef.current = 0;
    lastTimeRef.current = Date.now();

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/shorts/play?bvid=${video.bvid}&qn=${qn}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.videoUrl) {
          const useProxy = forceProxy && data.proxyVideoUrl;
          setResolved({
            ...video,
            videoUrl: useProxy ? data.proxyVideoUrl : data.videoUrl,
            audioUrl: useProxy && data.proxyAudioUrl ? data.proxyAudioUrl : (data.audioUrl || null),
            proxyVideoUrl: data.proxyVideoUrl || null,
            proxyAudioUrl: data.proxyAudioUrl || null,
            backupUrl: data.backupUrl || null,
            proxyBackupUrl: data.proxyBackupUrl || null,
            format: data.format || "durl",
            usingProxy: useProxy,
          });
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [video.bvid, qn, forceProxy]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolved) return;

    v.src = resolved.videoUrl;
    v.playbackRate = localSpeed;
    v.load();
    v.muted = muted || resolved.format === "dash";

    let speedTimer: ReturnType<typeof setInterval> | null = null;

    const onPlaying = () => {
      setStatus("playing");
      if (speedTimer) clearInterval(speedTimer);
      setLoadSpeedKbps(0);
    };
    const onPause = () => setStatus("paused");
    const onError = () => {
      onRetry(index);
      if (resolved.proxyVideoUrl && !resolved.usingProxy) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.proxyVideoUrl!, usingProxy: true } : null);
      } else if (resolved.backupUrl) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.backupUrl!, backupUrl: null } : null);
      } else {
        setStatus("error");
      }
    };
    const onTime = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0); };
    const onProgress = () => {
      if (v.buffered.length > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        setBuffered(end);
      }
    };

    speedTimer = setInterval(() => {
      if (!v.buffered.length) return;
      const now = v.buffered.end(v.buffered.length - 1);
      if (now > 0 && v.duration > 0 && now < v.duration * 0.99) {
        const diff = now - lastLoadedRef.current;
        const elapsed = (Date.now() - lastTimeRef.current) / 1000;
        if (elapsed > 0.5 && diff > 0) {
          setLoadSpeedKbps(Math.round((diff * 8) / elapsed / 1000));
        }
        lastLoadedRef.current = now;
        lastTimeRef.current = Date.now();
      }
    }, 500);

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
      if (speedTimer) clearInterval(speedTimer);
    };
  }, [resolved?.videoUrl, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (v && resolved?.format === "dash") v.muted = muted;
  }, [muted, resolved?.format]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = localSpeed;
  }, [localSpeed]);

  const seek = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const syncAudio = () => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;
    if (Math.abs(a.currentTime - v.currentTime) > 0.3) a.currentTime = v.currentTime;
  };

  if (!resolved) {
    return (
      <div className="fixed inset-0 z-40 pointer-events-none">
        <img src={video.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
          <p className="text-white/50 text-xs">获取播放源...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-contain pointer-events-auto"
        playsInline loop preload="auto" poster={video.cover}
        onClick={togglePlay}
        onTimeUpdate={resolved.format === "dash" ? syncAudio : undefined}
      />
      {resolved.format === "dash" && resolved.audioUrl && (
        <audio ref={audioRef} crossOrigin="anonymous" src={resolved.audioUrl} preload="auto" loop />
      )}

      {/* Progress bar - moved down to bottom */}
      <div className="absolute bottom-8 left-4 right-4 z-50 pointer-events-auto">
        {/* Speed indicator during loading */}
        {loadSpeedKbps > 0 && (
          <div className="flex justify-center mb-1">
            <span className="text-white/40 text-[9px] bg-black/40 px-2 py-0.5 rounded-full">
              {loadSpeedKbps > 1000 ? `${(loadSpeedKbps / 1000).toFixed(1)}Mbps` : `${loadSpeedKbps}Kbps`}
            </span>
          </div>
        )}
        <div className="relative h-1 bg-white/20 rounded-full group hover:h-2 transition-all mb-0.5">
          <div className="absolute left-0 top-0 h-full bg-white/30 rounded-full" style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }} />
          <div className="absolute left-0 top-0 h-full bg-pink-500 rounded-full" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
          <input
            type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between items-center text-white/40 text-[9px]">
          <div className="flex items-center gap-2">
            <span>{fmtTime(currentTime)}</span>
            <span>/ {fmtTime(duration)}</span>
            {/* Speed selector */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setLocalSpeed((s) => { const idx = SPEED_OPTIONS.indexOf(s); return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]; }); }}
                className="bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded text-[9px] text-white/60"
              >
                {localSpeed}x
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay with speed */}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src={video.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
            <p className="text-white/60 text-xs">缓冲中...</p>
            {loadSpeedKbps > 0 && (
              <p className="text-white/40 text-[10px]">
                {loadSpeedKbps > 1000 ? `${(loadSpeedKbps / 1000).toFixed(1)} Mbps` : `${loadSpeedKbps} Kbps`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
          <AlertCircle className="w-10 h-10 text-white/60 mb-3" />
          <p className="text-white/60 text-xs mb-3">播放失败</p>
          <a href={`https://www.bilibili.com/video/${video.bvid}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" /> 在B站观看
          </a>
        </div>
      )}
    </div>
  );
}

/* ============ Comment List (embedded in right panel) ============ */

function CommentList({ aid }: { aid: number }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/bili/comments?aid=${aid}`);
        const data = await res.json();
        setComments(data.comments || []);
        setSource(data.source || "");
      } catch {
        setSource("error");
      } finally {
        setLoading(false);
      }
    })();
  }, [aid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (source === "unavailable" || source === "error") {
    return <p className="text-white/40 text-xs text-center py-12">评论数据暂不可用</p>;
  }

  if (comments.length === 0) {
    return <p className="text-white/40 text-xs text-center py-12">暂无评论</p>;
  }

  return (
    <div className="px-4 pb-4">
      <h3 className="text-white/60 text-[10px] font-medium uppercase tracking-wider mb-3 sticky top-0 bg-black/80 backdrop-blur-sm py-2">热门评论 · {comments.length}条</h3>
      {comments.map((c) => (
        <div key={c.rpid} className="flex gap-2.5 py-2.5 border-b border-white/5">
          <img src={c.authorFace} alt="" className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-white/80 text-[11px] font-medium">{c.author}</span>
              <span className="text-white/30 text-[9px]">{timeAgo(c.createdAt)}</span>
            </div>
            <p className="text-white/65 text-xs leading-relaxed">{c.content}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-white/25 text-[9px] flex items-center gap-0.5"><Heart className="w-2 h-2" />{c.likeCount}</span>
              {c.replyCount > 0 && <span className="text-white/25 text-[9px]">{c.replyCount}条回复</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ Search Drawer ============ */

function SearchDrawer({ onClose, onSelectVideo, onSelectUser }: {
  onClose: () => void;
  onSelectVideo: (bvid: string) => void;
  onSelectUser: (mid: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"video" | "user">("video");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/bili/search?q=${encodeURIComponent(query)}&type=${type}`);
      setResults(await res.json());
    } catch {
      setResults({ results: [], source: "error", type });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm overflow-y-auto">
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder={type === "video" ? "搜索视频标题..." : "搜索用户名/UID..."}
              className="w-full bg-white/10 text-white text-sm rounded-xl px-4 py-2.5 pr-10 outline-none placeholder:text-white/30"
            />
            <Search className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <button onClick={doSearch} className="px-4 py-2 bg-pink-500/80 text-white text-sm rounded-xl hover:bg-pink-500">搜索</button>
          <button onClick={onClose} className="px-3 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 mb-4">
          <button onClick={() => { setType("video"); setResults(null); }} className={`px-3 py-1.5 rounded-full text-xs ${type === "video" ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/50"}`}>搜视频</button>
          <button onClick={() => { setType("user"); setResults(null); }} className={`px-3 py-1.5 rounded-full text-xs ${type === "user" ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/50"}`}>搜用户</button>
        </div>
        {searching && <div className="flex items-center justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>}
        {results && (
          <div className="space-y-2">
            {results.source === "error" && <p className="text-white/50 text-sm text-center py-8">搜索服务暂不可用</p>}
            {results.results.length === 0 && results.source !== "error" && <p className="text-white/50 text-sm text-center py-8">未找到相关内容</p>}
            {results.results.map((item, i) => (
              type === "video" ? (
                <a key={i} href={`https://www.bilibili.com/video/${item.bvid}`} target="_blank" rel="noopener noreferrer" onClick={() => onSelectVideo(item.bvid)}
                  className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-all"
                >
                  <img src={item.cover} alt="" className="w-28 h-20 object-cover rounded-lg flex-shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white/90 text-sm line-clamp-2 mb-1">{item.title}</h3>
                    <p className="text-white/40 text-xs">{item.author} · {item.playCount}播放 · {item.duration}</p>
                  </div>
                </a>
              ) : (
                <button key={i} onClick={() => onSelectUser(item.mid)}
                  className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-all w-full text-left"
                >
                  <img src={item.face} alt="" className="w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white/90 text-sm">{item.name}</h3>
                    <p className="text-white/40 text-xs">{item.followerCount}粉丝 · {item.videoCount}视频</p>
                    {item.sign && <p className="text-white/30 text-[11px] line-clamp-1 mt-0.5">{item.sign}</p>}
                  </div>
                </button>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ User Profile Overlay ============ */

function UserProfileOverlay({ mid, onClose, onSelectVideo }: {
  mid: number; onClose: () => void; onSelectVideo: () => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, vRes] = await Promise.all([
          fetch(`/api/bili/user/${mid}`),
          fetch(`/api/bili/user/${mid}/videos`),
        ]);
        setProfile((await pRes.json()) as UserProfile);
        setVideos(((await vRes.json()) as any).videos || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [mid]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm overflow-y-auto">
      <div className="p-4">
        <button onClick={onClose} className="mb-4 text-white/50 hover:text-white flex items-center gap-1 text-sm"><X className="w-4 h-4" /> 关闭</button>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>
        ) : profile ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <img src={profile.face} alt="" className="w-16 h-16 rounded-full" />
              <div>
                <h2 className="text-white text-lg font-semibold">{profile.name}</h2>
                <p className="text-white/50 text-xs mt-1">{profile.followerCount}粉丝 · {profile.videoCount}视频</p>
                {profile.sign && <p className="text-white/40 text-xs mt-1">{profile.sign}</p>}
              </div>
            </div>
            <h3 className="text-white/80 text-sm font-semibold mb-3">作品列表</h3>
            {videos.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">暂无公开作品</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {videos.map((v) => (
                  <a key={v.id} href={`https://www.bilibili.com/video/${v.bvid}`} target="_blank" rel="noopener noreferrer" onClick={onSelectVideo} className="block rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all">
                    <img src={v.cover} alt={v.title} className="w-full aspect-video object-cover" loading="lazy" />
                    <div className="p-2">
                      <h4 className="text-white/80 text-xs line-clamp-2 mb-1">{v.title}</h4>
                      <p className="text-white/30 text-[10px]">{v.playCount}播放 · {v.duration}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-white/40 text-sm text-center py-8">用户信息获取失败</p>
        )}
      </div>
    </div>
  );
}

/* ============ Helpers ============ */

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}
