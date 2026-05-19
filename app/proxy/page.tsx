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
  const [title, setTitle] = useState("无痕浏览器");

  const isValidUrl = (input: string) => {
    try {
      const u = new URL(/^https?:\/\//i.test(input) ? input : "https://" + input);
      return ["http:", "https:"].includes(u.protocol);
    } catch { return false; }
  };

  const handleNavigate = () => {
    if (!url.trim()) return;
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    if (!isValidUrl(target)) { setError("请输入有效的网址"); return; }
    setError("");
    setLoading(true);
    const encoded = encodeURIComponent(target);
    const dest = `/api/proxy?url=${encoded}`;
    setProxyUrl(dest);
    setTitle(target);
    setTimeout(() => setLoading(false), 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNavigate();
  };

  const handleIframeLoad = () => setLoading(false);
  const handleIframeError = () => { setLoading(false); setError("页面加载失败，目标网站可能拒绝被嵌入"); };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02] backdrop-blur">
        <button onClick={() => router.push("/bilibili")} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors" title="返回首页">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-white/[0.06] rounded-xl px-4 py-2 border border-white/[0.08] focus-within:border-pink-500/40 focus-within:bg-white/[0.08] transition-all">
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入网址，如 www.baidu.com ..."
            className="flex-1 bg-transparent outline-none text-white/90 text-sm placeholder:text-white/20"
            autoFocus
          />
          {url && (
            <button onClick={() => { setUrl(""); setProxyUrl(null); setError(""); }} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={handleNavigate} disabled={loading} className="px-5 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          浏览
        </button>
        {proxyUrl && (
          <button onClick={() => { setProxyUrl(null); setUrl(""); }} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors" title="关闭">
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      {error && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-200"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex-1 relative">
        {!proxyUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/20">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-sm">输入网址开始无痕浏览</p>
            <p className="text-xs text-white/10">所有流量通过服务器中转，保护本机隐私</p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0a0a]/80">
                <Loader2 className="w-10 h-10 text-pink-400 animate-spin" />
              </div>
            )}
            <iframe
              src={proxyUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title={title}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </>
        )}
      </div>

      {proxyUrl && (
        <footer className="flex items-center gap-3 px-4 py-2 border-t border-white/10 bg-white/[0.02] text-xs text-white/30">
          <button onClick={() => { const encoded = encodeURIComponent(url); setProxyUrl(`/api/proxy?url=${encoded}&_=${Date.now()}`); setLoading(true); setTimeout(() => setLoading(false), 800); }} className="flex items-center gap-1.5 hover:text-white/60 transition-colors">
            <RotateCw className="w-3.5 h-3.5" /> 刷新
          </button>
          <span className="flex-1 text-right truncate max-w-[300px] ml-auto">{title}</span>
        </footer>
      )}
    </div>
  );
}
