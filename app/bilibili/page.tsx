"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Play, Search, X, Loader2, Globe,
  Eye, Heart, ArrowLeft, Smartphone, Shield, ShieldOff,
} from "lucide-react";
import { formatPubdate } from "@/lib/bilibili";
import BiliImage from "./components/BiliImage";
import VideoGrid from "./components/VideoGrid";

interface VideoItem {
  id: string; bvid: string; aid: number; cid: number;
  title: string; author: string; authorMid: number;
  authorFace: string; cover: string;
  playCount: string; likeCount: string; danmakuCount: string;
  duration: string; durationSec: number;
  description: string; pubdate: number;
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

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"video" | "user">("video");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [globalProxy, setGlobalProxy] = useState(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("bili_force_proxy");
    return v === null ? true : v === "1";
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("bili_force_proxy", globalProxy ? "1" : "0");
  }, [globalProxy]);

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
    router.push(`/bilibili/video/${video.bvid}`);
  };

  const handlePlayFromSearch = (item: any) => {
    router.push(`/bilibili/video/${item.bvid}`);
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
            <button
              onClick={() => router.push("/browser")}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${dark ? "bg-white/5 hover:bg-white/10 text-white/60 border border-white/10" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
            >
              <Globe className="w-3.5 h-3.5" />
              浏览器
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
                    <BiliImage rawUrl={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
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
                  onClick={() => router.push(`/bilibili/user/${item.mid}`)}
                  className={`flex gap-3 p-3 rounded-xl ${dark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-all w-full text-left`}
                >
                  <BiliImage rawUrl={item.face} alt="" className="w-12 h-12 rounded-full flex-shrink-0 bg-gray-300" />
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
        </div>
      )}
    </div>
  );
}
