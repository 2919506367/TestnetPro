"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Users, Tag, Ban, CheckCircle, Copy, Ticket, Bot, Plus, Pencil, Trash2, Power, PowerOff, Upload, ImageUp } from "lucide-react";

interface Provider { id: number; name: string; apiUrl: string; apiKey: string; model: string; avatar: string; isActive: boolean; }

function WhaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14c0 5 3 7 6 7h8c4 0 6-2 7-4h4l2-3-2-3h-4c-1-2-3-4-7-4H8c-3 0-6 3-6 7z" />
      <circle cx="8" cy="15" r="1.5" fill="currentColor" stroke="none" />
      <path d="M24 8c1.5 3 1.5 7 0 9" opacity="0.7" />
      <path d="M30 8c1.5 2 1.5 5 0 7" opacity="0.5" />
      <path d="M16 17c3 0 6-1.5 6-1.5" opacity="0.6" />
    </svg>
  );
}

function AdminContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [cdks, setCdks] = useState<Record<string, unknown>[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tab, setTab] = useState<"cdk" | "users" | "ai">("cdk");
  const [vipDays, setVipDays] = useState("30");
  const [vipCount, setVipCount] = useState("1");
  const [vipMsg, setVipMsg] = useState(""); const [vipMsgOk, setVipMsgOk] = useState(true);
  const [vipGenerating, setVipGenerating] = useState(false);
  const [vipCopied, setVipCopied] = useState("");

  const [tokenAmt, setTokenAmt] = useState("10000");
  const [tokenCnt, setTokenCnt] = useState("1");
  const [tokenMsg, setTokenMsg] = useState(""); const [tokenMsgOk, setTokenMsgOk] = useState(true);
  const [tokenGenerating, setTokenGenerating] = useState(false);
  const [tokenCopied, setTokenCopied] = useState("");

  const [showAiForm, setShowAiForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [aiName, setAiName] = useState(""); const [aiUrl, setAiUrl] = useState("");
  const [aiKey, setAiKey] = useState(""); const [aiModel, setAiModel] = useState("");
  const [aiAvatar, setAiAvatar] = useState(""); const [aiAvatarUploading, setAiAvatarUploading] = useState(false);
  const [aiActive, setAiActive] = useState(true);
  const [aiMsg, setAiMsg] = useState(""); const [aiMsgOk, setAiMsgOk] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (!data.user || data.user.role !== "ADMIN") { router.push("/drive"); return; }
    setUser(data.user);
  }, [router]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.users) setUsers(data.users);
  }, []);

  const fetchCdks = useCallback(async () => {
    const res = await fetch("/api/admin/cdks");
    const data = await res.json();
    if (data.cdks) setCdks(data.cdks);
  }, []);

  const fetchProviders = useCallback(async () => {
    const res = await fetch("/api/admin/providers");
    const data = await res.json();
    if (data.providers) setProviders(data.providers);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);
  useEffect(() => {
    if (tab === "users") fetchUsers(); else if (tab === "cdk") fetchCdks(); else fetchProviders();
  }, [tab, fetchUsers, fetchCdks, fetchProviders]);

  const handleGenVip = async () => {
    const days = parseInt(vipDays, 10);
    if (!days || days < 1) { setVipMsg("天数至少为1"); setVipMsgOk(false); return; }
    if (days > 3650) { setVipMsg("天数不能超过3650"); setVipMsgOk(false); return; }
    setVipGenerating(true); setVipMsg(""); setVipCopied("");
    try {
      const res = await fetch("/api/admin/cdks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goldDays: days, count: parseInt(vipCount, 10) || 1 }) });
      const data = await res.json();
      if (!res.ok) { setVipMsg(data.error || "生成失败"); setVipMsgOk(false); return; }
      const codes = (data.cdks || []).map((c: Record<string, unknown>) => c.code).join("\n");
      setVipMsg("成功生成 " + (data.cdks?.length || 0) + " 个VIP CDK"); setVipMsgOk(true); setVipCopied(codes); fetchCdks();
      if (codes) { navigator.clipboard.writeText(codes).catch(() => {}); }
    } catch { setVipMsg("网络错误"); setVipMsgOk(false); } finally { setVipGenerating(false); }
  };

  const handleGenToken = async () => {
    const tokens = parseInt(tokenAmt, 10);
    if (!tokens || tokens < 1) { setTokenMsg("额度至少为1"); setTokenMsgOk(false); return; }
    if (tokens > 10000000) { setTokenMsg("额度不能超过10,000,000"); setTokenMsgOk(false); return; }
    setTokenGenerating(true); setTokenMsg(""); setTokenCopied("");
    try {
      const res = await fetch("/api/admin/cdks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokenAmount: tokens, count: parseInt(tokenCnt, 10) || 1 }) });
      const data = await res.json();
      if (!res.ok) { setTokenMsg(data.error || "生成失败"); setTokenMsgOk(false); return; }
      const codes = (data.cdks || []).map((c: Record<string, unknown>) => c.code).join("\n");
      setTokenMsg("成功生成 " + (data.cdks?.length || 0) + " 个Token CDK"); setTokenMsgOk(true); setTokenCopied(codes); fetchCdks();
      if (codes) { navigator.clipboard.writeText(codes).catch(() => {}); }
    } catch { setTokenMsg("网络错误"); setTokenMsgOk(false); } finally { setTokenGenerating(false); }
  };

  const handleBan = async (targetId: number, currentBanned: boolean) => {
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: targetId, banned: !currentBanned }) });
    if (res.ok) fetchUsers();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/admin/providers/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.imageUrl) setAiAvatar(data.imageUrl);
    } catch {} finally { setAiAvatarUploading(false); }
  };

  const openAiForm = (p?: Provider) => {
    if (p) {
      setEditingProvider(p); setAiName(p.name); setAiUrl(p.apiUrl); setAiKey(p.apiKey);
      setAiModel(p.model); setAiAvatar(p.avatar || ""); setAiActive(p.isActive);
    } else {
      setEditingProvider(null); setAiName(""); setAiUrl("https://api.openai.com/v1");
      setAiKey(""); setAiModel("gpt-3.5-turbo"); setAiAvatar(""); setAiActive(true);
    }
    setAiMsg("");
    setShowAiForm(true);
  };

  const handleAiSave = async () => {
    if (!aiName || !aiUrl || !aiKey || !aiModel) { setAiMsg("请填写完整信息"); setAiMsgOk(false); return; }
    setAiSaving(true); setAiMsg("");
    try {
      const url = "/api/admin/providers";
      const method = editingProvider ? "PUT" : "POST";
      const body = editingProvider
        ? JSON.stringify({ id: editingProvider.id, name: aiName, apiUrl: aiUrl, apiKey: aiKey, model: aiModel, avatar: aiAvatar, isActive: aiActive })
        : JSON.stringify({ name: aiName, apiUrl: aiUrl, apiKey: aiKey, model: aiModel, avatar: aiAvatar, isActive: aiActive });
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body });
      const data = await res.json();
      if (!res.ok) { setAiMsg(data.error || "保存失败"); setAiMsgOk(false); return; }
      setShowAiForm(false); setAiMsg(""); fetchProviders();
    } catch { setAiMsg("网络错误"); setAiMsgOk(false); } finally { setAiSaving(false); }
  };

  const handleAiDelete = async (id: number) => {
    if (!confirm("确定删除此模型？")) return;
    await fetch("/api/admin/providers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchProviders();
  };

  const copyOne = async (code: string) => {
    await navigator.clipboard.writeText(code);
  };

  const deleteCdk = async (id: unknown) => {
    if (!confirm("确定删除此CDK？")) return;
    await fetch("/api/admin/cdks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchCdks();
  };

  const handleAiToggle = async (id: number, currentActive: boolean) => {
    await fetch("/api/admin/providers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !currentActive }) });
    fetchProviders();
  };

  const renderAvatar = (avatar: string, size: string = "w-10 h-10") => (
    avatar ? (
      <div className={`${size} rounded-xl overflow-hidden flex-shrink-0`}>
        <img src={avatar} className="w-full h-full object-cover" alt="" />
      </div>
    ) : (
      <div className={`${size} rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0`}>
        <WhaleIcon className="w-5 h-5 text-blue-500" />
      </div>
    )
  );

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30"><div className="w-10 h-10 rounded-full border-[3px] border-blue-200 border-t-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/drive")} className="p-2 rounded-xl hover:bg-white/50 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-red-500" /><h1 className="text-xl font-bold text-gray-900">管理后台</h1></div>
        </div>

        <div className="flex mb-6 bg-white/60 rounded-xl p-1 border border-gray-200/60">
          <button className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${tab==="cdk"?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`} onClick={()=>setTab("cdk")}><Ticket className="w-4 h-4"/> CDK管理</button>
          <button className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${tab==="users"?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`} onClick={()=>setTab("users")}><Users className="w-4 h-4"/> 用户管理</button>
          <button className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${tab==="ai"?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`} onClick={()=>setTab("ai")}><Bot className="w-4 h-4"/> AI模型</button>
        </div>

        {tab === "cdk" && (
          <div className="space-y-6 animate-fade-in">
            {/* VIP CDK */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4"><Tag className="w-5 h-5 text-amber-500"/><h2 className="text-base font-semibold text-gray-800">充值VIP会员CDK</h2></div>
              <div className="flex flex-wrap gap-3 items-end">
                <div><label className="block text-xs text-gray-500 mb-1">黄金天数</label><input type="number" value={vipDays} onChange={(e)=>setVipDays(e.target.value)} min={1} max={3650} className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white/80"/></div>
                <div><label className="block text-xs text-gray-500 mb-1">生成数量</label><input type="number" value={vipCount} onChange={(e)=>setVipCount(e.target.value)} min={1} max={50} className="w-16 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white/80"/></div>
                <button onClick={handleGenVip} disabled={vipGenerating} className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20">{vipGenerating?"生成中...":"生成VIP CDK"}</button>
              </div>
              {vipMsg && (
                <div className={`mt-4 flex items-center justify-between text-sm px-4 py-3 rounded-xl border ${vipMsgOk?"bg-green-50 text-green-700 border-green-100":"bg-red-50 text-red-600 border-red-100"}`}>
                  <span>{vipMsg}</span>
                  {vipCopied && <button onClick={()=>{navigator.clipboard.writeText(vipCopied);setVipCopied("");}} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"><Copy className="w-3.5 h-3.5"/> 已复制，点击再复制</button>}
                </div>
              )}
            </div>

            {/* Token CDK */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4"><Tag className="w-5 h-5 text-blue-500"/><h2 className="text-base font-semibold text-gray-800">充值AI Token CDK</h2></div>
              <div className="flex flex-wrap gap-3 items-end">
                <div><label className="block text-xs text-gray-500 mb-1">Token额度</label><input type="number" value={tokenAmt} onChange={(e)=>setTokenAmt(e.target.value)} min={1} max={10000000} className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white/80"/></div>
                <div><label className="block text-xs text-gray-500 mb-1">生成数量</label><input type="number" value={tokenCnt} onChange={(e)=>setTokenCnt(e.target.value)} min={1} max={50} className="w-16 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white/80"/></div>
                <button onClick={handleGenToken} disabled={tokenGenerating} className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20">{tokenGenerating?"生成中...":"生成Token CDK"}</button>
              </div>
              {tokenMsg && (
                <div className={`mt-4 flex items-center justify-between text-sm px-4 py-3 rounded-xl border ${tokenMsgOk?"bg-green-50 text-green-700 border-green-100":"bg-red-50 text-red-600 border-red-100"}`}>
                  <span>{tokenMsg}</span>
                  {tokenCopied && <button onClick={()=>{navigator.clipboard.writeText(tokenCopied);setTokenCopied("");}} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"><Copy className="w-3.5 h-3.5"/> 已复制，点击再复制</button>}
                </div>
              )}
            </div>

            {/* CDK List */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">CDK 列表</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b border-gray-100"><th className="pb-2 font-medium">CDK码</th><th className="pb-2 font-medium">内容</th><th className="pb-2 font-medium">状态</th><th className="pb-2 font-medium">使用者</th><th className="pb-2 font-medium">使用时间</th><th className="pb-2 font-medium w-16">操作</th></tr></thead>
                  <tbody>
                    {cdks.map((c:Record<string,unknown>)=> {
                      const gd = c.goldDays as number || 0;
                      const ta = c.tokenAmount as number || 0;
                      const code = c.code as string;
                      const parts = [];
                      if (gd > 0) parts.push(gd + "天会员");
                      if (ta > 0) parts.push(ta.toLocaleString() + " 令牌");
                      const label = parts.join(" + ") || "-";
                      const typeColor = gd > 0 && ta === 0 ? "text-amber-600" : gd === 0 && ta > 0 ? "text-blue-600" : "text-gray-600";
                      return (<tr key={c.id as number} className="border-b border-gray-50"><td className="py-2.5 font-mono text-xs">{code}</td><td className={`py-2.5 text-xs font-medium ${typeColor}`}>{label}</td><td className="py-2.5">{c.isUsed?<span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">已用</span>:<span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">可用</span>}</td><td className="py-2.5 text-gray-500">{(c.redeemer as Record<string,unknown>)?.nickname as string||(c.redeemer as Record<string,unknown>)?.email as string||"-"}</td><td className="py-2.5 text-gray-400 text-xs">{c.usedAt?new Date(c.usedAt as string).toLocaleString("zh-CN"):"-"}</td><td className="py-2.5 flex gap-1"><button onClick={() => copyOne(code)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="复制"><Copy className="w-3.5 h-3.5"/></button><button onClick={() => deleteCdk(c.id)} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="删除"><Trash2 className="w-3.5 h-3.5"/></button></td></tr>);
                    })}
                    {cdks.length===0&&<tr><td colSpan={6} className="py-8 text-center text-gray-400">暂无CDK记录</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-6 animate-fade-in">
            <h2 className="text-base font-semibold text-gray-800 mb-4">用户列表</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b border-gray-100"><th className="pb-2 font-medium">昵称</th><th className="pb-2 font-medium">邮箱</th><th className="pb-2 font-medium">角色</th><th className="pb-2 font-medium">文件数</th><th className="pb-2 font-medium">会员到期</th><th className="pb-2 font-medium">状态</th><th className="pb-2 font-medium">操作</th></tr></thead>
                <tbody>
                  {users.map((u:Record<string,unknown>)=>{
                    const isBanned=u.banned as boolean; const isGold=u.role==="GOLD";
                    const expiry=u.goldExpiresAt?new Date(u.goldExpiresAt as string).toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"-";
                    return(<tr key={u.id as number} className="border-b border-gray-50"><td className="py-2.5"><span className={isGold?"gold-text":"text-gray-800"}>{u.nickname as string}</span>{isGold&&<span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full gold-badge text-white">GOLD</span>}</td><td className="py-2.5 text-gray-500">{u.email as string}</td><td className="py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${u.role==="ADMIN"?"bg-red-50 text-red-600":isGold?"bg-amber-50 text-amber-600":"bg-gray-100 text-gray-500"}`}>{u.role==="ADMIN"?"管理员":isGold?"黄金会员":"普通用户"}</span></td><td className="py-2.5 text-gray-500">{(u._count as Record<string,number>)?.files??0}</td><td className="py-2.5 text-xs text-gray-400">{expiry}</td><td className="py-2.5">{isBanned?<span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 flex items-center gap-1 w-fit"><Ban className="w-3 h-3"/> 已封禁</span>:<span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> 正常</span>}</td><td className="py-2.5">{u.role!=="ADMIN"&&<button onClick={()=>handleBan(u.id as number, isBanned)} className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${isBanned?"bg-green-50 text-green-600 hover:bg-green-100":"bg-red-50 text-red-600 hover:bg-red-100"}`}>{isBanned?"解封":"封禁"}</button>}</td></tr>);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "ai" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-500"/><h2 className="text-base font-semibold text-gray-800">AI 模型管理</h2></div>
              <button onClick={()=>openAiForm()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all shadow-md shadow-purple-500/20"><Plus className="w-4 h-4"/> 添加模型</button>
            </div>

            <div className="grid gap-3">
              {providers.map((p)=>(
                <div key={p.id} className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {renderAvatar(p.avatar, "w-12 h-12")}
                    <div>
                      <div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-800">{p.name}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.isActive?"bg-green-50 text-green-600":"bg-gray-100 text-gray-500"}`}>{p.isActive?"启用":"停用"}</span></div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5"><span className="font-mono">{p.model}</span><span>·</span><span className="truncate max-w-[200px]">{p.apiUrl}</span></div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{p.apiKey.substring(0,8)}...{p.apiKey.substring(p.apiKey.length-4)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>handleAiToggle(p.id, p.isActive)} className={`p-2 rounded-lg transition-colors ${p.isActive?"bg-amber-50 text-amber-600 hover:bg-amber-100":"bg-green-50 text-green-600 hover:bg-green-100"}`} title={p.isActive?"停用":"启用"}>{p.isActive?<PowerOff className="w-4 h-4"/>:<Power className="w-4 h-4"/>}</button>
                    <button onClick={()=>openAiForm(p)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><Pencil className="w-4 h-4"/></button>
                    <button onClick={()=>handleAiDelete(p.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
              {providers.length===0&&<div className="text-center py-12 text-gray-400 bg-white/60 rounded-2xl"><Bot className="w-8 h-8 mx-auto mb-2 text-gray-300"/><p className="text-sm">暂无AI模型配置</p><p className="text-xs mt-1">添加模型后用户即可选择对话</p></div>}
            </div>
          </div>
        )}
      </div>

      {showAiForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={()=>setShowAiForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center"><Bot className="w-5 h-5 text-purple-500"/></div>
              <div><h3 className="text-base font-semibold text-gray-900">{editingProvider?"编辑模型":"添加AI模型"}</h3><p className="text-xs text-gray-400">配置API接入信息</p></div>
            </div>

            <div className="space-y-3">
              {/* Avatar upload */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">模型头像</label>
                <div className="flex items-center gap-3">
                  {aiAvatar ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                      <img src={aiAvatar} className="w-full h-full object-cover" alt="" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
                      <WhaleIcon className="w-8 h-8 text-blue-500" />
                    </div>
                  )}
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={aiAvatarUploading}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {aiAvatarUploading ? <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/> 上传中</> : <><ImageUp className="w-3.5 h-3.5"/> 上传图片</>}
                    </button>
                    {aiAvatar && (
                      <button onClick={() => setAiAvatar("")} className="block mt-1 text-[10px] text-red-400 hover:text-red-600">移除头像</button>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">不上传则使用默认鲸鱼头像</p>
                  </div>
                </div>
              </div>

              <div><label className="block text-xs text-gray-500 mb-1">模型名称</label><input type="text" value={aiName} onChange={(e)=>setAiName(e.target.value)} placeholder="如: DeepSeek" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white/80"/></div>
              <div><label className="block text-xs text-gray-500 mb-1">API地址</label><input type="text" value={aiUrl} onChange={(e)=>setAiUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white/80"/></div>
              <div><label className="block text-xs text-gray-500 mb-1">API Key</label><input type="text" value={aiKey} onChange={(e)=>setAiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white/80 font-mono"/></div>
              <div><label className="block text-xs text-gray-500 mb-1">模型标识名</label><input type="text" value={aiModel} onChange={(e)=>setAiModel(e.target.value)} placeholder="gpt-4o" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white/80"/></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aiActive} onChange={(e)=>setAiActive(e.target.checked)} className="accent-purple-600"/><span className="text-xs text-gray-600">启用此模型</span></label>
            </div>
            {aiMsg && <div className={`mt-3 text-xs px-3 py-2 rounded-xl border ${aiMsgOk?"bg-green-50 text-green-600 border-green-100":"bg-red-50 text-red-500 border-red-100"}`}>{aiMsg}</div>}
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={()=>setShowAiForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">取消</button>
              <button onClick={handleAiSave} disabled={aiSaving} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 transition-all">{aiSaving?"保存中...":"保存"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin"/></div>}><AdminContent/></Suspense>;
}
