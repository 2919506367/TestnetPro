"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play, Pause, Volume2, VolumeX, X, ExternalLink, Settings2,
  AlertCircle, ChevronRight, ChevronLeft, Shield, ShieldOff, Gauge,
} from "lucide-react";
import { proxyUrl } from "@/lib/bilibili";
import DanmakuLayer, { DanmakuSettings, DANMAKU_DEFAULTS } from "./DanmakuLayer";
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
}

const QN_MAP: Record<number, string> = { 6: "240P", 16: "360P", 32: "480P", 64: "720P", 80: "1080P" };
const QN_OPTIONS = [6, 16, 32, 64, 80];
const DEFAULT_QN = 64;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VideoPlayerModal({
  video, onClose, dark, forceProxy,
}: {
  video: PlayVideo | null;
  onClose: () => void;
  dark: boolean;
  forceProxy: boolean;
}) {
  const [phase, setPhase] = useState<"resolving" | "buffering" | "playing" | "paused" | "error" | "fallback">("resolving");
  const [resolved, setResolved] = useState<ResolvedPlayData | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [qn, setQn] = useState(DEFAULT_QN);
  const [showComments, setShowComments] = useState(true);
  const [useProxy, setUseProxy] = useState(forceProxy);
  const [retryCount, setRetryCount] = useState(0);
  const [loadSpeedKbps, setLoadSpeedKbps] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [danmaku, setDanmaku] = useState<DanmakuSettings>(DANMAKU_DEFAULTS);
  const [showDanmakuSettings, setShowDanmakuSettings] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastLoadedRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!video) return;
    setPhase("resolving"); setResolved(null);
    setCurrentTime(0); setDuration(0); setBuffered(0); setLoadSpeedKbps(0);
    setUseProxy(forceProxy);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/shorts/play?bvid=${video.bvid}&qn=${qn}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.videoUrl) {
          const proxyMode = forceProxy && data.proxyVideoUrl;
          const r: ResolvedPlayData = {
            videoUrl: proxyMode ? data.proxyVideoUrl : data.videoUrl,
            audioUrl: proxyMode && data.proxyAudioUrl ? data.proxyAudioUrl : (data.audioUrl || null),
            proxyVideoUrl: data.proxyVideoUrl || null, proxyAudioUrl: data.proxyAudioUrl || null,
            backupUrl: data.backupUrl || null, proxyBackupUrl: data.proxyBackupUrl || null,
            format: data.format || "durl", usingProxy: proxyMode,
            qn: data.qn || qn, qnLabel: data.qnLabel || QN_MAP[qn] || `${qn}P`,
          };
          setResolved(r); setPhase("buffering");
        } else if (data.fallback) { setPhase("fallback"); }
        else { setPhase("error"); }
      } catch { if (!cancelled) setPhase("error"); }
    })();
    return () => { cancelled = true; };
  }, [video?.bvid, qn, forceProxy, retryCount]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolved) return;
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    v.src = resolved.videoUrl;
    v.playbackRate = playbackRate;
    v.load();
    v.muted = muted || resolved.format === "dash";

    let speedTimer: ReturnType<typeof setInterval> | null = null;
    const onPlaying = () => { setPhase("playing"); if (speedTimer) clearInterval(speedTimer); setLoadSpeedKbps(0); if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current); };
    const onPause = () => { if (phase !== "buffering") setPhase("paused"); };
    const onError = () => {
      if (resolved.proxyVideoUrl && !resolved.usingProxy) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.proxyVideoUrl!, usingProxy: true } : null);
        setUseProxy(true);
      } else if (resolved.backupUrl) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.backupUrl!, backupUrl: null } : null);
      } else { setPhase("error"); }
    };
    const onTime = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0); };
    const onProgress = () => { if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1)); };
    const onLoaded = () => { v.play().catch(() => {}); };

    speedTimer = setInterval(() => {
      if (!v.buffered.length) return;
      const now = v.buffered.end(v.buffered.length - 1);
      if (now > 0 && v.duration > 0 && now < v.duration * 0.99) {
        const diff = now - lastLoadedRef.current;
        const elapsed = (Date.now() - lastTimeRef.current) / 1000;
        if (elapsed > 0.5 && diff > 0) setLoadSpeedKbps(Math.round((diff * 8) / elapsed / 1000));
        lastLoadedRef.current = now; lastTimeRef.current = Date.now();
      }
    }, 500);

    loadTimeoutRef.current = setTimeout(() => {
      if (phase === "buffering" && resolved.proxyVideoUrl && !resolved.usingProxy) {
        setResolved((prev) => prev ? { ...prev, videoUrl: resolved.proxyVideoUrl!, usingProxy: true } : null);
        setUseProxy(true);
      }
    }, 10000);

    v.addEventListener("playing", onPlaying); v.addEventListener("pause", onPause);
    v.addEventListener("error", onError); v.addEventListener("timeupdate", onTime);
    v.addEventListener("progress", onProgress); v.addEventListener("loadedmetadata", onLoaded);
    return () => {
      v.removeEventListener("playing", onPlaying); v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onError); v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("progress", onProgress); v.removeEventListener("loadedmetadata", onLoaded);
      if (speedTimer) clearInterval(speedTimer);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [resolved?.videoUrl, muted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const syncAudio = () => {
    const v = videoRef.current; const a = audioRef.current;
    if (!v || !a) return;
    if (Math.abs(a.currentTime - v.currentTime) > 0.3) a.currentTime = v.currentTime;
  };
  const seek = (t: number) => { if (videoRef.current) videoRef.current.currentTime = t; };
  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };

  if (!video) return null;

  const panelBg = dark ? "bg-[#141414]" : "bg-white";
  const panelBorder = dark ? "border-white/10" : "border-gray-200";
  const showVideo = resolved && (phase === "buffering" || phase === "playing" || phase === "paused" || phase === "error");
  const showOverlays = phase === "playing" || phase === "paused" || phase === "buffering";

  return (
    <div className="fixed inset-0 z-[70] bg-black flex relative">
      <button onClick={onClose}
        className="absolute top-4 left-4 z-50 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
        <X className="w-4 h-4" />
      </button>

      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {phase === "resolving" && (
            <div className="flex flex-col items-center gap-3">
              <img src={proxyUrl(video.cover)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-black/40" />
              <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin relative z-10" />
              <p className="text-white/50 text-xs relative z-10">获取播放源...</p>
            </div>
          )}

          {showVideo && (
            <video ref={videoRef} crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-contain cursor-pointer"
              playsInline preload="auto" poster={proxyUrl(video.cover)}
              onClick={togglePlay}
              onTimeUpdate={resolved.format === "dash" ? syncAudio : undefined}
            />
          )}
          {showVideo && resolved.format === "dash" && resolved.audioUrl && (
            <audio ref={audioRef} crossOrigin="anonymous" src={resolved.audioUrl} preload="auto" />
          )}

          {phase === "buffering" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <img src={proxyUrl(video.cover)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-black/50" />
              <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
              <p className="text-white/50 text-xs mt-3">缓冲中...</p>
              {loadSpeedKbps > 0 && (
                <p className="text-white/40 text-[10px] mt-1">{loadSpeedKbps > 1000 ? `${(loadSpeedKbps / 1000).toFixed(1)} Mbps` : `${loadSpeedKbps} Kbps`}</p>
              )}
            </div>
          )}

          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
              <img src={proxyUrl(video.cover)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-black/60" />
              <AlertCircle className="w-10 h-10 text-white/60 relative" />
              <p className="text-white/60 text-xs mt-3 relative">播放失败</p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3 relative">
                <button onClick={() => { setRetryCount((c) => c + 1); }} className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20" >重试</button>
                {resolved?.proxyVideoUrl && !resolved.usingProxy && (
                  <button onClick={() => { setUseProxy(true); setRetryCount((c) => c + 1); }} className="px-4 py-2 rounded-xl bg-green-500/20 text-green-300 text-xs hover:bg-green-500/30 flex items-center gap-1"><Shield className="w-3 h-3" /> 代理重试</button>
                )}
                <a href={`https://www.bilibili.com/video/${video.bvid}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 flex items-center gap-2"><ExternalLink className="w-3.5 h-3.5" /> 在B站观看</a>
              </div>
              <div className="flex gap-1 mt-3 relative">
                {QN_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => { setQn(opt); setRetryCount((c) => c + 1); }} className={`px-2 py-1 rounded text-[10px] font-medium ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>{QN_MAP[opt]}</button>
                ))}
              </div>
            </div>
          )}

          {phase === "fallback" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 text-center">
              <img src={proxyUrl(video.cover)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-black/60" />
              <AlertCircle className="w-12 h-12 text-amber-400/80 relative" />
              <p className="text-white/70 text-sm font-medium mt-3 relative">该视频暂无播放源</p>
              <p className="text-white/40 text-xs mt-1 relative">B站可能限制了该视频的第三方播放</p>
              <a href={`https://www.bilibili.com/video/${video.bvid}`} target="_blank" rel="noopener noreferrer" className="mt-4 px-5 py-2.5 rounded-xl bg-pink-500/80 text-white text-sm hover:bg-pink-500 flex items-center gap-2 relative"><ExternalLink className="w-4 h-4" /> 前往B站观看</a>
              <button onClick={() => setRetryCount((c) => c + 1)} className="text-white/30 text-xs hover:text-white/60 mt-3 relative">重试加载</button>
            </div>
          )}

          {phase === "paused" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <Play className="w-14 h-14 text-white/70 drop-shadow-lg" />
            </div>
          )}

          {danmaku.enabled && resolved && (phase === "playing" || phase === "paused") && (
            <DanmakuLayer cid={video.cid} currentTime={currentTime} playing={phase === "playing"} settings={danmaku} />
          )}

          {showOverlays && (
            <>
              <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                <h2 className="text-white text-sm font-medium line-clamp-1 ml-10">{video.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 ml-10">
                  <img src={proxyUrl(video.authorFace)} alt="" className="w-5 h-5 rounded-full bg-gray-500" />
                  <span className="text-white/70 text-xs">{video.author}</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/60 to-transparent">
                {loadSpeedKbps > 0 && phase === "buffering" && (
                  <div className="flex justify-end mb-1">
                    <span className="text-white/40 text-[9px] bg-black/40 px-2 py-0.5 rounded-full">{loadSpeedKbps > 1000 ? `${(loadSpeedKbps / 1000).toFixed(1)}Mbps` : `${loadSpeedKbps}Kbps`}</span>
                  </div>
                )}
                <div className="relative h-1 bg-white/20 rounded-full group hover:h-2 transition-all mb-1.5">
                  <div className="absolute left-0 top-0 h-full bg-white/30 rounded-full" style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }} />
                  <div className="absolute left-0 top-0 h-full bg-pink-500 rounded-full" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                  <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime} onChange={(e) => seek(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-[11px]">{fmtTime(currentTime)} / {fmtTime(duration)}</span>

                  {/* Playback speed */}
                  <div className="relative">
                    <button onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className={`px-2 py-1 rounded text-[10px] flex items-center gap-0.5 pointer-events-auto ${playbackRate !== 1 ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>
                      <Gauge className="w-3 h-3" /> {playbackRate}x
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1f1f1f] border border-white/10 rounded-xl p-1.5 flex flex-col gap-0.5 z-50">
                        {SPEED_OPTIONS.map((s) => (
                          <button key={s} onClick={() => { setPlaybackRate(s); setShowSpeedMenu(false); }}
                            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${playbackRate === s ? "bg-pink-500/30 text-pink-300" : "text-white/50 hover:bg-white/10 hover:text-white/70"}`}
                          >{s}x</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => setMuted(!muted)} className="p-1 rounded hover:bg-white/10 pointer-events-auto">
                      {muted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-white/60" />}
                    </button>
                    <button onClick={() => setDanmaku((p) => ({ ...p, enabled: !p.enabled }))}
                      className={`px-2 py-1 rounded text-[10px] pointer-events-auto ${danmaku.enabled ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>
                      弹{danmaku.enabled ? "✓" : ""}
                    </button>
                    <button onClick={() => setShowDanmakuSettings(!showDanmakuSettings)}
                      className={`px-2 py-1 rounded text-[10px] pointer-events-auto ${showDanmakuSettings ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>
                      <Settings2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setUseProxy(!useProxy); setRetryCount((c) => c + 1); }}
                      className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 pointer-events-auto ${useProxy ? "bg-green-500/30 text-green-300" : "bg-white/10 text-white/60"}`}>
                      {useProxy ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                      {useProxy ? "代理" : "直连"}
                    </button>
                    {QN_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setQn(opt)}
                        className={`px-1.5 py-0.5 rounded text-[9px] pointer-events-auto ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>{QN_MAP[opt]}</button>
                    ))}
                  </div>
                </div>

                {/* Danmaku settings panel */}
                {showDanmakuSettings && (
                  <div className="mt-2 p-3 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-white/60 text-[10px]">
                      <span className="w-10 flex-shrink-0">透明度</span>
                      <input type="range" min={10} max={100} value={Math.round(danmaku.opacity * 100)}
                        onChange={(e) => setDanmaku((p) => ({ ...p, opacity: Number(e.target.value) / 100 }))}
                        className="flex-1 h-1 accent-pink-500" />
                      <span className="w-6 text-right">{Math.round(danmaku.opacity * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-[10px]">
                      <span className="w-10 flex-shrink-0">字号</span>
                      <input type="range" min={14} max={36} value={danmaku.fontSize}
                        onChange={(e) => setDanmaku((p) => ({ ...p, fontSize: Number(e.target.value) }))}
                        className="flex-1 h-1 accent-pink-500" />
                      <span className="w-6 text-right">{danmaku.fontSize}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-[10px]">
                      <span className="w-10 flex-shrink-0">速度</span>
                      <input type="range" min={4000} max={16000} step={500} value={danmaku.speed}
                        onChange={(e) => setDanmaku((p) => ({ ...p, speed: Number(e.target.value) }))}
                        className="flex-1 h-1 accent-pink-500" />
                      <span className="w-10 text-right">{danmaku.speed}ms</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => setDanmaku((p) => ({ ...p, blockTop: !p.blockTop }))}
                        className={`px-2 py-0.5 rounded text-[9px] ${danmaku.blockTop ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>屏蔽顶部</button>
                      <button onClick={() => setDanmaku((p) => ({ ...p, blockBottom: !p.blockBottom }))}
                        className={`px-2 py-0.5 rounded text-[9px] ${danmaku.blockBottom ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>屏蔽底部</button>
                      <button onClick={() => setDanmaku((p) => ({ ...p, blockScroll: !p.blockScroll }))}
                        className={`px-2 py-0.5 rounded text-[9px] ${danmaku.blockScroll ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>屏蔽滚动</button>
                      <button onClick={() => setDanmaku((p) => ({ ...p, dedupe: !p.dedupe }))}
                        className={`px-2 py-0.5 rounded text-[9px] ${danmaku.dedupe ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40"}`}>{danmaku.dedupe ? "去重:开" : "去重:关"}</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <button onClick={() => setShowComments(!showComments)}
        className={`absolute z-50 top-1/2 -translate-y-1/2 w-6 h-16 flex items-center justify-center transition-all duration-300 ${showComments ? "right-[380px]" : "right-0"} bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white/50 hover:text-white/80 rounded-l-lg`}>
        {showComments ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <div className={`${panelBg} border-l ${panelBorder} overflow-y-auto transition-all duration-300 flex-shrink-0 ${showComments ? "w-[380px]" : "w-0 border-l-0 overflow-hidden"}`}>
        {showComments && (
          <div className="p-4">
            <h3 className={`text-sm font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>{video.title}</h3>
            <div className="flex items-center gap-3 mb-3">
              <img src={proxyUrl(video.authorFace)} alt="" className="w-8 h-8 rounded-full bg-gray-300" />
              <span className={`text-xs font-medium ${dark ? "text-white/70" : "text-gray-700"}`}>{video.author}</span>
            </div>
            <CommentSection aid={video.aid} dark={dark} />
          </div>
        )}
      </div>
    </div>
  );
}
