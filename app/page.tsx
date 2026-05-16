"use client";

import React, { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Mail, Lock, ArrowRight, User } from "lucide-react";

function HomeContent() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => { if (data.user) router.push("/drive"); });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register") body.nickname = nickname;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "操作失败"); return; }
      router.push("/drive");
    } catch { setError("网络错误，请稍后重试"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/30">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
            <Cloud className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Cloud Drive</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">安全、私密的个人云存储</p>
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/[0.03] dark:shadow-black/20 border border-gray-200/60 dark:border-gray-700/60 p-6">
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
              onClick={() => { setMode("login"); setError(""); }}
            >登录</button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
              onClick={() => { setMode("register"); setError(""); }}
            >注册</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">昵称</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="你的昵称" required maxLength={20}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 dark:bg-gray-700/80 dark:text-white transition-all"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">邮箱地址</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 dark:bg-gray-700/80 dark:text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "至少6位密码" : "输入密码"}
                  required minLength={6}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 dark:bg-gray-700/80 dark:text-white transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs px-4 py-2.5 rounded-xl border border-red-100 dark:border-red-800/50">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {loading ? "处理中..." : (mode === "login" ? "登录" : "注册")}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">端到端加密 · 数据安全 · 随时随地访问</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
