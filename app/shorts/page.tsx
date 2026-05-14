"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import {
  Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown,
  RotateCcw, AlertCircle, ExternalLink, Heart, Eye,
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
  videoUrl?: string;
  audioUrl?: string;
  embedUrl?: string;
  fallback?: boolean;
  playError?: boolean;
}

function ShortsContent() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playStatuses, setPlayStatuses] = useState<Record<number, "loading" | "playing" | "paused" | "error">>({});
  const [loadedUrls, setLoadedUrls] = useState<Record<number, VideoItem>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const fetchingRef = useRef(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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

  const loadPlayUrl = useCallback(async (index: number, video: VideoItem) => {
    if (loadedUrls[index]?.videoUrl) return;

    try {
      const res = await fetch(`/api/shorts/play?bvid=${video.bvid}`);
      const data = await res.json();

      if (data.videoUrl && !data.fallback && !data.dashFormat) {
        setLoadedUrls((prev) => ({
          ...prev,
          [index]: { ...video, videoUrl: data.videoUrl, audioUrl: data.audioUrl },
        }));
        if (videoTimers.current.has(index)) {
          clearTimeout(videoTimers.current.get(index)!);
        }
        videoTimers.current.set(index, setTimeout(() => {
          if (playStatuses[index] !== "playing") {
            setPlayStatuses((prev) => ({ ...prev, [index]: "error" }));
          }
        }, 8000));
      } else if (data.dashFormat) {
        setLoadedUrls((prev) => ({
          ...prev,
          [index]: { ...video, embedUrl: `https://www.bilibili.com/video/${video.bvid}`, fallback: true },
        }));
      } else if (data.embedUrl) {
        setLoadedUrls((prev) => ({
          ...prev,
          [index]: { ...video, embedUrl: data.embedUrl, fallback: true },
        }));
      }
    } catch {
      setLoadedUrls((prev) => ({
        ...prev,
        [index]: { ...video, fallback: true, playError: true },
      }));
    }
  }, [loadedUrls]);

  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveIndex(idx);
          }
        }
      },
      { threshold: [0.5, 0.7, 0.9] }
    );

    return () => observerRef.current?.disconnect();
  }, [videos]);

  const observeVideo = useCallback((el: HTMLDivElement | null) => {
    if (el && observerRef.current) observerRef.current.observe(el);
  }, []);

  useEffect(() => {
    if (videos.length > 0) {
      loadPlayUrl(0, videos[0]);
      if (videos.length > 1) loadPlayUrl(1, videos[1]);
    }
  }, [videos, loadPlayUrl]);

  useEffect(() => {
    if (activeIndex + 1 < videos.length) {
      loadPlayUrl(activeIndex + 1, videos[activeIndex + 1]);
    }
    if (activeIndex + 2 < videos.length && videos.length > 5) {
      loadPlayUrl(activeIndex + 2, videos[activeIndex + 2]);
    }

    if (activeIndex >= videos.length - 3 && !fetchingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVideos(nextPage, true);
    }
  }, [activeIndex, videos.length, page, fetchVideos, loadPlayUrl]);

  const handlePlayPause = (index: number) => {
    const video = videoRefs.current.get(index);
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlayStatuses((prev) => ({ ...prev, [index]: "playing" }));
    } else {
      video.pause();
      setPlayStatuses((prev) => ({ ...prev, [index]: "paused" }));
    }
  };

  const handleVideoEvent = (index: number, status: "playing" | "paused" | "error") => {
    setPlayStatuses((prev) => ({ ...prev, [index]: status }));
    if (videoTimers.current.has(index)) {
      clearTimeout(videoTimers.current.get(index)!);
      videoTimers.current.delete(index);
    }
  };

  const scrollTo = (index: number) => {
    if (!containerRef.current) return;
    const target = containerRef.current.children[index] as HTMLElement;
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
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
    videoRefs.current.forEach((video, idx) => {
      if (idx === activeIndex) {
        video.muted = muted;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex, muted]);

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
          <button
            onClick={() => fetchVideos(1)}
            className="px-5 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-all flex items-center gap-2 mx-auto"
          >
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
          const resolved = loadedUrls[index] || video;
          const status = playStatuses[index] || "loading";
          const canPlay = !!resolved.videoUrl && !resolved.fallback && status !== "error";
          const showFallback = !!resolved.fallback || status === "error" || !!resolved.playError;

          return (
            <div
              key={video.id + "-" + index}
              ref={observeVideo}
              data-index={index}
              className="snap-start snap-always h-full w-full relative flex items-center justify-center bg-black shrink-0"
            >
              <img
                src={video.cover}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110 transition-opacity duration-500 ${canPlay && status === "playing" ? "opacity-10" : ""}`}
                loading="lazy"
              />

              {canPlay && resolved.videoUrl ? (
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current.set(index, el);
                      el.muted = muted;
                      el.playsInline = true;
                      el.loop = true;
                      el.preload = "auto";
                      el.src = resolved.videoUrl!;
                      el.poster = video.cover;
                      el.onplaying = () => handleVideoEvent(index, "playing");
                      el.onpause = () => handleVideoEvent(index, "paused");
                      el.onerror = () => handleVideoEvent(index, "error");
                      if (index === activeIndex) el.play().catch(() => {});
                    }
                  }}
                  className="absolute inset-0 w-full h-full object-contain"
                  playsInline
                  loop
                  poster={video.cover}
                  onClick={() => handlePlayPause(index)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <img
                    src={video.cover}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-60"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  {showFallback ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <AlertCircle className="w-10 h-10 text-white/60" />
                      <p className="text-white/60 text-xs">
                        {status === "error" ? "B站防盗链限制，无法直连播放" : "暂无法获取播放地址"}
                      </p>
                      <a
                        href={`https://www.bilibili.com/video/${video.bvid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 transition-all flex items-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> 在B站观看
                      </a>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
                    </div>
                  )}
                </div>
              )}

              <div
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pt-24 pb-6 px-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
              >
                <div className="flex items-end justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white text-sm font-semibold leading-snug line-clamp-2 mb-1">
                      {video.title}
                    </h2>
                    <div className="flex items-center gap-3 text-white/70 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">UP</span>
                        {video.author}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> {video.playCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" /> {video.likeCount}
                      </span>
                      <span>{video.duration}</span>
                    </div>
                    {video.description && (
                      <p className="text-white/50 text-[11px] mt-1.5 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => setMuted(!muted)}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
                    >
                      {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>

                    {status === "playing" ? (
                      <button
                        onClick={() => handlePlayPause(index)}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
                      >
                        <Pause className="w-4 h-4 text-white" />
                      </button>
                    ) : status === "paused" ? (
                      <button
                        onClick={() => handlePlayPause(index)}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
                      >
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </button>
                    ) : null}

                    <a
                      href={`https://www.bilibili.com/video/${video.bvid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
                      title="在B站观看"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                    </a>
                  </div>
                </div>

                <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                  <button
                    onClick={() => activeIndex > 0 && scrollTo(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4 text-white" />
                  </button>
                  <span className="px-2 py-1 text-white/50 text-[10px] flex items-center">
                    {activeIndex + 1} / {videos.length}
                  </span>
                  <button
                    onClick={() => activeIndex < videos.length - 1 && scrollTo(activeIndex + 1)}
                    disabled={activeIndex >= videos.length - 1}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {!canPlay && resolved.fallback && (
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-[10px] flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> 需跳转B站播放
                </div>
              )}

              {video.source === "bilibili" && (
                <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px]">
                  B站热门
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => { setVideos([]); setPage(1); fetchVideos(1); }}
        className={`fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs hover:bg-white/20 transition-all flex items-center gap-1.5 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <RotateCcw className="w-3 h-3" /> 换一换
      </button>

      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
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
