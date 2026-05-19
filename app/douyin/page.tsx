"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Flame, TrendingUp, ExternalLink, Loader2, RefreshCw, Clock, Play } from "lucide-react";

interface Topic {
  id: string;
  word: string;
  cover: string;
  hotValue: number;
  videoCount: number;
  type: "hot" | "trending" | "video";
}

function formatHot(n: number) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "亿";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}

export default function DouyinPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTime, setActiveTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTopics = async (keyword?: string) => {
    setLoading(true);
    setError("");
    try {
      const url = keyword
        ? `/api/douyin/hot?keyword=${encodeURIComponent(keyword)}`
        : "/api/douyin/hot";
      const res = await fetch(url);
      const data = await res.json();
      if (data.topics?.length) {
        setTopics(data.topics);
        setActiveTime(data.activeTime || "");
      } else {
        setError(data.error || "暂无数据");
        setTopics([]);
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTopics(); }, []);

  const openTopic = (topic: Topic) => {
    const q = encodeURIComponent(topic.word);
    window.open(`https://www.douyin.com/search/${q}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/drive")} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            <h1 className="text-lg font-bold text-white">抖音热榜</h1>
            {activeTime && <span className="text-[11px] text-white/30 ml-1">{activeTime}</span>}
          </div>
          <button onClick={() => fetchTopics()} className="ml-auto p-2 rounded-lg hover:bg-white/10 text-white/40">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.04] focus-within:border-orange-500/30">
          <Search className="w-3.5 h-3.5 text-white/20" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearchQuery(""); fetchTopics(searchQuery); } }}
            placeholder="搜索话题..."
            className="flex-1 bg-transparent outline-none text-white/70 text-xs placeholder:text-white/15"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); fetchTopics(); }} className="text-white/20 hover:text-white/50">
              ✕
            </button>
          )}
        </div>
      </header>

      {loading && topics.length === 0 && (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
      )}

      {error && (
        <div className="text-center py-20 text-white/30">
          <p>{error}</p>
          {!error.includes("暂无") && <button onClick={() => fetchTopics()} className="mt-3 px-4 py-2 bg-white/5 rounded-lg text-white/50 text-sm">重试</button>}
        </div>
      )}

      <div className="px-3 py-3">
        {topics.map((topic, i) => (
          <div
            key={topic.id || i}
            onClick={() => openTopic(topic)}
            className="flex items-center gap-3 px-2 py-3 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] transition-colors group"
          >
            <span className={`w-7 text-center text-sm font-bold flex-shrink-0 ${
              i < 3 ? "text-orange-500" : i < 10 ? "text-orange-400/70" : "text-white/25"
            }`}>
              {i + 1}
            </span>

            {topic.cover ? (
              <img
                src={topic.cover}
                alt=""
                className="w-12 h-16 rounded-md object-cover flex-shrink-0 bg-white/[0.04]"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-12 h-16 rounded-md bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 text-white/10" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-white/85 text-sm leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">
                {topic.word}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-orange-500/70">{formatHot(topic.hotValue)}</span>
                {topic.videoCount > 0 && <span className="text-[10px] text-white/20">{topic.videoCount}个视频</span>}
                {topic.type === "trending" && (
                  <span className="text-[10px] bg-orange-500/10 text-orange-400/70 px-1.5 py-0.5 rounded">上升</span>
                )}
              </div>
            </div>

            <ExternalLink className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors flex-shrink-0" />
          </div>
        ))}
      </div>

      {topics.length > 0 && (
        <div className="text-center py-4 text-[10px] text-white/10">
          数据来自抖音 · 点击打开抖音查看
        </div>
      )}
    </div>
  );
}
