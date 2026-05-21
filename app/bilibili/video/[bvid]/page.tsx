"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play, Pause, Volume2, VolumeX, ArrowLeft, ExternalLink,
  AlertCircle, Gauge, Settings2, Eye, Heart,
  MessageCircle, Clock, Loader2, ChevronLeft,
} from "lucide-react";
import { proxyUrl, formatPubdate } from "@/lib/bilibili";
import BiliImage from "../../components/BiliImage";
import DanmakuLayer, { DanmakuSettings, DANMAKU_DEFAULTS } from "../../components/DanmakuLayer";
import CommentSection from "../../components/CommentSection";

interface PlayData {
  videoUrl: string; audioUrl: string | null;
  proxyVideoUrl: string | null; proxyAudioUrl: string | null;
  backupUrl: string | null; proxyBackupUrl: string | null;
  format: "durl" | "dash"; usingProxy: boolean;
  qn: number; qnLabel: string; cid: number;
}

interface VideoInfo {
  bvid: string; aid: number; cid: number;
  title: string; desc: string; author: string; authorMid: number;
  authorFace: string; cover: string;
  playCount: string; likeCount: string; coinCount: string;
  shareCount: string; danmakuCount: string; replyCount: string;
  duration: string; durationSec: number; pubdate: number;
}

interface RelatedVideo {
  id: string; bvid: string; aid: number; cid: number;
  title: string; author: string; cover: string;
  playCount: string; duration: string; durationSec: number;
}

const QN_MAP: Record<number, string> = { 6: "240P", 16: "360P", 32: "480P", 64: "720P", 80: "1080P" };
const QN_OPTIONS = [16, 32, 64, 80];
const DEFAULT_QN = 64;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
    </div>
  );
}

export default function VideoPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VideoDetail />
    </Suspense>
  );
}

