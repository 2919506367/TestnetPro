"use client";

import { useState } from "react";
import { Search, X, Loader2, ArrowLeft, RotateCw, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProxyPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNavigate = () => {
    const input = url.trim();
    if (!input) return;
    let target = input;
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    setError("");
    setLoading(true);
    setProxyUrl(`/api/proxy?url=${encodeURIComponent(target)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNavigate();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <button onClick={() => router.push("/bilibili")} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-white/[0.06] rounded-xl px-4 py-2 border border-white/[0.08] focus-within:border-pink-500/40 transition-all">
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入网址，如 www.baidu.com"
            className="flex-1 bg-transparent outline-none text-white/90 text-sm placeholder:text-white/20"
            autoFocus
          />
          {url && (
            <button onClick={() => { setUrl(""); setProxyUrl(null); }} className="text-white/30 hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={handleNavigate} disabled={loading} className="px-5 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl flex items-center gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          浏览
        </button>
        {proxyUrl && (
          <button onClick={() => { setProxyUrl(null); setUrl(""); }} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70">
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      {error && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex-1 relative">
        {!proxyUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/20">
            <Search className="w-12 h-12" />
            <p className="text-sm">输入网址，服务器帮你访问</p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0a0a]/80">
                <Loader2 className="w-10 h-10 text-pink-400 animate-spin" />
              </div>
            )}
            <iframe src={proxyUrl} className="w-full h-full border-0" onLoad={() => setLoading(false)} />
          </>
        )}
      </div>

      {proxyUrl && (
        <footer className="flex items-center gap-3 px-4 py-2 border-t border-white/10 bg-white/[0.02] text-xs text-white/30">
          <button onClick={() => { setProxyUrl(`/api/proxy?url=${encodeURIComponent(url)}&_=${Date.now()}`); setLoading(true); }} className="flex items-center gap-1.5 hover:text-white/60">
            <RotateCw className="w-3.5 h-3.5" /> 刷新
          </button>
          <span className="flex-1 text-right truncate">{url}</span>
        </footer>
      )}
    </div>
  );
}
