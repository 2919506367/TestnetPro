"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, Loader2, Play, Eye } from "lucide-react";
import BiliImage from "../../components/BiliImage";

interface UserInfo {
  mid: number; name: string; face: string; sign: string;
  followerCount: string; followingCount: string; videoCount: number;
}

interface VideoItem {
  id: string; bvid: string; aid: number; cid: number;
  title: string; author: string; cover: string;
  playCount: string; duration: string; durationSec: number;
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
    </div>
  );
}

export default function UserPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UserHome />
    </Suspense>
  );
}

function UserHome() {
  const params = useParams();
  const router = useRouter();
  const mid = params.mid as string;

  const [profile, setProfile] = useState<UserInfo | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"pubtime" | "click">("pubtime");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const doFetch = async (p: number, s: string, sq: string, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/bili/user/${mid}/videos?page=${p}&size=12&sort=${s}&search=${encodeURIComponent(sq)}`);
      const data = await res.json();
      const list: VideoItem[] = data.videos || [];
      if (append) {
        setVideos(prev => [...prev, ...list]);
      } else {
        setVideos(list);
      }
      setHasMore(data.hasMore || false);
      setTotal(data.total || 0);
    } catch {} finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!mid) return;
    setPage(1);
    setVideos([]);
    setHasMore(false);
    setTotal(0);

    (async () => {
      try {
        const pRes = await fetch(`/api/bili/user/${mid}`);
        setProfile(await pRes.json());
      } catch {}
    })();

    doFetch(1, sort, searchQuery, false);
  }, [mid]);

  useEffect(() => {
    if (!mid) return;
    setPage(1);
    setVideos([]);
    setHasMore(false);
    doFetch(1, sort, searchQuery, false);
  }, [sort, searchQuery]);

  const loadMore = () => {
    if (loadingMore) return;
    const next = page + 1;
    setPage(next);
    doFetch(next, sort, searchQuery, true);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleSort = (s: "pubtime" | "click") => {
    setSort(s);
  };

  const goToVideo = (bvid: string) => {
    router.push(`/bilibili/video/${bvid}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/[0.08] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/bilibili");
          }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-medium text-white/70">用户主页</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {loading && !profile ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-pink-400 animate-spin" />
          </div>
        ) : profile ? (
          <>
            {/* Profile card */}
            <div className="flex items-center gap-4 mb-6">
              <BiliImage rawUrl={profile.face} alt="" className="w-16 h-16 rounded-full bg-white/10 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-white">{profile.name}</h2>
                <p className="text-white/40 text-xs mt-0.5">
                  {profile.followerCount}粉丝 · {profile.followingCount}关注 · {profile.videoCount}视频
                </p>
                {profile.sign && (
                  <p className="text-white/30 text-xs mt-0.5 line-clamp-2">{profile.sign}</p>
                )}
              </div>
            </div>

            {/* Search + Sort controls */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="flex-1 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="搜索视频标题，回车确认..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <button onClick={handleSearch}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-pink-500/20 text-pink-300 hover:bg-pink-500/30">
                  搜索
                </button>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleSort("pubtime")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${sort === "pubtime" ? "bg-pink-500/30 text-pink-300" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                  最新发布
                </button>
                <button onClick={() => handleSort("click")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${sort === "click" ? "bg-pink-500/30 text-pink-300" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                  最多播放
                </button>
              </div>
            </div>

            <h3 className="text-white/60 text-sm font-medium mb-3">
              作品列表
              {total > 0 && <span className="text-white/30 text-xs ml-2 font-normal">{total}个</span>}
            </h3>

            {videos.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-12">
                {searchQuery ? "未搜索到视频" : "暂无公开作品"}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {videos.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => goToVideo(v.bvid)}
                      className="rounded-xl overflow-hidden bg-white/[0.04] hover:bg-white/[0.08] transition-all text-left w-full group"
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <BiliImage rawUrl={v.cover} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-all" />
                        </div>
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {v.duration}
                        </span>
                      </div>
                      <div className="p-2">
                        <h4 className="text-white/75 text-xs line-clamp-2 leading-snug mb-1">{v.title}</h4>
                        <div className="flex items-center gap-2 text-white/25 text-[10px]">
                          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {v.playCount}</span>
                          <span>{v.duration}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {loadingMore && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                  </div>
                )}

                {hasMore && !loadingMore && (
                  <div className="flex justify-center py-6">
                    <button onClick={loadMore}
                      className="px-6 py-2 rounded-full text-sm text-white/50 hover:text-white/80 hover:bg-white/5 border border-white/10">
                      加载更多
                    </button>
                  </div>
                )}

                {!hasMore && videos.length > 0 && (
                  <p className="text-center py-6 text-white/20 text-xs">已加载全部作品</p>
                )}
              </>
            )}
          </>
        ) : (
          <p className="text-white/40 text-sm text-center py-16">用户信息获取失败</p>
        )}
      </div>
    </div>
  );
}