function VideoDetail() {
  const params = useParams();
  const router = useRouter();
  const bvid = params.bvid as string;

  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [playData, setPlayData] = useState<PlayData | null>(null);
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [phase, setPhase] = useState<"loading" | "resolving" | "buffering" | "playing" | "paused" | "error">("loading");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [qn, setQn] = useState(DEFAULT_QN);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [danmaku, setDanmaku] = useState<DanmakuSettings>(DANMAKU_DEFAULTS);
  const [showDanmakuSettings, setShowDanmakuSettings] = useState(false);
  const [relatedExpanded, setRelatedExpanded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch video info + related
  useEffect(() => {
    if (!bvid) return;
    setPhase("loading");
    (async () => {
      try {
        const [infoRes, relatedRes] = await Promise.all([
          fetch(`/api/bili/video?bvid=${bvid}`),
          fetch(`/api/bili/related?bvid=${bvid}`),
        ]);
        const infoData = await infoRes.json();
        const relatedData = await relatedRes.json();

        if (infoData.bvid) {
          setInfo({
            bvid: infoData.bvid, aid: infoData.aid || 0, cid: infoData.cid || 0,
            title: infoData.title || "", desc: infoData.description || "",
            author: infoData.author || "", authorMid: infoData.authorMid || 0,
            authorFace: infoData.authorFace || "", cover: infoData.cover || "",
            playCount: infoData.playCount || "0", likeCount: infoData.likeCount || "0",
            coinCount: infoData.coinCount || "0", shareCount: infoData.shareCount || "0",
            danmakuCount: infoData.danmakuCount || "0", replyCount: infoData.replyCount || "0",
            duration: infoData.duration || "0:00", durationSec: infoData.durationSec || 0,
            pubdate: infoData.pubdate || 0,
          });
        }
        if (relatedData.videos) {
          setRelated(relatedData.videos.slice(0, 12));
        }
      } catch {}
    })();
  }, [bvid]);

  // Resolve play URL
  useEffect(() => {
    if (!bvid) return;
    setPhase("resolving");
    (async () => {
      try {
        const res = await fetch(`/api/shorts/play?bvid=${bvid}&qn=${qn}`);
        const data = await res.json();
        if (data.videoUrl) {
          const proxy = !!(data.proxyVideoUrl);
          setPlayData({
            videoUrl: proxy ? data.proxyVideoUrl : data.videoUrl,
            audioUrl: proxy && data.proxyAudioUrl ? data.proxyAudioUrl : (data.audioUrl || null),
            proxyVideoUrl: data.proxyVideoUrl || null, proxyAudioUrl: data.proxyAudioUrl || null,
            backupUrl: data.backupUrl || null, proxyBackupUrl: data.proxyBackupUrl || null,
            format: data.format || "durl", usingProxy: proxy,
            qn: data.qn || qn, qnLabel: data.qnLabel || QN_MAP[qn],
            cid: Number(data.cid || 0),
          });
          setPhase("buffering");
        } else { setPhase("error"); }
      } catch { setPhase("error"); }
    })();
  }, [bvid, qn, retryCount]);

  // Video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playData) return;
    v.src = playData.videoUrl;
    v.playbackRate = playbackRate;
    v.load();
    v.muted = muted || playData.format === "dash";

    const onPlaying = () => setPhase("playing");
    const onPause = () => { setPhase(prev => prev === "buffering" ? prev : "paused"); };
    const onWaiting = () => setPhase("buffering");
    const onError = () => {
      if (playData.proxyVideoUrl && playData.videoUrl !== playData.proxyVideoUrl) {
        setPlayData(prev => prev ? { ...prev, videoUrl: playData.proxyVideoUrl!, usingProxy: true } : null);
      } else if (playData.backupUrl) {
        setPlayData(prev => prev ? { ...prev, videoUrl: playData.backupUrl!, backupUrl: null } : null);
      } else if (playData.proxyBackupUrl && playData.videoUrl !== playData.proxyBackupUrl) {
        setPlayData(prev => prev ? { ...prev, videoUrl: playData.proxyBackupUrl!, usingProxy: true } : null);
      } else { setPhase("error"); }
    };
    const onTime = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0); };
    const onProgress = () => {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onCanPlay = () => { v.play().catch(() => {}); };

    v.addEventListener("playing", onPlaying); v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWaiting); v.addEventListener("error", onError);
    v.addEventListener("timeupdate", onTime); v.addEventListener("progress", onProgress);
    v.addEventListener("canplay", onCanPlay);
    return () => {
      v.removeEventListener("playing", onPlaying); v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWaiting); v.removeEventListener("error", onError);
      v.removeEventListener("timeupdate", onTime); v.removeEventListener("progress", onProgress);
      v.removeEventListener("canplay", onCanPlay);
    };
  }, [playData?.videoUrl, muted]);

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackRate; }, [playbackRate]);

  const syncAudio = () => {
    const v = videoRef.current; const a = audioRef.current;
    if (!v || !a) return;
    if (Math.abs(a.currentTime - v.currentTime) > 0.3) a.currentTime = v.currentTime;
  };
  const seek = (t: number) => { if (videoRef.current) videoRef.current.currentTime = t; };
  const togglePlay = () => { const v = videoRef.current; if (!v) return; v.paused ? v.play().catch(() => {}) : v.pause(); };

  const goToRelated = (rvid: string) => {
    router.push(`/bilibili/video/${rvid}`);
  };

  const isPlaying = phase === "playing" || phase === "paused";

  if (phase === "loading") return <LoadingFallback />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/[0.08] px-4 py-3">
        <div className="max-w-[1500px] mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/bilibili")} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60" title="返回首页">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-medium text-white/70 line-clamp-1 flex-1">{info?.title || bvid}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setMuted(!muted)} className="p-1.5 rounded hover:bg-white/10 text-white/60">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <a href={`https://www.bilibili.com/video/${bvid}`} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/50 text-xs hover:bg-white/15 hover:text-white/70 flex items-center gap-1 transition-colors">
              <ExternalLink className="w-3 h-3" /> B站观看
            </a>
            <button onClick={() => setRelatedExpanded(!relatedExpanded)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                relatedExpanded ? "bg-pink-500/20 text-pink-300" : "bg-white/[0.06] text-white/50 hover:bg-white/15"
              }`}>
              相关 <ChevronLeft className={`w-3 h-3 transition-transform ${relatedExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto flex flex-col lg:flex-row">
        {/* Main area: player + meta + comments */}
        <div className="flex-1 min-w-0">
          {/* Video player */}
          <div className="relative bg-black" style={{ aspectRatio: "16/9", maxHeight: "calc(100vh - 180px)" }}>
            {playData && (
              <>
                <video
                  ref={videoRef}
                  crossOrigin="anonymous"
                  className="absolute inset-0 w-full h-full object-contain"
                  playsInline
                  poster={info ? proxyUrl(info.cover) : undefined}
                  onClick={togglePlay}
                  onTimeUpdate={playData.format === "dash" ? syncAudio : undefined}
                />
                {playData.format === "dash" && playData.audioUrl && (
                  <audio ref={audioRef} crossOrigin="anonymous" src={playData.audioUrl} preload="auto" />
                )}
              </>
            )}

            {(phase === "resolving" || phase === "buffering") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 pointer-events-none">
                <Loader2 className="w-10 h-10 text-pink-400 animate-spin" />
                <p className="text-white/40 text-sm mt-3">{phase === "resolving" ? "获取播放源..." : "缓冲中..."}</p>
              </div>
            )}

            {phase === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 px-4 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-white/60 text-sm">播放失败</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <button onClick={() => setRetryCount(c => c + 1)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20">重试</button>
                  <a href={`https://www.bilibili.com/video/${bvid}`} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-pink-500/80 text-white text-sm hover:bg-pink-500 flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> 在B站观看
                  </a>
                </div>
                <div className="flex gap-1 mt-3">
                  {QN_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => { setQn(opt); setRetryCount(c => c + 1); }}
                      className={`px-2 py-1 rounded text-[11px] ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
                      {QN_MAP[opt]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === "paused" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 cursor-pointer" onClick={togglePlay}>
                <Play className="w-16 h-16 text-white/70 drop-shadow-lg" />
              </div>
            )}

            {/* Danmaku */}
            {danmaku.enabled && playData && (phase === "playing" || phase === "paused") && (
              <DanmakuLayer cid={playData.cid} currentTime={currentTime} playing={phase === "playing"} settings={danmaku} playbackRate={playbackRate} />
            )}

            {/* Controls bar */}
            {isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <div className="relative h-1 bg-white/20 rounded-full mb-2 group">
                  <div className="absolute left-0 top-0 h-full bg-white/30 rounded-full" style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }} />
                  <div className="absolute left-0 top-0 h-full bg-pink-500 rounded-full" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                  <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime} onChange={e => seek(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="text-white/80">{phase === "paused" ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}</button>
                  <span className="text-white/60 text-xs tabular-nums">{fmtTime(currentTime)} / {fmtTime(duration)}</span>

                  <div className="relative">
                    <button onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 ${playbackRate !== 1 ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
                      <Gauge className="w-3 h-3" /> {playbackRate}x
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-full mb-2 left-0 bg-[#1f1f1f] border border-white/10 rounded-xl p-1.5 flex flex-col gap-0.5 z-50"
                        onMouseLeave={() => setShowSpeedMenu(false)}>
                        {SPEED_OPTIONS.map(s => (
                          <button key={s} onClick={() => { setPlaybackRate(s); setShowSpeedMenu(false); }}
                            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${playbackRate === s ? "bg-pink-500/30 text-pink-300" : "text-white/50 hover:bg-white/10"}`}>{s}x</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button onClick={() => setDanmaku(p => ({ ...p, enabled: !p.enabled }))}
                      className={`px-2 py-1 rounded text-[11px] ${danmaku.enabled ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40 hover:bg-white/20"}`}>
                      弹{danmaku.enabled ? "✓" : ""}
                    </button>
                    <button onClick={() => setShowDanmakuSettings(!showDanmakuSettings)}
                      className={`px-2 py-1 rounded text-[11px] ${showDanmakuSettings ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40 hover:bg-white/20"}`}>
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                    {QN_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => setQn(opt)}
                        className={`px-1.5 py-1 rounded text-[10px] ${qn === opt ? "bg-pink-500/30 text-pink-300" : "bg-white/10 text-white/40 hover:bg-white/20"}`}>{QN_MAP[opt]}</button>
                    ))}
                  </div>
                </div>

                {showDanmakuSettings && (
                  <div className="mt-3 p-3 bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 space-y-2.5">
                    <div className="flex items-center gap-2 text-white/60 text-[11px]">
                      <span className="w-10 flex-shrink-0">透明度</span>
                      <input type="range" min={10} max={100} value={Math.round(danmaku.opacity * 100)} onChange={e => setDanmaku(p => ({ ...p, opacity: Number(e.target.value) / 100 }))} className="flex-1 h-1 accent-pink-500" />
                      <span className="w-6 text-right text-[10px]">{Math.round(danmaku.opacity * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-[11px]">
                      <span className="w-10 flex-shrink-0">字号</span>
                      <input type="range" min={14} max={36} value={danmaku.fontSize} onChange={e => setDanmaku(p => ({ ...p, fontSize: Number(e.target.value) }))} className="flex-1 h-1 accent-pink-500" />
                      <span className="w-6 text-right text-[10px]">{danmaku.fontSize}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-[11px]">
                      <span className="w-10 flex-shrink-0">速度</span>
                      <input type="range" min={4000} max={16000} step={500} value={danmaku.speed} onChange={e => setDanmaku(p => ({ ...p, speed: Number(e.target.value) }))} className="flex-1 h-1 accent-pink-500" />
                      <span className="w-10 text-right text-[10px]">{danmaku.speed}ms</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Meta section */}
          {info && (
            <div className="px-4 py-4 border-b border-white/[0.06]">
              <h1 className="text-lg font-semibold text-white/90 leading-snug">{info.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-2 text-white/35 text-xs">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {info.playCount}</span>
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {info.likeCount}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {info.danmakuCount}</span>
                <span>{info.coinCount}硬币 · {info.shareCount}分享</span>
                {info.pubdate > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatPubdate(info.pubdate)}</span>}
              </div>

              {/* UP主 row */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.04]">
                <BiliImage rawUrl={info.authorFace} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                <div>
                  <p className="text-white/80 text-sm font-medium">{info.author}</p>
                  <p className="text-white/25 text-[11px]">UP主</p>
                </div>
              </div>

              {/* Description */}
              {info.desc && (
                <div className="mt-3">
                  <p className={`text-white/45 text-xs whitespace-pre-wrap leading-relaxed ${showFullDesc ? "" : "line-clamp-3"}`}>{info.desc}</p>
                  {info.desc.length > 120 && (
                    <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-pink-400 text-xs mt-1 hover:text-pink-300">
                      {showFullDesc ? "收起" : "展开全部"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          {info && info.aid > 0 && (
            <div className="px-4 py-4">
              <h2 className="text-white/70 text-sm font-medium mb-3">评论 ({info.replyCount})</h2>
              <CommentSection aid={info.aid} dark={true} />
            </div>
          )}
        </div>

        {/* Related videos panel */}
        <div className={`lg:w-[360px] flex-shrink-0 border-l border-white/[0.06] p-4 ${relatedExpanded ? "block" : "hidden lg:block"}`}>
          <h2 className="text-white/60 text-sm font-medium mb-3">相关推荐</h2>
          <div className="space-y-3">
            {related.length === 0 && (
              <p className="text-white/20 text-xs">暂无相关推荐</p>
            )}
            {related.map(rv => (
              <button
                key={rv.id}
                onClick={() => goToRelated(rv.bvid)}
                className="flex gap-3 w-full text-left hover:bg-white/[0.04] rounded-lg p-1.5 transition-colors -mx-1.5 group"
              >
                <div className="relative flex-shrink-0 w-40 h-[72px] rounded-md overflow-hidden bg-white/[0.04]">
                  <BiliImage rawUrl={rv.cover} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 py-0.5 rounded">{rv.duration}</span>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-white/75 text-xs line-clamp-2 leading-snug group-hover:text-pink-300 transition-colors">{rv.title}</p>
                  <p className="text-white/25 text-[10px] mt-1">{rv.author} · {rv.playCount}播放</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
