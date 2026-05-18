"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Play, Search, X, Loader2,
  Eye, Heart, ArrowLeft, Smartphone, Shield, ShieldOff, Clock,
} from "lucide-react";
import { proxyUrl, formatPubdate } from "@/lib/bilibili";
import VideoGrid from "./components/VideoGrid";
import VideoPlayerModal from "./components/VideoPlayerModal";
import { DanmakuSettings, DANMAKU_DEFAULTS } from "./components/DanmakuLayer";

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
  title: string; author: string; authorMid: number; authorFace: string; cover: string;
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
  const router = useRouter();
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
  const [globalProxy, setGlobalProxy] = useState(true);
  const [danmaku, setDanmaku] = useState<DanmakuSettings>(DANMAKU_DEFAULTS);

  const searchInputRef = useRef<HTMLInputElement>(null);

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
      setSearchHasMore(data.hasMore || false);
    } catch {
      if (!append) setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setShowSearch(false);
      setSearchResults([]);
    }
  };

  const performSearch = () => {
    const q = searchQuery.trim();
    if (q) {
      setShowSearch(true);
      setSearchPage(1);
      doSearch(q, searchType, 1, false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") performSearch();
  };

  const handleLoadMoreSearch = () => {
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    doSearch(searchQuery, searchType, nextPage, true);
  };

  const handlePlayFromGrid = (video: VideoItem) => {
    setPlayingVideo({
      bvid: video.bvid, aid: video.aid, cid: video.cid,
      title: video.title, author: video.author, authorMid: video.authorMid,
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
  const tabActive = dark ? "bg-pink-500/20 text-pink-400" : "bg-pink-50 text-pink-600";
  const tabInactive = dark ? "text-white/50 hover:bg-white/5" : "text-gray-500 hover:bg-gray-50";

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Top bar: search + shortcuts */}
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
                onChange={(e) => handleSearchInput(e.target.value)}
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
                  className={`absolute right-20 sm:right-24 top-1/2 -translate-y-1/2 ${textSecondary} hover:text-pink-400`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={performSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1 rounded-lg"
              >
                搜索
              </button>
            </div>
            {/* 代理/直连 全局切换 */}
            <button
              onClick={() => setGlobalProxy(!globalProxy)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${
                globalProxy
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : dark ? "bg-white/5 text-white/50 border border-white/10" : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}
            >
              {globalProxy ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
              {globalProxy ? "代理" : "直连"}
            </button>
            {/* 短视频入口 */}
            <button
              onClick={() => router.push("/shorts")}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${
                dark ? "bg-white/5 hover:bg-white/10 text-white/60 border border-white/10" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              短视频
            </button>
          </div>
        </div>
      </div>

      {showSearch ? (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setSearchType("video"); setSearchPage(1); doSearch(searchQuery, "video", 1, false); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${searchType === "video" ? tabActive : tabInactive}`}
            >
              视频
            </button>
            <button
              onClick={() => { setSearchType("user"); setSearchPage(1); doSearch(searchQuery, "user", 1, false); }}
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
                  onClick={() => handlePlayFromSearch({
                    bvid: item.bvid, aid: item.aid, cid: item.cid,
                    title: item.title, author: item.author, authorMid: item.authorMid || 0,
                    authorFace: item.authorFace, cover: item.cover,
                  })}
                  className={`flex gap-3 p-2 rounded-xl ${dark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-all w-full text-left`}
                >
                  <div className="relative flex-shrink-0 w-44 h-28 sm:w-56 sm:h-32 rounded-lg overflow-hidden bg-gray-700">
                    <img src={proxyUrl(item.cover)} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {item.duration}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className={`${textPrimary} text-sm sm:text-base line-clamp-2 leading-snug font-medium`}>{item.title}</h3>
                    <p className={`${textSecondary} text-xs mt-1.5`}>{item.author} · {item.playCount}播放{item.pubdate > 0 ? ` · ${formatPubdate(item.pubdate)}` : ""}</p>
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
                  >加载更多</button>
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
                    <p className={`${textSecondary} text-xs mt-0.5`}>{item.followerCount}粉丝 · {item.videoCount}视频</p>
                    {item.sign && <p className={`${textSecondary} text-[11px] line-clamp-1 mt-0.5`}>{item.sign}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto">
          <VideoGrid
            onPlayVideo={handlePlayFromGrid}
            refreshTrigger={refreshTrigger}
            dark={dark}
          />
          <VideoGridMore
            onPlayVideo={handlePlayFromGrid}
            refreshTrigger={refreshTrigger}
            dark={dark}
          />
        </div>
      )}

      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
          dark={dark}
          forceProxy={globalProxy}
          danmaku={danmaku}
          onDanmakuChange={setDanmaku}
          onShowUserProfile={setShowUserProfile}
        />
      )}

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
        const res = await fetch(`/api/bili/feed?seed=${Date.now() + 99999}&size=12&exclude=${ex}`);
        const data = await res.json();
        const list: VideoItem[] = data.videos || [];
        list.forEach((v) => seenBvids.current.add(v.id));
        setVideos(list);
      } catch {} finally { setLoading(false); }
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
              <h3 className={`text-sm font-medium line-clamp-2 mb-1.5 leading-snug ${textPrimary}`}>{video.title}</h3>
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"pubtime" | "click">("pubtime");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const doFetch = useCallback(async (p: number, s: string, st: string, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/bili/user/${mid}/videos?page=${p}&size=6&sort=${st}&search=${encodeURIComponent(s)}`);
      const data: { videos: VideoItem[]; hasMore: boolean; total: number } = await res.json();
      if (append) {
        setVideos((prev) => {
          const seen = new Set(prev.map((v) => v.id || v.bvid));
          const fresh = (data.videos || []).filter((v: VideoItem) => !seen.has(v.id || v.bvid));
          return [...prev, ...fresh];
        });
      } else {
        setVideos(data.videos || []);
      }
      setHasMore(data.hasMore || false);
      setTotal(data.total || 0);
    } catch {} finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [mid]);

  const resetAndFetch = useCallback((s: string, st: string) => {
    setPage(1);
    setVideos([]);
    setHasMore(false);
    setTotal(0);
    setLoadingMore(false);
    doFetch(1, s, st, false);
  }, [doFetch]);

  useEffect(() => {
    resetAndFetch(search, sort);
  }, [mid, sort, search, resetAndFetch]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/bili/user/${mid}`);
        setProfile(await res.json());
      } catch {}
    })();
  }, [mid]);

  const loadMore = () => {
    if (loadingMore) return;
    const next = page + 1;
    setPage(next);
    doFetch(next, search, sort, true);
  };

  const handleSearch = () => {
    const q = searchInput.trim();
    setSearch(q);
    resetAndFetch(q, sort);
  };

  const handleSort = (s: "pubtime" | "click") => {
    setSort(s);
    resetAndFetch(search, s);
  };

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

            {/* Search + Sort controls */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="flex-1 flex gap-2">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textSecondary}`} />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="搜索视频标题，回车确认..."
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border ${dark ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                </div>
                <button onClick={handleSearch}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${dark ? "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30" : "bg-pink-50 text-pink-600 hover:bg-pink-100"}`}>
                  搜索
                </button>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleSort("pubtime")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${sort === "pubtime" ? (dark ? "bg-pink-500/30 text-pink-300" : "bg-pink-50 text-pink-600") : (dark ? "bg-white/5 text-white/50 hover:bg-white/10" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}`}>
                  最新发布
                </button>
                <button onClick={() => handleSort("click")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${sort === "click" ? (dark ? "bg-pink-500/30 text-pink-300" : "bg-pink-50 text-pink-600") : (dark ? "bg-white/5 text-white/50 hover:bg-white/10" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}`}>
                  最多播放
                </button>
              </div>
            </div>

            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>
              作品列表
              {total > 0 && <span className={`text-xs font-normal ml-2 ${textSecondary}`}>{total}个</span>}
            </h3>
            {videos.length === 0 ? (
              <p className={`text-sm text-center py-8 ${textSecondary}`}>{search ? "未搜索到视频" : "暂无公开作品"}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {videos.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onPlayVideo({ bvid: v.bvid, aid: v.aid, cid: v.cid, title: v.title, author: v.author, authorMid: v.authorMid, authorFace: v.authorFace, cover: v.cover })}
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
                {loadingMore && (
                  <div className="flex justify-center py-6">
                    <div className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${dark ? "border-white/20 border-t-white" : "border-gray-300 border-t-gray-600"}`} />
                  </div>
                )}
                {hasMore && !loadingMore && (
                  <div className="flex justify-center py-6">
                    <button onClick={loadMore} disabled={loadingMore}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-40 ${dark ? "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}>
                      加载更多
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className={`text-sm text-center py-8 ${textSecondary}`}>用户信息获取失败</p>
        )}
      </div>
    </div>
  );
}
