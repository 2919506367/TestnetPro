"use client";

import React, { useState, FormEvent, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Mail, Lock, ArrowRight, User, RefreshCw, Shield, Send } from "lucide-react";

function HomeContent() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [sendCooldown, setSendCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);

  const fetchCaptcha = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/captcha");
      const data = await res.json();
      setCaptchaSvg(data.svg || "");
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => { if (data.user) router.push("/drive"); });
  }, [router]);

  useEffect(() => { fetchCaptcha(); }, [fetchCaptcha, mode]);

  useEffect(() => {
    if (sendCooldown <= 0) return;
    const t = setTimeout(() => setSendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [sendCooldown]);

  const handleSendCode = async () => {
    if (!email || sendCooldown > 0) return;
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "发送失败"); return; }
      setSendCooldown(60);
      setError("");
    } catch { setError("网络错误"); }
    finally { setSendingCode(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password, captchaInput };
      if (mode === "register") { body.nickname = nickname; body.emailCode = emailCode; }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "操作失败"); fetchCaptcha(); setCaptchaInput(""); return; }
      sessionStorage.setItem("authUser", JSON.stringify(data));
      router.push("/drive");
    } catch { setError("网络错误，请稍后重试"); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 dark:bg-gray-700/80 dark:text-white transition-all";

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
              onClick={() => { setMode("login"); setError(""); setEmailCode(""); }}
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
                    className={inputClass}
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
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email verification code - register only */}
            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">邮箱验证码</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text" value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6位验证码" required maxLength={6}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 dark:bg-gray-700/80 dark:text-white transition-all"
                    />
                  </div>
                  <button
                    type="button" onClick={handleSendCode}
                    disabled={sendCooldown > 0 || sendingCode || !email}
                    className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-xs font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 flex-shrink-0"
                  >
                    {sendingCode ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : sendCooldown > 0 ? (
                      `${sendCooldown}s`
                    ) : (
                      <><Send className="w-3 h-3" /> 发送</>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "至少6位密码" : "输入密码"}
                  required minLength={6}
                  className={inputClass}
                />
              </div>
            </div>

            {/* CAPTCHA */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">图形验证码</label>
              <div className="flex gap-2 items-center">
                <div
                  className="h-[42px] bg-gray-900 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 border border-gray-200 dark:border-gray-600"
                  onClick={fetchCaptcha}
                  title="点击刷新验证码"
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                  title="刷新验证码"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <input
                  type="text" value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="输入验证码"
                  required maxLength={5}
                  className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 dark:bg-gray-700/80 dark:text-white transition-all"
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
