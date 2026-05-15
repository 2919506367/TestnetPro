"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import {
  Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown,
  RotateCcw, AlertCircle, ExternalLink, Heart, Eye, Settings, Shield, ShieldOff,
} from "lucide-react";

interface VideoItem {
  id: string;
  bvid: string;
  title: string;
  author: string;
  authorFace: string;
  cover: string;
  playCount: string;
  likeCount: string;
  duration: string;
  durationSec: number;
  description: string;
  pubdate: number;
  shortLink: string;
  source: string;
}

interface ResolvedVideo extends VideoItem {
  videoUrl: string;
  audioUrl: string | null;
  backupUrl: string | null;
  proxyVideoUrl: string | null;
  proxyAudioUrl: string | null;
  proxyBackupUrl: string | null;
  format: "durl" | "dash";
  qn: number;
  qnLabel: string;
  qualities: { qn: number; label: string; active: boolean }[];
  usingProxy: boolean;
}

const QN_OPTIONS = [6, 16, 32, 64, 80];
const QN_LABEL: Record<number, string> = { 6: "240P", 16: "360P", 32: "480P", 64: "720P", 80: "1080P" };

function ShortsContent() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [resolvedMap, setResolvedMap] = useState<Map<number, ResolvedVideo>>(new Map());
  const [statusMap, setStatusMap] = useState<Map<number, "loading" | "playing" | "paused" | "error">>(new Map());
  const [qn, setQn] = useState(64);
  const [showQnPicker, setShowQnPicker] = useState(false);
  const [forceProxy, setForceProxy] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryMap = useRef<Map<number, number>>(new Map());

  const fetchVideos = useCallback(async (pageNum: number, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/shorts/feed?page=${pageNum}&size=10`);
      const data = await res.json();
      const list: VideoItem[] = data.videos || [];

      if (append) {
        setVideos((prev) => {
          const ids = new Set(prev.map((v) => v.id));
          const newItems = list.filter((v) => !ids.has(v.id));
          return [...prev, ...newItems];
        });
      } else {
        setVideos(list);
        setActiveIndex(0);
      }
    } catch {
      setError("加载失败，请稍后重试");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { fetchVideos(1); }, [fetchVideos]);

  useEffect(() => {
    setResolvedMap(new Map());
    setStatusMap(new Map());
  }, [forceProxy]);

  const loadPlayUrl = useCallback(async (index: number, video: VideoItem) => {
    if (resolvedMap.has(index)) return;

    try {
      const res = await fetch(`/api/shorts/play?bvid=${video.bvid}&qn=${qn}`);
      const data = await res.json();

      if (data.videoUrl && !data.fallback) {
        const useProxy = forceProxy && data.proxyVideoUrl;
        setResolvedMap((prev) => {
          const next = new Map(prev);
          next.set(index, {
            ...video,
            videoUrl: useProxy ? data.proxyVideoUrl : data.videoUrl,
            audioUrl: data.audioUrl || null,
            backupUrl: data.backupUrl || null,
            proxyVideoUrl: data.proxyVideoUrl || null,
            proxyAudioUrl: data.proxyAudioUrl || null,
            proxyBackupUrl: data.proxyBackupUrl || null,
            format: data.format || "durl",
            qn: data.qn || qn,
            qnLabel: data.qnLabel || "720P",
            qualities: data.qualities || [],
            usingProxy: useProxy,
          });
          return next;
        });
      } else {
        setResolvedMap((prev) => {
          const next = new Map(prev);
          next.set(index, {
            ...video,
            videoUrl: data.embedUrl || `https://www.bilibili.com/video/${video.bvid}`,
            audioUrl: null,
            backupUrl: null,
            proxyVideoUrl: null,
            proxyAudioUrl: null,
            proxyBackupUrl: null,
            format: "durl",
            qn: qn,
            qnLabel: "720P",
            qualities: [],
            usingProxy: false,
          });
          return next;
        });
      }
    } catch {
      // ignore
    }
  }, [resolvedMap, qn, forceProxy]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { threshold: [0.6] }
    );
    const ref = containerRef.current;
    Array.from(ref.children).forEach((c) => observer.observe(c));
    const mo = new MutationObserver(() => {
      Array.from(ref.children).forEach((c) => observer.observe(c));
    });
    mo.observe(ref, { childList: true });
    return () => { observer.disconnect(); mo.disconnect(); };
  }, [videos]);

  useEffect(() => {
    if (videos.length > 0) {
      for (let i = 0; i < Math.min(3, videos.length); i++) {
        loadPlayUrl(i, videos[i]);
      }
    }
  }, [videos, loadPlayUrl]);

  useEffect(() => {
    for (let i = activeIndex + 1; i <= activeIndex + 3 && i < videos.length; i++) {
      loadPlayUrl(i, videos[i]);
    }
    if (activeIndex >= videos.length - 3 && !fetchingRef.current && videos.length >= 10) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVideos(nextPage, true);
    }
  }, [activeIndex, videos.length, page, fetchVideos, loadPlayUrl]);

  const handlePlayPause = (index: number) => {
    const video = document.querySelector(`video[data-vidx="${index}"]`) as HTMLVideoElement | null;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setStatusMap((prev) => { const n = new Map(prev); n.set(index, "playing"); return n; });
    } else {
      video.pause();
      setStatusMap((prev) => { const n = new Map(prev); n.set(index, "paused"); return n; });
    }
  };

  const switchToProxy = useCallback((index: number) => {
    const resolved = resolvedMap.get(index);
    if (!resolved || resolved.usingProxy) return false;

    const count = retryMap.current.get(index) || 0;
    retryMap.current.set(index, count + 1);

    if (resolved.proxyVideoUrl) {
      setResolvedMap((prev) => {
        const next = new Map(prev);
        next.set(index, {
          ...resolved,
          videoUrl: resolved.proxyVideoUrl!,
          audioUrl: resolved.proxyAudioUrl,
          backupUrl: resolved.proxyBackupUrl,
          usingProxy: true,
        });
        return next;
      });
      return true;
    }

    if (resolved.backupUrl) {
      setResolvedMap((prev) => {
        const next = new Map(prev);
        next.set(index, { ...resolved, videoUrl: resolved.backupUrl!, backupUrl: null });
        return next;
      });
      return true;
    }

    return false;
  }, [resolvedMap]);

  const tryBackup = useCallback((index: number) => {
    const resolved = resolvedMap.get(index);
    if (!resolved) return false;

    if (resolved.backupUrl) {
      setResolvedMap((prev) => {
        const next = new Map(prev);
        next.set(index, { ...resolved, videoUrl: resolved.backupUrl!, backupUrl: null });
        return next;
      });
      return true;
    }

    if (!resolved.usingProxy && resolved.proxyVideoUrl) {
      setResolvedMap((prev) => {
        const next = new Map(prev);
        next.set(index, {
          ...resolved,
          videoUrl: resolved.proxyVideoUrl!,
          audioUrl: resolved.proxyAudioUrl,
          usingProxy: true,
        });
        return next;
      });
      return true;
    }

    return false;
  }, [resolvedMap]);

  const changeQn = useCallback((newQn: number) => {
    if (newQn === qn) return;
    setQn(newQn);
    setResolvedMap(new Map());
    setStatusMap(new Map());
    retryMap.current.clear();
  }, [qn]);

  const scrollTo = (index: number) => {
    if (!containerRef.current) return;
    const target = containerRef.current.children[index] as HTMLElement;
    if (target) target.scrollIntoView({ behavior: "smooth" });
  };

  const showControlsTemp = () => {
    setShowControls(true);
    if (controlsTimer.current != null) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        if (activeIndex < videos.length - 1) scrollTo(activeIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        if (activeIndex > 0) scrollTo(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, videos.length]);

  useEffect(() => {
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    return () => { if (controlsTimer.current != null) clearTimeout(controlsTimer.current); };
  }, []);

  if (loading && videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">加载视频中...</p>
        </div>
      </div>
    );
  }

  if (error && videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center px-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white/80 text-sm mb-4">{error}</p>
          <button onClick={() => fetchVideos(1)} className="px-5 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-all flex items-center gap-2 mx-auto">
            <RotateCcw className="w-4 h-4" /> 重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-40 overflow-hidden">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        style={{ scrollSnapType: "y mandatory" }}
        onScroll={showControlsTemp}
        onMouseMove={showControlsTemp}
        onTouchStart={showControlsTemp}
      >
        {videos.map((video, index) => {
          const resolved = resolvedMap.get(index);
          const status = statusMap.get(index) || "loading";
          const isFallback = resolved && resolved.videoUrl?.startsWith("https://www.bilibili.com");
          const canPlay = resolved && !isFallback;

          return (
            <div
              key={video.id}
              data-index={index}
              className="snap-start snap-always h-full w-full relative flex items-center justify-center bg-black shrink-0"
            >
              <img
                src={video.cover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110"
                loading="lazy"
              />

              {canPlay ? (
                <VideoPlayer
                  index={index}
                  videoUrl={resolved!.videoUrl}
                  audioUrl={resolved!.audioUrl}
                  format={resolved!.format}
                  cover={video.cover}
                  muted={muted || resolved!.format === "dash"}
                  activeIndex={activeIndex}
                  usingProxy={resolved!.usingProxy}
                  onStatusChange={(s) => setStatusMap((prev) => { const n = new Map(prev); n.set(index, s); return n; })}
                  onError={() => { if (!switchToProxy(index)) setStatusMap((prev) => { const n = new Map(prev); n.set(index, "error"); return n; }); }}
                  onClick={() => handlePlayPause(index)}
                />
              ) : isFallback ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <img src={video.cover} alt={video.title} className="w-full h-full object-cover opacity-60" loading="lazy" />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <AlertCircle className="w-10 h-10 text-white/60" />
                    <p className="text-white/60 text-xs">无法获取该视频的播放地址</p>
                    <a href={resolved!.videoUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 transition-all flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5" /> 在B站观看
                    </a>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <img src={video.cover} alt={video.title} className="w-full h-full object-cover opacity-60" loading="lazy" />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
                  </div>
                </div>
              )}

              {resolved?.usingProxy && canPlay && (
                <div className="absolute top-4 left-4 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px]">
                  代理播放
                </div>
              )}

              <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pt-24 pb-6 px-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
                <div className="flex items-end justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white text-sm font-semibold leading-snug line-clamp-2 mb-1">{video.title}</h2>
                    <div className="flex items-center gap-3 text-white/70 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">UP</span>
                        {video.author}
                      </span>
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {video.playCount}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {video.likeCount}</span>
                      <span>{video.duration}</span>
                    </div>
                    {video.description && (
                      <p className="text-white/50 text-[11px] mt-1.5 line-clamp-2 leading-relaxed">{video.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-3 flex-shrink-0">
                    <button onClick={() => setMuted(!muted)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center">
                      {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                    {status === "playing" ? (
                      <button onClick={() => handlePlayPause(index)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center">
                        <Pause className="w-4 h-4 text-white" />
                      </button>
                    ) : status === "paused" ? (
                      <button onClick={() => handlePlayPause(index)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </button>
                    ) : null}
                    <a href={`https://www.bilibili.com/video/${video.bvid}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center" title="在B站观看">
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                    </a>
                  </div>
                </div>
                <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                  <button onClick={() => activeIndex > 0 && scrollTo(activeIndex - 1)} disabled={activeIndex === 0} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center disabled:opacity-30">
                    <ChevronUp className="w-4 h-4 text-white" />
                  </button>
                  <span className="px-2 py-1 text-white/50 text-[10px] flex items-center">{activeIndex + 1} / {videos.length}</span>
                  <button onClick={() => activeIndex < videos.length - 1 && scrollTo(activeIndex + 1)} disabled={activeIndex >= videos.length - 1} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center disabled:opacity-30">
                    <ChevronDown className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {video.source === "bilibili" && (
                <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px]">B站热门</div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => { setVideos([]); setResolvedMap(new Map()); setPage(1); fetchVideos(1); }}
        className={`fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs hover:bg-white/20 transition-all flex items-center gap-1.5 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <RotateCcw className="w-3 h-3" /> 换一换
      </button>

      <div className={`fixed top-4 left-4 z-50 flex flex-col gap-1 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="flex gap-2">
          <button
            onClick={() => setForceProxy(!forceProxy)}
            className={`px-3 py-1.5 rounded-full backdrop-blur-sm text-xs hover:bg-white/20 transition-all flex items-center gap-1.5 ${forceProxy ? "bg-green-500/30 text-green-300" : "bg-white/10 text-white/70"}`}
            title={forceProxy ? "强制代理已开启（校园网模式）" : "直连B站CDN（更快）"}
          >
            {forceProxy ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
            {forceProxy ? "代理" : "直连"}
          </button>
          <button
            onClick={() => setShowQnPicker(!showQnPicker)}
            className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs hover:bg-white/20 transition-all flex items-center gap-1.5"
          >
            <Settings className="w-3 h-3" /> {QN_LABEL[qn] || "720P"}
          </button>
        </div>
        {showQnPicker && (
          <div className="flex gap-1 flex-wrap bg-black/60 backdrop-blur-sm rounded-xl p-1">
            {QN_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => { changeQn(opt); setShowQnPicker(false); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
              >
                {QN_LABEL[opt]}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function VideoPlayer({
  index,
  videoUrl,
  audioUrl,
  format,
  cover,
  muted,
  activeIndex,
  usingProxy,
  onStatusChange,
  onError,
  onClick,
}: {
  index: number;
  videoUrl: string;
  audioUrl: string | null;
  format: "durl" | "dash";
  cover: string;
  muted: boolean;
  activeIndex: number;
  usingProxy: boolean;
  onStatusChange: (s: "playing" | "paused" | "error") => void;
  onError: () => void;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isDash = format === "dash";
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (prevUrl.current !== videoUrl) {
      prevUrl.current = videoUrl;
      video.src = videoUrl;
      video.load();
    }

    video.muted = muted;

    const onPlay = () => onStatusChange("playing");
    const onPause = () => onStatusChange("paused");
    const onErr = () => onError();

    video.addEventListener("playing", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onErr);

    return () => {
      video.removeEventListener("playing", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onErr);
    };
  }, [videoUrl, muted, onStatusChange, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (index === activeIndex) {
      video.play().catch(() => {});
      if (audioRef.current && !muted) {
        audioRef.current.currentTime = video.currentTime;
        audioRef.current.play().catch(() => {});
      }
    } else {
      video.pause();
      if (audioRef.current) audioRef.current.pause();
    }
  }, [activeIndex, index, muted]);

  const syncAudio = useCallback(() => {
    if (!isDash) return;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;
    if (Math.abs(audio.currentTime - video.currentTime) > 0.3) {
      audio.currentTime = video.currentTime;
    }
  }, [isDash]);

  return (
    <>
      <video
        ref={videoRef}
        data-vidx={index}
        crossOrigin="anonymous"
        src={videoUrl}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        loop
        preload="auto"
        poster={cover}
        muted={muted}
        onClick={onClick}
        onTimeUpdate={syncAudio}
      />
      {isDash && audioUrl && (
        <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" preload="auto" loop />
      )}
    </>
  );
}

export default function ShortsPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
      </div>
    }>
      <ShortsContent />
    </Suspense>
  );
}
