"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface DanmakuItem {
  text: string;
  time: number;
  mode: number;
  color: string;
  size: number;
}

interface FloatingDanmaku {
  id: number;
  text: string;
  color: string;
  size: number;
  top: number;
  startTime: number;
  duration: number;
  track: number;
}

export interface DanmakuSettings {
  enabled: boolean;
  opacity: number;
  fontSize: number;
  speed: number;
  blockTop: boolean;
  blockBottom: boolean;
  blockScroll: boolean;
  dedupe: boolean;
}

export const DANMAKU_DEFAULTS: DanmakuSettings = {
  enabled: true,
  opacity: 0.75,
  fontSize: 22,
  speed: 8000,
  blockTop: false,
  blockBottom: false,
  blockScroll: false,
  dedupe: true,
};

export default function DanmakuLayer({
  cid,
  currentTime,
  playing,
  settings,
  playbackRate,
}: {
  cid: number;
  currentTime: number;
  playing: boolean;
  settings: DanmakuSettings;
  playbackRate?: number;
}) {
  const { enabled, opacity, fontSize, speed, blockTop, blockBottom, blockScroll, dedupe } = settings;
  const rate = Math.max(0.25, playbackRate || 1);
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const [floating, setFloating] = useState<FloatingDanmaku[]>([]);
  const [topDanmakus, setTopDanmakus] = useState<FloatingDanmaku[]>([]);
  const [bottomDanmakus, setBottomDanmakus] = useState<FloatingDanmaku[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const playedSet = useRef<Set<number>>(new Set());
  const lastTime = useRef(-1);
  const trackOccupied = useRef<Map<number, number>>(new Map());
  const animFrameRef = useRef<number>(0);
  const recentTexts = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!cid) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bili/danmaku?cid=${cid}`);
        const data = await res.json();
        if (!cancelled && data.danmakus) {
          setDanmakus(data.danmakus);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [cid]);

  useEffect(() => {
    playedSet.current.clear();
    lastTime.current = -1;
    trackOccupied.current.clear();
    recentTexts.current.clear();
    setFloating([]);
    setTopDanmakus([]);
    setBottomDanmakus([]);
  }, [danmakus]);

  const getAvailableTrack = useCallback(
    (now: number, totalTracks = 10): number => {
      for (let t = 0; t < totalTracks; t++) {
        const occupiedUntil = trackOccupied.current.get(t) || 0;
        if (now >= occupiedUntil) return t;
      }
      let earliestTrack = 0;
      let earliestTime = Infinity;
      for (let t = 0; t < totalTracks; t++) {
        const ot = trackOccupied.current.get(t) || 0;
        if (ot < earliestTime) { earliestTime = ot; earliestTrack = t; }
      }
      return earliestTrack;
    },
    []
  );

  useEffect(() => {
    if (!enabled || !playing || danmakus.length === 0) return;

    const containerHeight = containerRef.current?.clientHeight || 600;

    const emitDanmaku = (item: DanmakuItem) => {
      // Deduplicate: skip repeated text within 5 seconds
      if (dedupe) {
        const lastTime = recentTexts.current.get(item.text);
        if (lastTime && currentTime - lastTime < 5) return;
        recentTexts.current.set(item.text, currentTime);
        // Cleanup old entries
        if (recentTexts.current.size > 200) recentTexts.current.clear();
      }

      const id = idCounter.current++;
      const scaledSize = Math.max(14, Math.min(32, (item.size / 25) * fontSize));
      const duration = (speed + Math.random() * 2000) / rate;

      // Mode 5 = top fixed, mode 4 = bottom fixed, others = scrolling
      if (item.mode === 5) {
        if (blockTop) return;
        const td: FloatingDanmaku = {
          id, text: item.text, color: item.color, size: scaledSize,
          top: containerHeight * 0.05 + Math.random() * containerHeight * 0.15,
          startTime: currentTime, duration: 5000, track: 0,
        };
        setTopDanmakus((prev) => [...prev.slice(-5), td]);
        setTimeout(() => { setTopDanmakus((prev) => prev.filter((d) => d.id !== id)); }, 5000);
      } else if (item.mode === 4) {
        if (blockBottom) return;
        const bd: FloatingDanmaku = {
          id, text: item.text, color: item.color, size: scaledSize,
          top: containerHeight * 0.8 + Math.random() * containerHeight * 0.15,
          startTime: currentTime, duration: 5000, track: 0,
        };
        setBottomDanmakus((prev) => [...prev.slice(-5), bd]);
        setTimeout(() => { setBottomDanmakus((prev) => prev.filter((d) => d.id !== id)); }, 5000);
      } else {
        if (blockScroll) return;
        const track = getAvailableTrack(currentTime);
        const trackTop = ((track + 0.5) / 10) * containerHeight * 0.7 + containerHeight * 0.05;
        const fd: FloatingDanmaku = {
          id, text: item.text, color: item.color, size: scaledSize,
          top: trackTop, startTime: currentTime, duration, track,
        };
        trackOccupied.current.set(track, currentTime + duration / 1000);
        setFloating((prev) => [...prev, fd]);
        setTimeout(() => { setFloating((prev) => prev.filter((d) => d.id !== id)); }, duration);
      }
    };

    const processFrame = () => {
      if (!playing || !enabled) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      if (currentTime < lastTime.current) playedSet.current.clear();
      lastTime.current = currentTime;

      const lookAhead = 1.5;
      for (const d of danmakus) {
        if (
          d.time >= currentTime - 0.1 &&
          d.time <= currentTime + lookAhead &&
          !playedSet.current.has(d.time * 1000 + Math.floor(Math.random() * 1000))
        ) {
          playedSet.current.add(d.time * 1000 + Math.floor(Math.random() * 1000));
          emitDanmaku(d);
        }
      }
      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, [enabled, playing, danmakus, currentTime, fontSize, speed, blockTop, blockBottom, blockScroll, dedupe, getAvailableTrack]);

  if (!enabled) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-30" style={{ opacity }}>
      <style jsx>{`
        .danmaku-scroll {
          animation: danmaku-scroll var(--dm-duration, 8000ms) linear forwards;
          animation-play-state: var(--dm-state, running);
        }
        .danmaku-top-fixed {
          animation: danmaku-top var(--dm-duration, 5000ms) ease-out forwards;
          animation-play-state: var(--dm-state, running);
        }
        .danmaku-bottom-fixed {
          animation: danmaku-bottom var(--dm-duration, 5000ms) ease-out forwards;
          animation-play-state: var(--dm-state, running);
        }
      `}</style>
      {floating.map((d) => (
        <span
          key={d.id}
          className="absolute whitespace-nowrap font-bold danmaku-scroll"
          style={{
            fontSize: d.size,
            color: d.color,
            top: d.top,
            left: "100%",
            textShadow: "1px 0 2px rgba(0,0,0,0.8), -1px 0 2px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.8), 0 -1px 2px rgba(0,0,0,0.8)",
            ["--dm-duration" as string]: `${d.duration}ms`,
            ["--dm-state" as string]: playing ? "running" : "paused",
          } as React.CSSProperties}
        >{d.text}</span>
      ))}
      {topDanmakus.map((d) => (
        <span
          key={d.id}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-center danmaku-top-fixed"
          style={{
            fontSize: d.size, color: d.color, top: d.top,
            textShadow: "1px 0 2px rgba(0,0,0,0.8), -1px 0 2px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.8), 0 -1px 2px rgba(0,0,0,0.8)",
            ["--dm-duration" as string]: `${d.duration}ms`,
            ["--dm-state" as string]: playing ? "running" : "paused",
          } as React.CSSProperties}
        >{d.text}</span>
      ))}
      {bottomDanmakus.map((d) => (
        <span
          key={d.id}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-center danmaku-bottom-fixed"
          style={{
            fontSize: d.size, color: d.color, top: d.top,
            textShadow: "1px 0 2px rgba(0,0,0,0.8), -1px 0 2px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.8), 0 -1px 2px rgba(0,0,0,0.8)",
            ["--dm-duration" as string]: `${d.duration}ms`,
            ["--dm-state" as string]: playing ? "running" : "paused",
          } as React.CSSProperties}
        >{d.text}</span>
      ))}
      <style jsx>{`
        @keyframes danmaku-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100vw - 100%)); }
        }
        @keyframes danmaku-top {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes danmaku-bottom {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
