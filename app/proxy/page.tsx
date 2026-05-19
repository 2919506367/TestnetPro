"use client";

import { useState, useRef } from "react";
import {
  Search, X, Loader2, ArrowLeft, RotateCw, ExternalLink,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProxyPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const encode = (raw: string) => `/api/proxy?url=${encodeURIComponent(raw)}`;

  const doNavigate = (rawUrl?: string) => {
    const input = (rawUrl || url).trim();
    if (!input) return;
    let target = input;
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    setUrl(target);
    setLoading(true);
    setProxyUrl(`${encode(target)}&_=${Date.now()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doNavigate();
  };

  const iframeGoBack = () => {
    try { iframeRef.current?.contentWindow?.history.back(); } catch {}
  };

  const iframeGoForward = () => {
    try { iframeRef.current?.contentWindow?.history.forward(); } catch {}
  };

  const iframeRefresh = () => {
    if (proxyUrl) {
      setLoading(true);
      setProxyUrl(`${encode(url)}&_=${Date.now()}`);
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) setPageTitle(doc.title || "");
    } catch {}
  };

  return (
    <div className="h-screen bg-[#111] flex flex-col">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06] bg-[#1a1a1a] shrink-0">
        <button
          onClick={() => router.push("/bilibili")}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors shrink-0"
          title="返回"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={iframeGoBack}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors shrink-0"
          title="后退"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={iframeGoForward}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors shrink-0"
          title="前进"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={iframeRefresh}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors shrink-0 mr-1"
          title="刷新"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 flex items-center gap-1.5 bg-white/[0.06] rounded-lg px-3 py-1.5 border border-white/[0.06] focus-within:border-pink-500/30 focus-within:bg-white/[0.08] transition-all">
          <Search className="w-3.5 h-3.5 text-white/20 shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入网址..."
            className="flex-1 bg-transparent outline-none text-white/85 text-sm placeholder:text-white/15"
          />
          {url && (
            <button
              onClick={() => { setUrl(""); setProxyUrl(null); }}
              className="text-white/20 hover:text-white/50 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => doNavigate()}
          disabled={loading}
          className="px-4 py-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5" />
          )}
          浏览
        </button>
      </header>

      <div className="flex-1 relative bg-white">
        {!proxyUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/10 bg-[#111]">
            <Search className="w-16 h-16" />
            <p className="text-sm text-white/15">输入网址，通过服务器代理访问</p>
            <p className="text-xs text-white/8">绕过网络限制，畅览全网</p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute top-0 left-0 right-0 h-0.5 z-20">
                <div className="h-full bg-pink-500 animate-pulse" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={proxyUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
            />
          </>
        )}
      </div>

      {proxyUrl && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-t border-white/[0.06] bg-[#1a1a1a] text-[11px] text-white/25 shrink-0">
          <span className="truncate max-w-[400px]">{pageTitle || url}</span>
          <span className="ml-auto opacity-40">VPS代理模式</span>
        </div>
      )}
    </div>
  );
}
