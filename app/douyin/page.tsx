"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Heart, MessageCircle, Share2, Loader2, Music, Search as SearchIcon, X, RefreshCw } from "lucide-react";

interface DouyinVideo {
  id: string;
  desc: string;
  cover: string;
  playUrl: string;
  duration: number;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  music: string;
  createTime: number;
}

interface PlayInfo {
  id: string;
  desc: string;
  cover: string;
  videoUrl: string;
  proxyVideoUrl: string;
  author: { uid: string; name: string; avatar: string };
  stats: { likes: number; comments: number; shares: number };
  music: string;
  duration: number;
}

function formatCount(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export default function DouyinPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<DouyinVideo[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wheelAccum = useRef(0);
  const loadingMore = useRef(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/douyin/hot");
      const data = await res.json();
      if (data.videos?.length) {
        setVideos(data.videos);
        setActiveIdx(0);
      } else {
        setError(data.error || "暂无视频数据，请配置 Douyin Cookie");
      }
    } catch {
      setError("获取视频失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/douyin/hot?keyword=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.videos?.length) {
        setVideos(data.videos);
        setActiveIdx(0);
      } else {
        setError("未搜索到相关视频");
      }
    } catch {
      setError("搜索失败");
    } finally {
      setSearchLoading(false);
      setSearchOpen(false);
    }
  };

  const onWheel = useCallback((e: WheelEvent) => {
    if (searchOpen) return;
    wheelAccum.current += e.deltaY;
    if (wheelAccum.current > 60) {
      wheelAccum.current = 0;
      setActiveIdx((p) => Math.min(p + 1, videos.length - 1));
    } else if (wheelAccum.current < -60) {
      wheelAccum.current = 0;
      setActiveIdx((p) => Math.max(p - 1, 0));
    }
  }, [videos.length, searchOpen]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (searchOpen) return;
    if (e.key === "ArrowDown" || e.key === "j") setActiveIdx((p) => Math.min(p + 1, videos.length - 1));
    if (e.key === "ArrowUp" || e.key === "k") setActiveIdx((p) => Math.max(p - 1, 0));
  }, [videos.length, searchOpen]);

  useEffect(() => {
    window.addEventListener("wheel", onWheel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onWheel, onKeyDown]);

  useEffect(() => {
    if (activeIdx >= videos.length - 3 && !loadingMore.current && videos.length > 0) {
      loadingMore.current = true;
      fetch(`/api/douyin/hot?keyword=&offset=${videos.length}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.videos?.length) setVideos((p) => [...p, ...d.videos]);
        })
        .finally(() => { loadingMore.current = false; });
    }
    const card = containerRef.current?.children[activeIdx];
    card?.scrollIntoView?.({ behavior: "smooth" });
  }, [activeIdx, videos.length]);

  const video = videos[activeIdx];

  return (
    <div className="h-screen bg-black overflow-hidden relative">
      <button onClick={() => router.push("/drive")} className="absolute top-4 left-4 z-20 p-2 bg-black/40 rounded-xl">
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <button onClick={() => setSearchOpen(true)} className="absolute top-4 right-4 z-20 p-2 bg-black/40 rounded-xl">
        <SearchIcon className="w-5 h-5 text-white" />
      </button>

      {videos.length === 0 && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <p className="text-white/40">{error || "暂无视频"}</p>
          <button onClick={fetchVideos} className="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm">重试</button>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
        </div>
      )}

      <div ref={containerRef} className="h-full overflow-hidden">
        {videos.map((v, i) => (
          <VideoSlide
            key={v.id}
            video={v}
            isActive={i === activeIdx}
          />
        ))}
      </div>

      {searchOpen && (
        <div className="absolute inset-0 z-30 bg-black flex flex-col pt-20 px-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3">
              <SearchIcon className="w-4 h-4 text-white/40" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="搜索抖音视频..."
                className="flex-1 bg-transparent outline-none text-white text-sm"
              />
              {searchQuery && <button onClick={() => setSearchQuery("")}><X className="w-4 h-4 text-white/40" /></button>}
            </div>
            <button onClick={doSearch} disabled={searchLoading} className="px-4 py-3 bg-pink-500 text-white text-sm rounded-xl">
              {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "搜索"}
            </button>
            <button onClick={() => setSearchOpen(false)} className="px-3 py-3 text-white/60 text-sm">取消</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {["搞笑", "舞蹈", "美食", "旅行", "音乐", "知识", "体育", "时尚"].map((t) => (
              <button key={t} onClick={() => { setSearchQuery(t); }} className="px-3 py-1.5 bg-white/5 text-white/60 text-xs rounded-full">
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VideoSlide({ video, isActive }: { video: DouyinVideo; isActive: boolean }) {
  const [playInfo, setPlayInfo] = useState<PlayInfo | null>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isActive) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      return;
    }
    setError(false);
    setPaused(false);
    if (playInfo) {
      videoRef.current?.play().catch(() => setPaused(true));
      return;
    }
    fetch(`/api/douyin/play?id=${video.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.videoUrl) {
          setPlayInfo(d);
          setTimeout(() => videoRef.current?.play().catch(() => setPaused(true)), 100);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, [isActive, video.id]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  const src = playInfo?.proxyVideoUrl || playInfo?.videoUrl || "";
  const cover = video.cover;

  return (
    <div className="h-full relative flex items-center justify-center" onClick={togglePlay}>
      {!isActive ? (
        <div className="h-full w-full bg-black" />
      ) : error ? (
        <div className="text-center text-white/30">
          <p>视频加载失败</p>
          <button onClick={() => window.open(`https://www.douyin.com/video/${video.id}`, "_blank")}
            className="mt-2 px-3 py-1.5 bg-white/10 rounded-lg text-white/60 text-sm">
            在抖音观看
          </button>
        </div>
      ) : (
        <>
          {src ? (
            <video
              ref={videoRef}
              src={src}
              poster={cover ? `/api/douyin-proxy?url=${encodeURIComponent(cover)}` : undefined}
              loop
              playsInline
              className="max-h-full max-w-full object-contain"
              onError={() => setError(true)}
            />
          ) : (
            <div className="text-white/40"><Loader2 className="w-8 h-8 animate-spin" /></div>
          )}
          {paused && playInfo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-16 h-16 text-white/80" />
            </div>
          )}
          <div className="absolute bottom-20 left-4 right-16">
            <p className="text-white text-sm font-medium mb-1">@{video.authorName}</p>
            <p className="text-white/80 text-xs line-clamp-2">{video.desc}</p>
            {video.music && (
              <div className="flex items-center gap-1 mt-1 text-white/50 text-xs">
                <Music className="w-3 h-3" /> {video.music}
              </div>
            )}
          </div>
          <div className="absolute bottom-20 right-3 flex flex-col items-center gap-5">
            <button className="flex flex-col items-center gap-1">
              <Heart className="w-7 h-7 text-white" />
              <span className="text-white text-xs">{formatCount(video.likeCount)}</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-white text-xs">{formatCount(video.commentCount)}</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Share2 className="w-7 h-7 text-white" />
              <span className="text-white text-xs">分享</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); fetchVideos(); }} className="flex flex-col items-center gap-1">
              <RefreshCw className="w-6 h-6 text-white/70" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function fetchVideos() {
  window.location.reload();
}
