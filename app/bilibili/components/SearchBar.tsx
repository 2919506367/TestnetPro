"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2, Play, User } from "lucide-react";
import { proxyUrl, imgOnError } from "@/lib/bilibili";

interface SearchVideoResult {
  bvid: string; aid: number; cid: number;
  title: string; author: string; authorMid: number;
  authorFace: string; cover: string;
  playCount: string; duration: string;
}

interface SearchUserResult {
  mid: number; name: string; face: string;
  sign: string; followerCount: string; videoCount: number;
}

export default function SearchBar({
  onPlayVideo,
  onViewUser,
  dark,
}: {
  onPlayVideo: (video: { bvid: string; aid: number; cid: number; title: string; author: string; authorFace: string; cover: string }) => void;
  onViewUser: (mid: number) => void;
  dark: boolean;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"video" | "user">("video");
  const [results, setResults] = useState<(SearchVideoResult | SearchUserResult)[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const doSearch = useCallback(async (q: string, t: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/bili/search?q=${encodeURIComponent(q)}&type=${t}`);
      const data = await res.json();
      setResults(data.results || []);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        doSearch(val, type);
      } else {
        setResults([]);
        setSearched(false);
        setShowDropdown(false);
      }
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query, type);
    }
  };

  const handleTypeChange = (t: "video" | "user") => {
    setType(t);
    setResults([]);
    setSearched(false);
    if (query.trim()) doSearch(query, t);
  };

  const bg = dark ? "bg-[#1f1f1f]" : "bg-white";
  const inputBg = dark ? "bg-[#2a2a2a]" : "bg-gray-100";
  const textColor = dark ? "text-white" : "text-gray-900";
  const placeholderColor = dark ? "placeholder:text-white/30" : "placeholder:text-gray-400";
  const borderColor = dark ? "border-white/10" : "border-gray-200";
  const dropdownBg = dark ? "bg-[#1f1f1f] border-white/10" : "bg-white border-gray-200";
  const hoverBg = dark ? "hover:bg-white/5" : "hover:bg-gray-50";
  const subtitleColor = dark ? "text-white/40" : "text-gray-500";
  const activeTabBg = dark ? "bg-pink-500/20 text-pink-400" : "bg-pink-50 text-pink-600";
  const inactiveTab = dark ? "text-white/50" : "text-gray-500";

  return (
    <div className={`${bg} border-b ${borderColor} px-4 py-3 relative`} ref={dropdownRef}>
      <div className="max-w-2xl mx-auto flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder={type === "video" ? "搜索视频..." : "搜索用户名/UID..."}
            className={`w-full ${inputBg} ${textColor} ${placeholderColor} text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all focus:ring-2 ${dark ? "focus:ring-pink-500/50" : "focus:ring-pink-400/50"}`}
          />
          {searching ? (
            <Loader2 className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 animate-spin ${subtitleColor}`} />
          ) : (
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subtitleColor}`} />
          )}
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setSearched(false); setShowDropdown(false); inputRef.current?.focus(); }}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${subtitleColor} hover:${textColor}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showDropdown && searched && (
        <div className={`absolute left-0 right-0 top-full z-50 ${dropdownBg} border-b ${borderColor} shadow-2xl max-h-[70vh] overflow-y-auto`}>
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => handleTypeChange("video")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${type === "video" ? activeTabBg : `${inactiveTab} ${hoverBg}`}`}
              >
                搜视频
              </button>
              <button
                onClick={() => handleTypeChange("user")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${type === "user" ? activeTabBg : `${inactiveTab} ${hoverBg}`}`}
              >
                搜用户
              </button>
            </div>

            {searching && (
              <div className="flex justify-center py-8">
                <Loader2 className={`w-5 h-5 animate-spin ${subtitleColor}`} />
              </div>
            )}

            {!searching && results.length === 0 && (
              <p className={`text-sm text-center py-8 ${subtitleColor}`}>未找到相关内容</p>
            )}

            {!searching && results.length > 0 && (
              <div className="space-y-1">
                {results.map((item, i) =>
                  type === "video" ? (
                    <button
                      key={i}
                      onClick={() => {
                        const v = item as SearchVideoResult;
                        onPlayVideo({
                          bvid: v.bvid, aid: v.aid, cid: v.cid,
                          title: v.title, author: v.author,
                          authorFace: v.authorFace, cover: v.cover,
                        });
                        setShowDropdown(false);
                      }}
                      className={`flex gap-3 p-2 rounded-xl ${hoverBg} transition-all w-full text-left`}
                    >
                      <div className="relative flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden bg-gray-800">
                        <img src={proxyUrl((item as SearchVideoResult).cover)} alt="" className="w-full h-full object-cover" loading="lazy" onError={imgOnError} />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
                          {(item as SearchVideoResult).duration}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <h3 className={`${textColor} text-sm line-clamp-2 leading-snug`}>{(item as SearchVideoResult).title}</h3>
                        <p className={`${subtitleColor} text-xs mt-1`}>{(item as SearchVideoResult).author} · {(item as SearchVideoResult).playCount}播放</p>
                      </div>
                    </button>
                  ) : (
                    <button
                      key={i}
                      onClick={() => {
                        onViewUser((item as SearchUserResult).mid);
                        setShowDropdown(false);
                      }}
                      className={`flex gap-3 p-2 rounded-xl ${hoverBg} transition-all w-full text-left`}
                    >
                      <img src={proxyUrl((item as SearchUserResult).face)} alt="" className="w-10 h-10 rounded-full flex-shrink-0 bg-gray-300" onError={imgOnError} />
                      <div className="flex-1 min-w-0">
                        <h3 className={`${textColor} text-sm font-medium`}>{(item as SearchUserResult).name}</h3>
                        <p className={`${subtitleColor} text-xs`}>{(item as SearchUserResult).followerCount}粉丝 · {(item as SearchUserResult).videoCount}视频</p>
                        {(item as SearchUserResult).sign && (
                          <p className={`${subtitleColor} text-[11px] line-clamp-1 mt-0.5`}>{(item as SearchUserResult).sign}</p>
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
