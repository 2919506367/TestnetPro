"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight, RotateCw, X, Globe, Loader2 } from "lucide-react";

export default function BrowserPanel({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [title, setTitle] = useState("内置浏览器");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const apiCall = useCallback(async (body: Record<string, unknown>) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return null;
      }
      return data;
    } catch {
      setError("请求失败");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const data = await apiCall({ action: "create" });
      if (data) {
        setSessionId(data.sessionId);
        setScreenshot(data.screenshot);
        setTitle(data.title);
      }
    })();
    return () => {
      if (sessionId) {
        fetch("/api/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "close", sessionId }),
        }).catch(() => {});
      }
    };
  }, []);

  const doNavigate = useCallback(async () => {
    if (!sessionId || !urlInput.trim()) return;
    const data = await apiCall({ action: "navigate", sessionId, url: urlInput.trim() });
    if (data) {
      setScreenshot(data.screenshot);
      setTitle(data.title);
    }
  }, [sessionId, urlInput, apiCall]);

  const handleImageClick = useCallback(async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!sessionId || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    const data = await apiCall({ action: "click", sessionId, x, y });
    if (data) {
      setScreenshot(data.screenshot);
      setTitle(data.title);
    }
  }, [sessionId, apiCall]);

  const handleWheel = useCallback(async (e: React.WheelEvent) => {
    if (!sessionId) return;
    e.preventDefault();
    const data = await apiCall({ action: "scroll", sessionId, deltaY: e.deltaY });
    if (data) {
      setScreenshot(data.screenshot);
      setTitle(data.title);
    }
  }, [sessionId, apiCall]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && document.activeElement?.tagName === "INPUT") {
      doNavigate();
    }
  }, [doNavigate]);

  const handlePageKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (!sessionId) return;
    if (e.target !== containerRef.current && e.target !== imageRef.current) return;
    const key = e.key;
    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const data = await apiCall({ action: "type", sessionId, text: key });
      if (data) { setScreenshot(data.screenshot); setTitle(data.title); }
    } else if (key === "Backspace") {
      const data = await apiCall({ action: "key", sessionId, key: "Backspace" });
      if (data) { setScreenshot(data.screenshot); setTitle(data.title); }
    } else if (key === "Enter") {
      const data = await apiCall({ action: "key", sessionId, key: "Enter" });
      if (data) { setScreenshot(data.screenshot); setTitle(data.title); }
    } else if (key === "Tab") {
      e.preventDefault();
      const data = await apiCall({ action: "key", sessionId, key: "Tab" });
      if (data) { setScreenshot(data.screenshot); setTitle(data.title); }
    }
  }, [sessionId, apiCall]);

  const doBack = () => apiCall({ action: "back", sessionId }).then(d => { if (d) { setScreenshot(d.screenshot); setTitle(d.title); } });
  const doForward = () => apiCall({ action: "forward", sessionId }).then(d => { if (d) { setScreenshot(d.screenshot); setTitle(d.title); } });
  const doRefresh = () => apiCall({ action: "refresh", sessionId }).then(d => { if (d) { setScreenshot(d.screenshot); setTitle(d.title); } });

  const overlayBg = dark ? "bg-black/98" : "bg-white/98";

  return (
    <div className={`fixed inset-0 z-[90] ${overlayBg} flex flex-col`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
        <button onClick={doBack} className={`p-1.5 rounded hover:bg-white/10 ${dark ? "text-white/60" : "text-gray-500"}`} title="后退">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={doForward} className={`p-1.5 rounded hover:bg-white/10 ${dark ? "text-white/60" : "text-gray-500"}`} title="前进">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={doRefresh} className={`p-1.5 rounded hover:bg-white/10 ${dark ? "text-white/60" : "text-gray-500"}`} title="刷新">
          <RotateCw className="w-4 h-4" />
        </button>
        <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${dark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-700"}`}>
          <Globe className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入网址后按回车..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/30"
            autoFocus
          />
        </div>
        <button onClick={onClose} className={`p-1.5 rounded hover:bg-white/10 ${dark ? "text-white/60" : "text-gray-500"}`} title="关闭">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center bg-[#222] relative"
        onWheel={handleWheel}
        onClick={(e) => containerRef.current?.focus()}
        onKeyDown={handlePageKeyDown}
        tabIndex={0}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-500/90 text-white text-sm px-4 py-2 rounded-full">
            {error}
          </div>
        )}
        {screenshot ? (
          <img
            ref={imageRef}
            src={screenshot}
            alt={title}
            className="max-w-full max-h-full object-contain cursor-pointer select-none"
            onClick={handleImageClick}
            draggable={false}
          />
        ) : (
          <div className="text-white/30 text-sm">正在启动浏览器...</div>
        )}
      </div>

      <div className={`flex items-center px-3 py-1.5 text-xs border-t ${dark ? "border-white/10 bg-white/5 text-white/40" : "border-gray-200 bg-gray-50 text-gray-400"}`}>
        <span className="truncate max-w-full">{title}</span>
      </div>
    </div>
  );
}
