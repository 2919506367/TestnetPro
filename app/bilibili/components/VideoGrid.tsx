"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Play, RefreshCw, Eye, Heart, MessageCircle, Clock, AlertCircle } from "lucide-react";
import { formatPubdate } from "@/lib/bilibili";
import BiliImage from "./BiliImage";

interface VideoItem {
  id: string; bvid: string; aid: number; cid: number;
  title: string; author: string; authorMid: number;
  authorFace: string; cover: string;
  playCount: string; likeCount: string; danmakuCount: string;
  duration: string; durationSec: number;
  description: string; pubdate: number;
}

const FEED_CACHE_KEY = "bili_feed_cache";

function getCachedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    return new Set((data.videos || []).map((v: {id: string}) => v.id));
  } catch { return new Set(); }
}

function hasFeedCache(): boolean {
  if (typeof window === "undefined") return false;
  try { return !!sessionStorage.getItem(FEED_CACHE_KEY); } catch { return false; }
}

function getCachedSeed(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = sessionStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return Date.now();
    const data = JSON.parse(raw);
    return data.nextSeed || Date.now();
  } catch { return Date.now(); }
}

function getCachedHasMore(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = sessionStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return true;
    const data = JSON.parse(raw);
    return typeof data.hasMore === "boolean" ? data.hasMore : true;
  } catch { return true; }
}

export default function VideoGrid({
  onPlayVideo,
  refreshTrigger,
  dark,
}: {
  onPlayVideo: (video: VideoItem) => void;
  refreshTrigger: number;
  dark: boolean;
}) {
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = sessionStorage.getItem(FEED_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.videos?.length > 0) return parsed.videos;
      }
    } catch {}
    return [];
  });
  const cachedVideoIds = useRef<Set<string>>(getCachedIds());
  const [loading, setLoading] = useState(!hasFeedCache());
  const [seed, setSeed] = useState(getCachedSeed);
  const [hasMore, setHasMore] = useState(getCachedHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const seenBvids = useRef<Set<string>>(cachedVideoIds.current);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const firstLoadDone = useRef(false);
  const hasCached = useRef(hasFeedCache());

  const saveCache = (vids: VideoItem[], nextSeed: number, more: boolean) => {
    try {
      sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({
        videos: vids, nextSeed, hasMore: more,
        timestamp: Date.now(),
      }));
    } catch {}
  };

  const fetchVideos = useCallback(async (s: number, p: number, append: boolean) => {
    if (loadingRef.current) return;
    if (append && !hasMore) return;
    loadingRef.current = true;
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(""); }

    try {
      const ex = Array.from(seenBvids.current).slice(-50).join(",");
      const size = append ? 8 : 16;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`/api/bili/feed?seed=${s}&size=${size}&exclude=${ex}&page=${p}`, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      const list: VideoItem[] = data.videos || [];

      list.forEach((v) => seenBvids.current.add(v.id));

      let newList: VideoItem[];
      if (append) {
        setVideos((prev) => { newList = [...prev, ...list]; return newList; });
      } else {
        newList = list;
        setVideos(list);
        firstLoadDone.current = true;
      }
      const more = list.length >= size;
      setHasMore(more);
      setSeed(data.nextSeed || s + 1);
      setTimeout(() => saveCache(newList!, data.nextSeed || s + 1, more), 100);
    } catch (e) {
      console.error("feed fetch error:", e);
      if (!append) { setVideos([]); setHasMore(false); setError("推荐视频加载失败"); sessionStorage.removeItem(FEED_CACHE_KEY); }
      else { setHasMore(false); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [hasMore]);

  useEffect(() => {
    if (!hasCached.current) {
      firstLoadDone.current = false;
      fetchVideos(seed, 1, false);
    }
  }, [refreshTrigger]);

  const handleRefresh = () => {
    seenBvids.current.clear();
    pageRef.current = 1;
    loadingRef.current = false;
    const newSeed = Date.now();
    setSeed(newSeed);
    setError("");
    setHasMore(true);
    sessionStorage.removeItem(FEED_CACHE_KEY);
    hasCached.current = false;
    fetchVideos(newSeed, 1, false);
  };

  // IntersectionObserver for infinite scroll (guarded)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (videos.length < 8) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingRef.current) {
          pageRef.current += 1;
          fetchVideos(seed, pageRef.current, true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, seed, fetchVideos, videos.length]);

  const bg = dark ? "bg-[#141414]" : "bg-[#f4f5f7]";
  const cardBg = dark ? "bg-[#1f1f1f] hover:bg-[#2a2a2a]" : "bg-white hover:bg-gray-50";
  const textPrimary = dark ? "text-white/90" : "text-gray-900";
  const textSecondary = dark ? "text-white/50" : "text-gray-500";
  const borderColor = dark ? "border-white/5" : "border-gray-100";

  if (loading && videos.length === 0) {
    return (
      <div className={`${bg} p-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${cardBg} rounded-xl overflow-hidden animate-pulse`}>
              <div className="aspect-video bg-gray-700" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-3/4" />
                <div className="h-2 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && videos.length === 0) {
    return (
      <div className={`${bg} p-6`}>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className={`w-10 h-10 mb-3 ${dark ? "text-red-400" : "text-red-500"}`} />
          <p className={`${textSecondary} text-sm mb-3`}>{error}</p>
          <button onClick={handleRefresh}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              dark ? "bg-white/10 text-white/70 hover:bg-white/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            点击重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bg} p-4 sm:p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-bold ${textPrimary}`}>推荐视频</h2>
        <button
          onClick={handleRefresh}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
            dark ? "bg-white/5 hover:bg-white/10 text-white/70" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          换一换
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            onClick={() => onPlayVideo(video)}
            className={`${cardBg} rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm ${dark ? "shadow-black/20" : "shadow-gray-200/50"} group`}
          >
            <div className="aspect-video relative overflow-hidden">
              <BiliImage
                rawUrl={video.cover}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
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
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" /> {video.playCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <Heart className="w-3 h-3" /> {video.likeCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle className="w-3 h-3" /> {video.danmakuCount}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-5 h-5 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                  {video.authorFace && (
                    <BiliImage rawUrl={video.authorFace} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className={`text-[11px] ${textSecondary} truncate`}>{video.author}</span>
                {video.pubdate > 0 && (
                  <span className={`text-[10px] ${textSecondary} flex-shrink-0 flex items-center gap-0.5`}>
                    <Clock className="w-2.5 h-2.5" /> {formatPubdate(video.pubdate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sentinel for infinite scroll */}
      {hasMore && <div ref={sentinelRef} className="h-10" />}

      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)", borderTopColor: dark ? "#fff" : "#333" }}
          />
        </div>
      )}

      {!hasMore && videos.length > 0 && (
        <p className={`text-center py-6 text-xs ${textSecondary}`}>已加载全部推荐视频</p>
      )}
    </div>
  );
}
