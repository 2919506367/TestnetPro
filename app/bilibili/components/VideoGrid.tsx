"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Play, RefreshCw, Eye, Heart, MessageCircle, Clock } from "lucide-react";
import { proxyUrl, formatPubdate, imgOnError } from "@/lib/bilibili";

interface VideoItem {
  id: string; bvid: string; aid: number; cid: number;
  title: string; author: string; authorMid: number;
  authorFace: string; cover: string;
  playCount: string; likeCount: string; danmakuCount: string;
  duration: string; durationSec: number;
  description: string; pubdate: number;
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
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(Date.now());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const seenBvids = useRef<Set<string>>(new Set());

  const fetchVideos = useCallback(async (s: number, p: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const ex = Array.from(seenBvids.current).slice(-50).join(",");
      const size = append ? 8 : 12;
      const res = await fetch(`/api/bili/feed?seed=${s}&size=${size}&exclude=${ex}&page=${p}`);
      const data = await res.json();
      const list: VideoItem[] = data.videos || [];

      list.forEach((v) => seenBvids.current.add(v.id));

      if (append) {
        setVideos((prev) => [...prev, ...list]);
      } else {
        setVideos(list);
      }
      setHasMore(list.length >= size);
      setSeed(data.nextSeed || s + 1);
    } catch {
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos(seed, 1, false);
  }, [refreshTrigger]);

  const handleRefresh = () => {
    seenBvids.current.clear();
    const newSeed = Date.now();
    setSeed(newSeed);
    setPage(1);
    fetchVideos(newSeed, 1, false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(seed, nextPage, true);
  };

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
              <img
                src={proxyUrl(video.cover)}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={imgOnError}
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
                    <img src={proxyUrl(video.authorFace)} alt="" className="w-full h-full object-cover" onError={imgOnError} />
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

      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)", borderTopColor: dark ? "#fff" : "#333" }}
          />
        </div>
      )}

      {hasMore && !loadingMore && videos.length > 0 && (
        <div className="flex justify-center py-6">
          <button
            onClick={handleLoadMore}
            className={`px-6 py-2 rounded-full text-sm transition-all ${
              dark
                ? "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
          >
            加载更多
          </button>
        </div>
      )}

      {!hasMore && videos.length > 0 && (
        <p className={`text-center py-6 text-xs ${textSecondary}`}>已加载全部推荐视频</p>
      )}
    </div>
  );
}
