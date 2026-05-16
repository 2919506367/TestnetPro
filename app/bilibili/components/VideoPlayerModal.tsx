"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, X, ExternalLink,
  Eye, Heart, MessageCircle, AlertCircle, ChevronRight, ChevronLeft,
  User, Shield, ShieldOff,
} from "lucide-react";
import DanmakuLayer from "./DanmakuLayer";
import CommentSection from "./CommentSection";

interface PlayVideo {
  bvid: string; aid: number; cid: number;
  title: string; author: string; authorFace: string; cover: string;
}

interface ResolvedPlayData {
  videoUrl: string; audioUrl: string | null;
  proxyVideoUrl: string | null; proxyAudioUrl: string | null;
  backupUrl: string | null; proxyBackupUrl: string | null;
  format: "durl" | "dash"; usingProxy: boolean;
  qn: number; qnLabel: string;
  qualities: { qn: number; label: string; active: boolean }[];
}

const QN_MAP: Record<number, string> = { 6: "240P", 16: "360P", 32: "480P", 64: "720P", 80: "1080P" };
const QN_OPTIONS = [6, 16, 32, 64, 80];
const DEFAULT_QN = 64;

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VideoPlayerModal({
  video,
  onClose,
  dark,
}: {
  video: PlayVideo | null;
  onClose: () => void;
  dark: boolean;
}) {
  const [resolved, setResolved] = useState<ResolvedPlayData | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "paused" | "error">("loading");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [forceProxy, setForceProxy] = useState(false);
  const [qn, setQn] = useState(DEFAULT_QN);
  const [showDanmaku, setShowDanmaku] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [loadSpeedKbps, setLoadSpeedKbps] = useState(0);
  const lastLoadedRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!video) return;
    setResolved(null);
    setStatus("loading");
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setLoadSpeedKbps(0);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/shorts/play?bvid=${video.bvid}&qn=${qn}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.videoUrl) {
          const useProxy = forceProxy && data.proxyVideoUrl;
          setResolved({
            videoUrl: useProxy || !data.proxyVideoUrl ? data.videoUrl : data.proxyVideoUrl,
            audioUrl: useProxy && data.proxyAudioUrl ? data.proxyAudioUrl : (data.audioUrl || null),
            proxyVideoUrl: data.proxyVideoUrl || null,
            proxyAudioUrl: data.proxyAudioUrl || null,
            backupUrl: data.backupUrl || null,
            proxyBackupUrl: data.proxyBackupUrl || null,
            format: data.format || "durl",
            usingProxy: useProxy,
            qn: data.qn || qn,
            qnLabel: data.qnLabel || QN_MAP[qn] || `${qn}P`,
            qualities: data.qualities || [],
          });
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [video?.bvid, qn, forceProxy]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolved) return;
    v.src = resolved.videoUrl;
    v.load();
    v.muted = muted || resolved.format === "dash";

    let speedTimer: ReturnType<typeof setInterval> | null = null;

    const onPlaying = () => {
      setStatus("playing");
      if (speedTimer) clearInterval(speedTimer);
      setLoadSpeedKbps(0);
    };
    const onPause = () => setStatus("paused");
    const onError = () => {
      if (resolved.proxyVideoUrl && !resolved.usingProxy) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.proxyVideoUrl!, usingProxy: true } : null);
      } else if (resolved.backupUrl) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.backupUrl!, backupUrl: null } : null);
      } else {
        setStatus("error");
      }
    };
    const onTime = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0); };
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };

    speedTimer = setInterval(() => {
      if (!v.buffered.length) return;
      const now = v.buffered.end(v.buffered.length - 1);
      if (now > 0 && v.duration > 0 && now < v.duration * 0.99) {
        const diff = now - lastLoadedRef.current;
        const elapsed = (Date.now() - lastTimeRef.current) / 1000;
        if (elapsed > 0.5 && diff > 0) {
          setLoadSpeedKbps(Math.round((diff * 8) / elapsed / 1000));
        }
        lastLoadedRef.current = now;
        lastTimeRef.current = Date.now();
      }
    }, 500);

    const onLoaded = () => { v.play().catch(() => {}); };

    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onError);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("progress", onProgress);
    v.addEventListener("loadedmetadata", onLoaded);

    return () => {
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onError);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("loadedmetadata", onLoaded);
      if (speedTimer) clearInterval(speedTimer);
    };
  }, [resolved?.videoUrl, muted]);

  const syncAudio = () => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;
    if (Math.abs(a.currentTime - v.currentTime) > 0.3) a.currentTime = v.currentTime;
  };

  const seek = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const bg = dark ? "bg-[#0a0a0a]" : "bg-white";
  const panelBg = dark ? "bg-[#141414]" : "bg-white";
  const panelBorder = dark ? "border-white/10" : "border-gray-200";

  if (!video) return null;

  return (
    <div className={`fixed inset-0 z-[70] ${bg} flex`}>
      {/* Close button */}
      <button
        onClick={onClose}
        className={`absolute top-4 left-4 z-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Main player area */}
      <div className={`flex-1 relative ${showComments ? "mr-[380px]" : ""} transition-all duration-300`}>
        <div className="absolute inset-0 flex items-center justify-center">
          {!resolved || status === "loading" ? (
            <div className="flex flex-col items-center gap-3">
              <img src={video.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-black/40" />
              <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin relative" />
              <p className="text-white/50 text-xs relative">获取播放源...</p>
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center gap-3 z-10">
              <AlertCircle className="w-10 h-10 text-white/60" />
              <p className="text-white/60 text-xs">播放失败</p>
              <a href={`https://www.bilibili.com/video/${video.bvid}`} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" /> 在B站观看
              </a>
              <div className="flex gap-1 mt-2">
                {QN_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => { setQn(opt); setStatus("loading"); }}
                    className={`px-2 py-1 rounded text-[10px] font-medium ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/50 hover:bg-white/20"}`}
                  >{QN_MAP[opt]}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                crossOrigin="anonymous"
                className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                playsInline preload="auto" poster={video.cover}
                onClick={togglePlay}
                onTimeUpdate={resolved.format === "dash" ? syncAudio : undefined}
              />
              {resolved.format === "dash" && resolved.audioUrl && (
                <audio ref={audioRef} crossOrigin="anonymous" src={resolved.audioUrl} preload="auto" />
              )}

              {/* Danmaku */}
              {showDanmaku && (
                <DanmakuLayer
                  cid={video.cid}
                  currentTime={currentTime}
                  playing={status === "playing"}
                  enabled={showDanmaku}
                  speed={10000}
                />
              )}

              {/* Center play/pause overlay */}
              {status === "paused" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Play className="w-14 h-14 text-white/70 drop-shadow-lg" />
                </div>
              )}

              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 z-40 p-4 bg-gradient-to-b from-black/50 to-transparent">
                <h2 className="text-white text-sm font-medium line-clamp-1 ml-10">{video.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 ml-10">
                  <img src={video.authorFace} alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-white/70 text-xs">{video.author}</span>
                </div>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/60 to-transparent">
                {/* Speed indicator */}
                {loadSpeedKbps > 0 && (
                  <div className="flex justify-end mb-1">
                    <span className="text-white/40 text-[9px] bg-black/40 px-2 py-0.5 rounded-full">
                      {loadSpeedKbps > 1000 ? `${(loadSpeedKbps / 1000).toFixed(1)}Mbps` : `${loadSpeedKbps}Kbps`}
                    </span>
                  </div>
                )}
                {/* Progress bar */}
                <div className="relative h-1 bg-white/20 rounded-full group hover:h-2 transition-all mb-1.5">
                  <div className="absolute left-0 top-0 h-full bg-white/30 rounded-full" style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }} />
                  <div className="absolute left-0 top-0 h-full bg-pink-500 rounded-full" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                  <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
                    onChange={(e) => seek(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-[11px]">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => setMuted(!muted)} className="p-1 rounded hover:bg-white/10">
                      {muted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-white/60" />}
                    </button>
                    <button onClick={() => setShowDanmaku(!showDanmaku)} className={`px-1.5 py-0.5 rounded text-[9px] ${showDanmaku ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>
                      弹{showDanmaku ? "✓" : ""}
                    </button>
                    <button onClick={() => setForceProxy(!forceProxy)} className={`px-1.5 py-0.5 rounded text-[9px] ${forceProxy ? "bg-green-500/30 text-green-300" : "bg-white/10 text-white/40"}`}>
                      {forceProxy ? "代理" : "直连"}
                    </button>
                    {QN_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setQn(opt)}
                        className={`px-1.5 py-0.5 rounded text-[9px] ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}
                      >{QN_MAP[opt]}</button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comments toggle button */}
      <button
        onClick={() => setShowComments(!showComments)}
        className={`absolute z-50 top-1/2 -translate-y-1/2 w-6 h-16 flex items-center justify-center transition-all duration-300 ${
          showComments ? "right-[380px]" : "right-0"
        } ${dark ? "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white/50 hover:text-white/80" : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"} rounded-l-lg`}
      >
        {showComments ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Right panel: comments */}
      <div
        className={`${panelBg} border-l ${panelBorder} overflow-y-auto transition-all duration-300 flex-shrink-0 ${
          showComments ? "w-[380px]" : "w-0 border-l-0 overflow-hidden"
        }`}
      >
        {showComments && (
          <div className="p-4">
            {/* Video info */}
            <h3 className={`text-sm font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>{video.title}</h3>
            <div className="flex items-center gap-3 mb-3">
              <img src={video.authorFace} alt="" className="w-8 h-8 rounded-full bg-gray-300" />
              <span className={`text-xs font-medium ${dark ? "text-white/70" : "text-gray-700"}`}>{video.author}</span>
            </div>
            <div className={`flex items-center gap-3 text-[10px] mb-4 ${dark ? "text-white/40" : "text-gray-500"}`}>
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />--</span>
              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />--</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />--</span>
            </div>
            {/* Comments */}
            <CommentSection aid={video.aid} dark={dark} />
          </div>
        )}
      </div>
    </div>
  );
}
