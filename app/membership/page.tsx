"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Crown, Sparkles, Clock, ArrowLeft, Gift, Shield, Zap, Cloud, Coins } from "lucide-react";

function MembershipContent() {
  const router = useRouter();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [vipCode, setVipCode] = useState("");
  const [vipMsg, setVipMsg] = useState(""); const [vipMsgOk, setVipMsgOk] = useState(true);
  const [vipRedeeming, setVipRedeeming] = useState(false);
  const [tokenCode, setTokenCode] = useState("");
  const [tokenMsg, setTokenMsg] = useState(""); const [tokenMsgOk, setTokenMsgOk] = useState(true);
  const [tokenRedeeming, setTokenRedeeming] = useState(false);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (!data.user) { router.push("/"); return; }
    setUser(data.user);
  }, [router]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const doRedeem = async (
    code: string,
    setCode: (v: string) => void,
    setMsg: (v: string) => void,
    setMsgOk: (v: boolean) => void,
    setRedeeming: (v: boolean) => void,
    redeemType: "vip" | "token",
  ) => {
    if (!code.trim()) { setMsg("请输入CDK码"); setMsgOk(false); return; }
    setRedeeming(true); setMsg("");
    try {
      const res = await fetch("/api/user/cdk-redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), type: redeemType }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "兑换失败"); setMsgOk(false); return; }
      if (redeemType === "token") {
        setMsg("兑换成功！获得 " + (data.tokenAmount?.toLocaleString() || "0") + " AI Token，当前余额 " + (data.newBalance?.toLocaleString() || "0"));
      } else {
        setMsg("兑换成功！黄金会员有效期延长 " + data.goldDays + " 天");
      }
      setMsgOk(true); setCode(""); fetchUser();
    } catch { setMsg("网络错误"); setMsgOk(false); }
    finally { setRedeeming(false); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
        <div className="w-10 h-10 rounded-full border-[3px] border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  const isGold = user.role === "GOLD";
  const goldExpiresAt = user.goldExpiresAt as string | null;
  const tokenQuota = (user.tokenQuota as number) ?? 0;
  const expiresDisplay = goldExpiresAt
    ? new Date(goldExpiresAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/drive")} className="p-2 rounded-xl hover:bg-white/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">会员中心</h1>
        </div>

        {/* Status Card */}
        <div className={`rounded-2xl p-6 mb-6 text-white ${isGold ? "bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600 shadow-xl shadow-amber-500/20" : "bg-gradient-to-br from-gray-700 to-gray-800 shadow-xl shadow-gray-500/10"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className={`w-5 h-5 ${isGold ? "text-white" : "text-gray-400"}`} />
                <span className="text-lg font-bold">{isGold ? "黄金会员" : "普通用户"}</span>
              </div>
              {isGold ? (
                <p className="text-amber-100 text-sm flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  到期时间：{expiresDisplay}
                </p>
              ) : (
                <p className="text-gray-300 text-sm">5GB 存储空间</p>
              )}
            </div>
            {isGold && (
              <div className="w-12 h-12 rounded-full gold-badge flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Token Balance */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-800">AI Token 余额</h2>
          </div>
          <p className="text-2xl font-bold text-gray-900">{tokenQuota.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">每次 AI 对话消耗约 10-100 tokens</p>
        </div>

        {/* VIP CDK Redeem */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-800">兑换 VIP 会员 CDK</h2>
          </div>
          <div className="flex gap-2">
            <input
              type="text" value={vipCode}
              onChange={(e) => { setVipCode(e.target.value.toUpperCase()); setVipMsg(""); }}
              placeholder="输入 VIP 会员 CDK 兑换码"
              maxLength={50}
              onKeyDown={(e) => e.key === "Enter" && doRedeem(vipCode, setVipCode, setVipMsg, setVipMsgOk, setVipRedeeming, "vip")}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white/80 transition-all font-mono tracking-wider"
            />
            <button
              onClick={() => doRedeem(vipCode, setVipCode, setVipMsg, setVipMsgOk, setVipRedeeming, "vip")}
              disabled={vipRedeeming}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
            >
              {vipRedeeming ? "兑换中..." : "兑换"}
            </button>
          </div>
          {vipMsg && (
            <div className={`mt-3 text-sm px-4 py-2.5 rounded-xl border ${vipMsgOk ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-600 border-red-100"}`}>
              {vipMsg}
            </div>
          )}
        </div>

        {/* Token CDK Redeem */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-800">兑换 AI Token CDK</h2>
          </div>
          <div className="flex gap-2">
            <input
              type="text" value={tokenCode}
              onChange={(e) => { setTokenCode(e.target.value.toUpperCase()); setTokenMsg(""); }}
              placeholder="输入 Token CDK 兑换码"
              maxLength={50}
              onKeyDown={(e) => e.key === "Enter" && doRedeem(tokenCode, setTokenCode, setTokenMsg, setTokenMsgOk, setTokenRedeeming, "token")}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 transition-all font-mono tracking-wider"
            />
            <button
              onClick={() => doRedeem(tokenCode, setTokenCode, setTokenMsg, setTokenMsgOk, setTokenRedeeming, "token")}
              disabled={tokenRedeeming}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              {tokenRedeeming ? "兑换中..." : "兑换"}
            </button>
          </div>
          {tokenMsg && (
            <div className={`mt-3 text-sm px-4 py-2.5 rounded-xl border ${tokenMsgOk ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-600 border-red-100"}`}>
              {tokenMsg}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <Shield className="w-6 h-6 text-amber-500 mb-3" />
            <h3 className="font-semibold text-gray-800 mb-1">10GB 超大空间</h3>
            <p className="text-xs text-gray-500">黄金会员享有 10GB 存储，是普通用户的 2 倍</p>
          </div>
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <Zap className="w-6 h-6 text-amber-500 mb-3" />
            <h3 className="font-semibold text-gray-800 mb-1">流光昵称</h3>
            <p className="text-xs text-gray-500">黄金会员昵称显示炫酷金色流光动态效果</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MembershipPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" /></div>}>
      <MembershipContent />
    </Suspense>
  );
}
