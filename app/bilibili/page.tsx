"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Play, Pause, Volume2, VolumeX, RefreshCw, ChevronRight,
  MessageCircle, SkipForward, SkipBack, ExternalLink,
} from "lucide-react";
import SearchBar from "./components/SearchBar";
import VideoGrid from "./components/VideoGrid";
import VideoPlayerModal from "./components/VideoPlayerModal";

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
  title: string; author: string; authorFace: string; cover: string;
}

export default function BilibiliPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [playingVideo, setPlayingVideo] = useState<PlayVideo | null>(null);
  const [shortsVideos, setShortsVideos] = useState<VideoItem[]>([]);
  const [shortsIndex, setShortsIndex] = useState(0);
  const [shortsLoading, setShortsLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUserProfile, setShowUserProfile] = useState<number | null>(null);
  const shortsSeedRef = useRef(Date.now());
  const shortsSeenBvids = useRef<Set<string>>(new Set());

  const fetchShorts = useCallback(async () => {
    setShortsLoading(true);
    try {
      const ex = Array.from(shortsSeenBvids.current).slice(-30).join(",");
      const res = await fetch(`/api/bili/feed?seed=${shortsSeedRef.current}&size=5&exclude=${ex}`);
      const data = await res.json();
      const list: VideoItem[] = data.videos || [];
      list.forEach((v) => shortsSeenBvids.current.add(v.id));
      setShortsVideos(list);
      setShortsIndex(0);
      shortsSeedRef.current = data.nextSeed || shortsSeedRef.current + 1;
    } catch {} finally {
      setShortsLoading(false);
    }
  }, []);

  useEffect(() => { fetchShorts(); }, []);

  const handlePlayFromGrid = (video: VideoItem) => {
    setPlayingVideo({
      bvid: video.bvid, aid: video.aid, cid: video.cid,
      title: video.title, author: video.author,
      authorFace: video.authorFace, cover: video.cover,
    });
  };

  const handlePlayFromSearch = (v: PlayVideo) => {
    setPlayingVideo(v);
  };

  const handlePlayFromShorts = (video: VideoItem) => {
    setPlayingVideo({
      bvid: video.bvid, aid: video.aid, cid: video.cid,
      title: video.title, author: video.author,
      authorFace: video.authorFace, cover: video.cover,
    });
  };

  const handleViewUser = (mid: number) => {
    setShowUserProfile(mid);
  };

  const bg = dark ? "bg-[#0a0a0a]" : "bg-[#f4f5f7]";
  const shortsCardBg = dark ? "bg-[#1a1a1a]" : "bg-white";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-white/50" : "text-gray-500";

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Search bar */}
      <SearchBar
        onPlayVideo={handlePlayFromSearch}
        onViewUser={handleViewUser}
        dark={dark}
      />

      {/* Main content area with grid + shorts section */}
      <div className="max-w-[1600px] mx-auto">
        <VideoGrid
          onPlayVideo={handlePlayFromGrid}
          refreshTrigger={refreshTrigger}
          dark={dark}
        />

        {/* Shorts section divider */}
        <div className={`px-4 sm:px-6 pb-2 ${dark ? "bg-[#141414]" : "bg-[#f4f5f7]"}`}>
          <div className={`flex items-center gap-3 mb-3 ${dark ? "border-t border-white/5" : "border-t border-gray-200"} pt-6`}>
            <h2 className={`text-lg font-bold ${textPrimary}`}>短视频</h2>
            <button
              onClick={fetchShorts}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                dark ? "text-white/40 hover:text-white/70" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <RefreshCw className="w-3 h-3" /> 换一批
            </button>
          </div>
        </div>

        {/* Shorts horizontal strip */}
        <div className={`px-4 sm:px-6 pb-8 ${dark ? "bg-[#141414]" : "bg-[#f4f5f7]"}`}>
          {shortsLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`${shortsCardBg} rounded-xl overflow-hidden flex-shrink-0 w-[180px] animate-pulse`}>
                  <div className="aspect-[9/16] bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {shortsVideos.map((video, idx) => (
                <div
                  key={video.id}
                  onClick={() => handlePlayFromShorts(video)}
                  className={`${shortsCardBg} rounded-xl overflow-hidden flex-shrink-0 w-[160px] sm:w-[180px] cursor-pointer group transition-all hover:scale-[1.02] ${
                    dark ? "shadow-lg shadow-black/20" : "shadow-md"
                  }`}
                >
                  <div className="aspect-[9/16] relative overflow-hidden">
                    <img
                      src={video.cover}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-90 transition-all drop-shadow-lg" />
                    </div>
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
                      {video.duration}
                    </span>
                  </div>
                  <div className="p-2">
                    <h3 className={`text-xs font-medium line-clamp-2 leading-snug ${textPrimary}`}>
                      {video.title}
                    </h3>
                    <p className={`text-[10px] mt-1 ${textSecondary} truncate`}>
                      @{video.author}
                    </p>
                    <div className={`flex items-center gap-2 mt-1 text-[9px] ${textSecondary}`}>
                      <span>{video.playCount}播放</span>
                      <span>❤ {video.likeCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
          dark={dark}
        />
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <UserProfileModal
          mid={showUserProfile}
          onClose={() => setShowUserProfile(null)}
          onPlayVideo={handlePlayFromSearch}
          dark={dark}
        />
      )}
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

  useEffect(() => {
    (async () => {
      try {
        const [pRes, vRes] = await Promise.all([
          fetch(`/api/bili/user/${mid}`),
          fetch(`/api/bili/user/${mid}/videos`),
        ]);
        setProfile(await pRes.json());
        setVideos(((await vRes.json()) as any).videos || []);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [mid]);

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
              <img src={profile.face} alt="" className="w-16 h-16 rounded-full" />
              <div>
                <h2 className={`text-lg font-semibold ${textPrimary}`}>{profile.name}</h2>
                <p className={`text-xs mt-1 ${textSecondary}`}>{profile.followerCount}粉丝 · {profile.videoCount}视频</p>
                {profile.sign && <p className={`text-xs mt-1 ${textSecondary}`}>{profile.sign}</p>}
              </div>
            </div>
            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>作品列表</h3>
            {videos.length === 0 ? (
              <p className={`text-sm text-center py-8 ${textSecondary}`}>暂无公开作品</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {videos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onClose();
                      onPlayVideo({
                        bvid: v.bvid, aid: v.aid, cid: v.cid,
                        title: v.title, author: v.author,
                        authorFace: v.authorFace, cover: v.cover,
                      });
                    }}
                    className={`${cardBg} rounded-xl overflow-hidden transition-all text-left w-full`}
                  >
                    <div className="aspect-video overflow-hidden">
                      <img src={v.cover} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-2">
                      <h4 className={`text-xs line-clamp-2 mb-1 ${textPrimary}`}>{v.title}</h4>
                      <p className={`text-[10px] ${textSecondary}`}>{v.playCount}播放 · {v.duration}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className={`text-sm text-center py-8 ${textSecondary}`}>用户信息获取失败</p>
        )}
      </div>
    </div>
  );
}
